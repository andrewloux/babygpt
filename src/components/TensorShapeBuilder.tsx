import { useMemo, useState, useRef, useEffect } from 'react'
import { Slider } from './Slider'
import { VizCard } from './VizCard'
import styles from './TensorShapeBuilder.module.css'

type VectorBarsProps = {
  values: number[]
  size?: 'mini' | 'big'
  ariaLabel?: string
}

function VectorBars({ values, size = 'big', ariaLabel }: VectorBarsProps) {
  const containerClass = size === 'mini' ? styles.vectorBars : styles.vectorBarsBig
  const maxAbs = Math.max(1e-6, ...values.map((v) => Math.abs(v)))

  return (
    <div className={containerClass} role="img" aria-label={ariaLabel}>
      {values.map((v, i) => {
        const magnitude = Math.min(1, Math.abs(v) / maxAbs)
        const heightPct = magnitude * 50
        const top = v >= 0 ? `calc(50% - ${heightPct}%)` : '50%'

        return (
          <div key={i} className={styles.coordWrap} title={`d${i}: ${v.toFixed(2)}`}>
            <div
              className={`${styles.coordBar} ${v >= 0 ? styles.coordBarPos : styles.coordBarNeg}`}
              style={{ top, height: `${heightPct}%` }}
            />
          </div>
        )
      })}
    </div>
  )
}

const VOCAB = [
  ' ',
  'a',
  'b',
  'c',
  'd',
  'e',
  'f',
  'g',
  'h',
  'i',
  'j',
  'k',
  'l',
  'm',
  'n',
  'o',
  'p',
  'q',
  'r',
  's',
  't',
  'u',
  'v',
  'w',
  'x',
  'y',
  'z',
]

const SAMPLE_TEXT = normalizeToVocab(`the cat sat on the mat
the quick brown fox jumps over the lazy dog
it is a truth universally acknowledged`)

function prettyChar(c: string): string {
  return c === ' ' ? '␣' : c
}

function makeVocabIndex(vocab: string[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (let i = 0; i < vocab.length; i++) out[vocab[i]] = i
  return out
}

function normalizeToVocab(text: string): string {
  const lower = text.toLowerCase()
  let out = ''
  let lastWasSpace = true

  for (const ch of lower) {
    const isLetter = ch >= 'a' && ch <= 'z'
    if (isLetter) {
      out += ch
      lastWasSpace = false
      continue
    }

    if (!lastWasSpace) {
      out += ' '
      lastWasSpace = true
    }
  }

  return out.trim()
}

function mulberry32(seed: number) {
  return function random() {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n))
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

/** Hook to animate between arrays of numbers */
function useAnimatedValues(targetValues: number[], duration: number = 300): number[] {
  const [animatedValues, setAnimatedValues] = useState<number[]>(targetValues)
  const prevValuesRef = useRef<number[]>(targetValues)
  const animationRef = useRef<number | null>(null)
  const startTimeRef = useRef<number | null>(null)

  useEffect(() => {
    const prevValues = prevValuesRef.current
    const newValues = targetValues

    // Cancel any ongoing animation
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current)
    }

    // If lengths differ, we need special handling
    const maxLen = Math.max(prevValues.length, newValues.length)
    const paddedPrev = [...prevValues]
    const paddedNew = [...newValues]

    // Pad shorter array with zeros (for fade in/out effect)
    while (paddedPrev.length < maxLen) paddedPrev.push(0)
    while (paddedNew.length < maxLen) paddedNew.push(0)

    startTimeRef.current = null

    const animate = (timestamp: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp
      }

      const elapsed = timestamp - startTimeRef.current
      const progress = Math.min(elapsed / duration, 1)
      const easedProgress = easeOutCubic(progress)

      const interpolated = paddedNew.map((newVal, i) =>
        lerp(paddedPrev[i], newVal, easedProgress)
      )

      // Trim to target length once animation is complete
      if (progress >= 1) {
        setAnimatedValues(newValues)
        prevValuesRef.current = newValues
      } else {
        setAnimatedValues(interpolated.slice(0, newValues.length))
        animationRef.current = requestAnimationFrame(animate)
      }
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [targetValues, duration])

  // Update ref when target changes (for next animation start point)
  useEffect(() => {
    return () => {
      prevValuesRef.current = animatedValues
    }
  }, [animatedValues])

  return animatedValues
}

