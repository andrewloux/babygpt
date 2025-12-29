import { useMemo, useState, useRef, useEffect } from 'react'
import { VizCard } from './VizCard'
import { MathInline } from './MathInline'
import styles from './TensorShapeBuilder.module.css'

type VectorHeatmapProps = {
  values: number[]
  size?: 'mini' | 'big'
  ariaLabel?: string
}

function VectorHeatmap({ values, size = 'big', ariaLabel }: VectorHeatmapProps) {
  const containerClass = size === 'mini' ? styles.heatmapRowMini : styles.heatmapRow
  const maxAbs = Math.max(1e-6, ...values.map((v) => Math.abs(v)))

  return (
    <div className={containerClass} role="img" aria-label={ariaLabel}>
      {values.map((v, i) => {
        const intensity = Math.abs(v) / maxAbs
        const hue = v >= 0 ? 340 : 190  // magenta vs cyan
        const bg = `hsla(${hue}, 80%, 50%, ${0.2 + intensity * 0.8})`

        return (
          <div
            key={i}
            className={styles.heatmapCell}
            style={{ background: bg }}
            data-label={`d${i}: ${v.toFixed(2)}`}
          />
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

  const [activeStep, setActiveStep] = useState(1)

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
      subtitle={<>Click an ID. It selects one row from <MathInline equation="E" />. That row becomes a <MathInline equation="D" />-vector in <MathInline equation="X_{\text{emb}}" />.</>}
    >
      <div className={styles.container}>
        <div className={styles.topBar}>
          <div className={styles.formulaBlock}>
            <div className={styles.formulaLine}>
              <span className={styles.formulaStatic}>X [</span>
              <button
                type="button"
                className={styles.formulaNum}
                onClick={(e) => {
                  const delta = e.shiftKey ? -1 : 1
                  const next = clamp(batchSize + delta, 1, 5)
                  setBatchSize(next)
                  setFocus((f) => ({ ...f, b: clamp(f.b, 0, next - 1) }))
                }}
              >
                {batchSize}
              </button>
              <span className={styles.formulaStatic}>, </span>
              <button
                type="button"
                className={styles.formulaNum}
                onClick={(e) => {
                  const delta = e.shiftKey ? -1 : 1
                  const next = clamp(timeSteps + delta, 2, 8)
                  setTimeSteps(next)
                  setFocus((f) => ({ ...f, t: clamp(f.t, 0, next - 1) }))
                }}
              >
                {timeSteps}
              </button>
              <span className={styles.formulaStatic}>]</span>

              <span className={styles.formulaArrow}>→</span>

              <span className={styles.formulaStatic}>X</span>
              <sub className={styles.formulaSub}>emb</sub>
              <span className={styles.formulaStatic}> [</span>
              <button
                type="button"
                className={styles.formulaNum}
                onClick={(e) => {
                  const delta = e.shiftKey ? -1 : 1
                  const next = clamp(batchSize + delta, 1, 5)
                  setBatchSize(next)
                  setFocus((f) => ({ ...f, b: clamp(f.b, 0, next - 1) }))
                }}
              >
                {batchSize}
              </button>
              <span className={styles.formulaStatic}>, </span>
              <button
                type="button"
                className={styles.formulaNum}
                onClick={(e) => {
                  const delta = e.shiftKey ? -1 : 1
                  const next = clamp(timeSteps + delta, 2, 8)
                  setTimeSteps(next)
                  setFocus((f) => ({ ...f, t: clamp(f.t, 0, next - 1) }))
                }}
              >
                {timeSteps}
              </button>
              <span className={styles.formulaStatic}>, </span>
              <button
                type="button"
                className={styles.formulaNum}
                onClick={(e) => {
                  const delta = e.shiftKey ? -1 : 1
                  setEmbedDim(clamp(embedDim + delta, 4, 16))
                }}
              >
                {embedDim}
              </button>
              <span className={styles.formulaStatic}>]</span>
            </div>
            <div className={styles.formulaHint}>click numbers to adjust · shift reverses</div>
          </div>

          <button
            type="button"
            className={`${styles.reshuffleBtn} hover-lift focus-glow`}
            onClick={() => setSeed((s) => s + 1)}
          >
            reshuffle
          </button>
        </div>

        <div className={styles.scrolly}>
          {/* IDs Section - Always visible */}
          <section className={styles.idsSection}>
            <div className={styles.idsSectionTitle}>
              <span className={styles.cardKicker} style={{ background: 'var(--accent-cyan)', color: '#000' }}>1</span>
              Input IDs <span className={styles.cardShape}><MathInline equation="X[B, T]" /></span>
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
            <div className={styles.selectionBadge}>
              Selected: <MathInline equation={`X[${focusB}, ${focusT}] = ${focusId}`} />
              <span className={styles.char}>({prettyChar(focusChar)})</span>
            </div>
          </section>

          <hr className={styles.divider} />

          {/* Stepper: Row / Vector */}
          <div className={styles.stepper} aria-label="Step toggle">
            <button
              type="button"
              className={`${styles.stepBtn} ${activeStep === 1 ? styles.stepBtnActive : ''}`}
              onClick={() => setActiveStep(1)}
            >
              Row Lookup
            </button>
            <button
              type="button"
              className={`${styles.stepBtn} ${activeStep === 2 ? styles.stepBtnActive : ''}`}
              onClick={() => setActiveStep(2)}
            >
              Output Vector
            </button>
          </div>

          {/* Stage: Show one card at a time */}
          <div className={styles.stage}>
            {activeStep === 1 && (
              <div className={`${styles.card} ${styles.cardRow} ${styles.cardActive} panel-dark inset-box`}>
                <div className={styles.cardTitle}>
                  <span className={styles.cardKicker}>2</span> Table Row <span className={styles.cardShape}><MathInline equation="E[ix, :]" /></span>
                </div>
                <div className={styles.formula} aria-label="Lookup formula">
                  <MathInline equation={`ix = X[${focusB}, ${focusT}] = ${focusId}`} />
                </div>
                <div className={styles.embedTable} aria-label="Embedding table (rows)">
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
                  <MathInline equation={`E[${focusId}, :]`} /> used <strong>{sameTokenCount}×</strong> in X
                </div>
              </div>
            )}

            {activeStep === 2 && (
              <div className={`${styles.card} ${styles.cardVector} ${styles.cardActive} panel-dark inset-box`}>
                <div className={styles.cardTitle}>
                  <span className={styles.cardKicker}>3</span> Output Vector <span className={styles.cardShape}><MathInline equation="X_{\text{emb}}[b, t, :]" /></span>
                </div>
                <div className={styles.formula} aria-label="Write formula">
                  <MathInline equation={`X_{\\text{emb}}[${focusB}, ${focusT}, :] = E[${focusId}, :]`} />
                </div>
                <div className={styles.vectorInline} aria-label="Selected embedding vector">
                  <VectorHeatmap values={animatedVec} size="big" ariaLabel="Embedding vector with D coordinates" />
                </div>
              </div>
            )}
          </div>

          {/* Story text */}
          <div className={styles.storySection}>
            {activeStep === 1 && (
              <p className={styles.storyText}>
                <MathInline equation="E" /> has shape <MathInline equation="[V, D]" />. Your ID is just a row number. Same ID = same row reused.
              </p>
            )}
            {activeStep === 2 && (
              <p className={styles.storyText}>
                Each ID becomes a length-<MathInline equation="D" /> vector. The tensor gains a third axis.
              </p>
            )}
          </div>
        </div>
      </div>
    </VizCard>
  )
}