function embedValue(tokenId: number, dim: number) {
  // Deterministic “fake embedding”: stable per (tokenId, dim).
  // Range is roughly [-1, 1].
  const a = Math.sin((tokenId + 1) * 1337 + (dim + 1) * 97)
  const b = Math.sin((tokenId + 1) * 31 + (dim + 1) * 211)
  return clamp((a + b) * 0.5, -1, 1)
}

export function TensorShapeBuilder() {
  const [batchSize, setBatchSize] = useState(3)
  const [timeSteps, setTimeSteps] = useState(6)
  const [embedDim, setEmbedDim] = useState(8)
  const [seed, setSeed] = useState(1)
  const [focus, setFocus] = useState({ b: 0, t: 0 })

  const vocabIndex = useMemo(() => makeVocabIndex(VOCAB), [])

  const { chars, ids } = useMemo(() => {
    const rng = mulberry32(seed)
    const text = SAMPLE_TEXT
    const B = batchSize
    const T = timeSteps
    const outChars: string[][] = []
    const outIds: number[][] = []

    for (let b = 0; b < B; b++) {
      const start = Math.floor(rng() * Math.max(1, text.length - T))
      const slice = text.slice(start, start + T).padEnd(T, ' ')
      const rowChars = [...slice]
      const rowIds = rowChars.map(ch => vocabIndex[ch] ?? 0)
      outChars.push(rowChars)
      outIds.push(rowIds)
    }

    return { chars: outChars, ids: outIds }
  }, [batchSize, timeSteps, seed, vocabIndex])

  const focusB = clamp(focus.b, 0, batchSize - 1)
  const focusT = clamp(focus.t, 0, timeSteps - 1)
  const focusId = ids[focusB]?.[focusT] ?? 0
  const focusChar = VOCAB[focusId] ?? ' '
  const focusVec = useMemo(
    () => Array.from({ length: embedDim }, (_, i) => embedValue(focusId, i)),
    [focusId, embedDim],
  )

  // Animate values for smooth morphing when selection or D changes
  const animatedVec = useAnimatedValues(focusVec, 240)

  const sameTokenCount = useMemo(() => {
    let n = 0
    for (const row of ids) {
      for (const id of row) if (id === focusId) n++
    }
    return n
  }, [focusId, ids])

  const isSameToken = (b: number, t: number) => ids[b]?.[t] === focusId

  return (
    <VizCard
      title="Embedding Lookup: Shapes"
      subtitle="Click an ID. It selects one row from E. That row becomes a D‑vector in X_emb."
    >
      <div className={styles.container}>
        <div className={`${styles.controls} panel-dark inset-box`}>
        <div className={styles.shapeMini} aria-label="Shape summary">
          <span className={styles.shapeToken}>X</span>
          <span className={styles.shapeBrackets}>
            [{batchSize}, {timeSteps}]
          </span>
          <span className={styles.shapeArrow} aria-hidden="true">
            →
          </span>
          <span className={styles.shapeToken}>X_emb</span>
          <span className={styles.shapeBrackets}>
            [{batchSize}, {timeSteps}, {embedDim}]
          </span>
        </div>
        <label className={styles.control}>
          <span className={styles.controlLabel}>B (batch)</span>
          <span className={styles.controlHint}>how many sequences</span>
          <Slider
            wrap={false}
            min={1}
            max={5}
            step={1}
            value={batchSize}
            onValueChange={(v) => {
              const next = Math.round(v)
              setBatchSize(next)
              setFocus((f) => ({ ...f, b: clamp(f.b, 0, next - 1) }))
            }}
            ariaLabel="Batch size"
          />
          <span className={styles.controlValue}>{batchSize}</span>
        </label>

        <label className={styles.control}>
          <span className={styles.controlLabel}>T (positions)</span>
          <span className={styles.controlHint}>tokens per sequence</span>
          <Slider
            wrap={false}
            min={2}
            max={8}
            step={1}
            value={timeSteps}
            onValueChange={(v) => {
              const next = Math.round(v)
              setTimeSteps(next)
              setFocus((f) => ({ ...f, t: clamp(f.t, 0, next - 1) }))
            }}
            ariaLabel="Time steps"
          />
          <span className={styles.controlValue}>{timeSteps}</span>
        </label>

        <label className={styles.control}>
          <span className={styles.controlLabel}>D (features)</span>
          <span className={styles.controlHint}>numbers per token</span>
          <Slider
            wrap={false}
            min={4}
            max={16}
            step={1}
            value={embedDim}
            onValueChange={(v) => setEmbedDim(Math.round(v))}
            ariaLabel="Embedding dimension"
          />
          <span className={styles.controlValue}>{embedDim}</span>
        </label>

        <button
          type="button"
          className={`${styles.reshuffleBtn} hover-lift focus-glow`}
          onClick={() => setSeed((s) => s + 1)}
        >
          new batch
        </button>
      </div>

      <div className={styles.stage}>
        <div className={`${styles.card} panel-dark inset-box`}>
          <div className={styles.cardTitle}>
            <span className={styles.cardKicker}>1</span> IDs <span className={styles.cardShape}>X[b, t]</span>
          </div>
          <div
            className={styles.grid}
            style={{ gridTemplateColumns: `repeat(${timeSteps}, minmax(0, 1fr))` }}
            aria-label="Input ID grid"
          >
            {ids.map((row, b) =>
              row.map((id, t) => {
                const active = b === focusB && t === focusT
                const same = isSameToken(b, t)
                return (
                  <button
                    key={`${b}-${t}`}
                    type="button"
                    className={`${styles.cell} hover-lift focus-glow ${active ? styles.active : ''} ${same ? styles.same : ''}`}
                    onClick={() => setFocus({ b, t })}
                    aria-label={`X[${b}, ${t}] = ${id} (${prettyChar(chars[b][t])})`}
                  >
                    <span className={styles.cellChar}>{prettyChar(chars[b][t])}</span>
                    <span className={styles.cellId}>{id}</span>
                  </button>
                )
              }),
            )}
          </div>
          <div className={styles.axisHint}>
            <span className={styles.axisTag}>B</span> goes down. <span className={styles.axisTag}>T</span> (position) goes right.
          </div>
        </div>

        <div className={`${styles.card} panel-dark inset-box`}>
          <div className={styles.cardTitle}>
            <span className={styles.cardKicker}>2</span> table row <span className={styles.cardShape}>E[ix, :]</span>
          </div>
          <div className={styles.selection}>
            <div className={styles.selectionRow}>
              <span className={styles.selectionKey}>Index</span>
              <span className={styles.selectionVal}>
                [b={focusB}, t={focusT}]
              </span>
            </div>
            <div className={styles.selectionRow}>
              <span className={styles.selectionKey}>ix</span>
              <span className={styles.selectionVal}>
                {focusId} <span className={styles.selectionChar}>({prettyChar(focusChar)})</span>
              </span>
            </div>
            <div className={styles.formula} aria-label="Lookup formula">
              ix = X[{focusB}, {focusT}]
            </div>
            <div className={styles.selectionHint}>That ID selects one row from the embedding table.</div>
          </div>

          <div className={styles.embedTable} aria-label="Embedding table (rows)">
            <div className={styles.embedHeader}>
              <span className={styles.embedTitle}>Embedding table</span>
              <span className={styles.embedMeta}>
                E has <span className={styles.axisTag}>V={VOCAB.length}</span> rows · each row has <span className={styles.axisTag}>D</span> numbers
              </span>
            </div>
            <div
              className={styles.embedGrid}
              style={{ gridTemplateColumns: 'repeat(9, minmax(0, 1fr))' }}
              aria-label="Rows indexed by ID"
            >
              {VOCAB.map((ch, id) => (
                <div
                  key={id}
                  className={`${styles.embedChip} ${id === focusId ? styles.embedChipActive : ''}`}
                  aria-label={`E[${id}, :] for ${prettyChar(ch)}`}
                >
                  <span className={styles.embedChipChar}>{prettyChar(ch)}</span>
                  <span className={styles.embedChipId}>{id}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.detailNote}>
            Same ID shows up <strong>{sameTokenCount}</strong> time{sameTokenCount === 1 ? '' : 's'} in X — all of those cells reuse the same row <code>E[{focusId}]</code>.
          </div>
        </div>

        <div className={`${styles.card} panel-dark inset-box`}>
          <div className={styles.cardTitle}>
            <span className={styles.cardKicker}>3</span> output cell <span className={styles.cardShape}>X_emb[b, t, :]</span>
          </div>
          <div className={styles.selection}>
            <div className={styles.selectionRow}>
              <span className={styles.selectionKey}>Write into</span>
              <span className={styles.selectionVal}>
                X_emb[{focusB}, {focusT}, :]
              </span>
            </div>
            <div className={styles.formula} aria-label="Write formula">
              X_emb[{focusB}, {focusT}, :] = E[{focusId}, :]
            </div>
            <div className={styles.selectionHint}>
              The new last axis is <span className={styles.axisTag}>D</span>: the length of this vector.
            </div>
          </div>

          <div className={styles.vectorInline} aria-label="Selected embedding vector">
            <VectorBars values={animatedVec} size="big" ariaLabel="Embedding vector with D coordinates" />
            <div className={styles.vectorHint}>
              That’s <span className={styles.axisTag}>D</span> numbers (magenta &gt; 0, cyan &lt; 0). You don’t interpret them one‑by‑one — you feed them into matrix multiplies.
            </div>
            <details className={`collapsible ${styles.vectorDetails}`}>
              <summary>Show the numeric values</summary>
              <div className={styles.valueGrid}>
                {animatedVec.map((v, i) => (
                  <div key={i} className={`${styles.valueChip} ${v >= 0 ? styles.valueChipPos : styles.valueChipNeg}`}>
                    d{i}: {v.toFixed(2)}
                  </div>
                ))}
              </div>
            </details>
          </div>
        </div>
      </div>

      <details className={`collapsible ${styles.fullTensor}`}>
        <summary>Show the full tensor X_emb[b, t, :]</summary>
        <div
          className={styles.grid}
          style={{ gridTemplateColumns: `repeat(${timeSteps}, minmax(0, 1fr))` }}
          aria-label="Embedding tensor grid"
        >
          {ids.map((row, b) =>
            row.map((id, t) => {
              const active = b === focusB && t === focusT
              const same = isSameToken(b, t)
              const vec = Array.from({ length: embedDim }, (_, i) => embedValue(id, i))
              return (
                <button
                  key={`${b}-${t}`}
                  type="button"
                  className={`${styles.cell} ${styles.embCell} hover-lift focus-glow ${active ? styles.active : ''} ${same ? styles.same : ''}`}
                  onClick={() => setFocus({ b, t })}
                  aria-label={`X_emb[${b}, ${t}, :] for token ${id}`}
                >
                  <VectorBars values={vec} size="mini" ariaLabel={`Vector for ${prettyChar(VOCAB[id] ?? ' ')}`} />
                  <div className={styles.embBadge}>{prettyChar(VOCAB[id] ?? ' ')}</div>
                </button>
              )
            }),
          )}
        </div>
        <div className={styles.axisHint}>
          Each cell contains <span className={styles.axisTag}>D</span> numbers. Most of the time, you never look at them directly — you just
          multiply them by things.
        </div>
      </details>
      </div>
    </VizCard>
  )
}
