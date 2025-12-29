import { useMemo, useState, useRef, useEffect, useId } from 'react'
import { Slider } from './Slider'
import { VizCard } from './VizCard'
import styles from './TensorShapeBuilder.module.css'

type VectorBarsProps = {
  values: number[]
  size?: 'mini' | 'big'
  ariaLabel?: string
}

type ScrollyStep = {
  label: string
  title: string
  body: React.ReactNode
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

function getScrollBehavior(): ScrollBehavior {
  if (typeof window === 'undefined') return 'auto'
  if (!window.matchMedia) return 'auto'
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
}

export function TensorShapeBuilder() {
  const [batchSize, setBatchSize] = useState(3)
  const [timeSteps, setTimeSteps] = useState(6)
  const [embedDim, setEmbedDim] = useState(8)
  const [seed, setSeed] = useState(1)
  const [focus, setFocus] = useState({ b: 0, t: 0 })

  const stepperId = useId()
  const [activeStep, setActiveStep] = useState(0)
  const stepRefs = useRef<Array<HTMLElement | null>>([])
  const [pulsePanel, setPulsePanel] = useState<'ids' | 'row' | 'out' | null>(null)
  const pulseTimerRef = useRef<number | null>(null)

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

  const activePanel = activeStep === 0 ? 'ids' : activeStep === 1 ? 'row' : 'out'

  const scrollySteps: ScrollyStep[] = useMemo(() => {
    return [
      {
        label: 'IDs',
        title: 'A table of integers',
        body: (
          <>
            <p className={styles.storyText}>
              This is <code>X</code>, shaped <code>[B, T]</code>. Each cell holds one integer ID.
            </p>
            <p className={styles.storyText}>
              Click any cell. You’re picking a <em>position</em> in the batch, not a character in the alphabet.
            </p>
            <div className={`${styles.storyChip} inset-box`} aria-label="Current selection">
              <div className={styles.storyChipLabel}>Selected</div>
              <div className={styles.storyChipValue}>
                <code>
                  X[{focusB}, {focusT}] = {focusId}
                </code>{' '}
                <span className={styles.storyChipMeta}>({prettyChar(focusChar)})</span>
              </div>
            </div>
          </>
        ),
      },
      {
        label: 'Row',
        title: 'That ID selects a row',
        body: (
          <>
            <p className={styles.storyText}>
              The embedding table <code>E</code> has shape <code>[V, D]</code>. Your ID is just a row number.
            </p>
            <p className={styles.storyText}>
              If the same ID appears 5 times in <code>X</code>, it reuses the same row 5 times. One row, many sightings.
            </p>
            <div className={`${styles.storyChip} inset-box`} aria-label="Row reuse">
              <div className={styles.storyChipLabel}>Reuse</div>
              <div className={styles.storyChipValue}>
                <code>E[{focusId}, :]</code>{' '}
                <span className={styles.storyChipMeta}>
                  appears {sameTokenCount} time{sameTokenCount === 1 ? '' : 's'} in X
                </span>
              </div>
            </div>
          </>
        ),
      },
      {
        label: 'Vector',
        title: 'A new axis appears',
        body: (
          <>
            <p className={styles.storyText}>
              After lookup, each ID becomes a length‑<code>D</code> vector. The tensor grows a new last axis.
            </p>
            <p className={styles.storyText}>It’s literally “write this row here”:</p>
            <div className={`${styles.storyChip} inset-box`} aria-label="Write rule">
              <div className={styles.storyChipLabel}>Write</div>
              <div className={styles.storyChipValue}>
                <code>
                  X_emb[{focusB}, {focusT}, :] = E[{focusId}, :]
                </code>
              </div>
            </div>
          </>
        ),
      },
    ]
  }, [focusB, focusT, focusId, focusChar, sameTokenCount])

  useEffect(() => {
    const targets = stepRefs.current.filter(Boolean) as HTMLElement[]
    if (targets.length === 0) return
    if (typeof IntersectionObserver === 'undefined') return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting)
        if (visible.length === 0) return
        visible.sort((a, b) => (b.intersectionRatio ?? 0) - (a.intersectionRatio ?? 0))
        const idx = Number((visible[0].target as HTMLElement).dataset.step)
        if (!Number.isNaN(idx)) setActiveStep(idx)
      },
      {
        threshold: [0.2, 0.35, 0.5, 0.75],
        rootMargin: '-25% 0px -55% 0px',
      },
    )

    targets.forEach((t) => observer.observe(t))
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const nextPanel: typeof pulsePanel = activeStep === 0 ? 'ids' : activeStep === 1 ? 'row' : 'out'
    setPulsePanel(nextPanel)
    if (pulseTimerRef.current !== null) window.clearTimeout(pulseTimerRef.current)
    pulseTimerRef.current = window.setTimeout(() => setPulsePanel(null), 950)

    return () => {
      if (pulseTimerRef.current !== null) window.clearTimeout(pulseTimerRef.current)
    }
  }, [activeStep])

  const isSameToken = (b: number, t: number) => ids[b]?.[t] === focusId

  return (
    <VizCard
      title="Embedding Lookup: Shapes"
      subtitle="Click an ID. It selects one row from E. That row becomes a D‑vector in X_emb."
    >
      <div className={styles.container}>
        <div className={styles.topBar}>
          <div className={styles.shapeSummary} aria-label="Shape summary">
            <div className={styles.shapeLine}>
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
            <div className={styles.badgeRow} aria-hidden="true">
              <span className={styles.badge}>
                B=<span className={styles.badgeVal}>{batchSize}</span>
              </span>
              <span className={styles.badge}>
                T=<span className={styles.badgeVal}>{timeSteps}</span>
              </span>
              <span className={styles.badge}>
                D=<span className={styles.badgeVal}>{embedDim}</span>
              </span>
            </div>
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
          <div className={styles.story} aria-label="Embedding lookup story">
            <div className={styles.stepper} aria-label="Story steps">
              {scrollySteps.map((s, i) => {
                const isActive = i === activeStep
                return (
                  <button
                    key={s.label}
                    type="button"
                    className={`${styles.stepBtn} ${isActive ? styles.stepBtnActive : ''}`}
                    onClick={() => {
                      setActiveStep(i)
                      const el = stepRefs.current[i]
                      if (!el) return
                      el.scrollIntoView({ behavior: getScrollBehavior(), block: 'start' })
                    }}
                    aria-current={isActive ? 'step' : undefined}
                    aria-controls={`${stepperId}-step-${i}`}
                  >
                    <span className={styles.stepDot} aria-hidden="true" />
                    <span className={styles.stepLabel}>{s.label}</span>
                  </button>
                )
              })}
            </div>

            {scrollySteps.map((s, i) => {
              const isActive = i === activeStep
              return (
                <section
                  key={s.label}
                  id={`${stepperId}-step-${i}`}
                  ref={(el) => {
                    stepRefs.current[i] = el
                  }}
                  className={`${styles.storyStep} ${isActive ? styles.storyStepActive : ''}`}
                  data-step={i}
                  aria-labelledby={`${stepperId}-title-${i}`}
                >
                  <div className={styles.storyHeader}>
                    <div className={styles.storyKicker}>
                      Step {i + 1} / {scrollySteps.length}
                    </div>
                    <h4 id={`${stepperId}-title-${i}`} className={styles.storyTitle}>
                      {s.title}
                    </h4>
                  </div>
                  <div className={styles.storyBody}>{s.body}</div>
                </section>
              )
            })}

            <details className={`collapsible ${styles.knobs}`}>
              <summary>Tweak B, T, D</summary>
              <div className={styles.knobGrid}>
                <label className={styles.knob}>
                  <span className={styles.knobLabel}>B (batch)</span>
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
                  <span className={styles.knobValue}>{batchSize}</span>
                </label>

                <label className={styles.knob}>
                  <span className={styles.knobLabel}>T (positions)</span>
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
                  <span className={styles.knobValue}>{timeSteps}</span>
                </label>

                <label className={styles.knob}>
                  <span className={styles.knobLabel}>D (features)</span>
                  <Slider
                    wrap={false}
                    min={4}
                    max={16}
                    step={1}
                    value={embedDim}
                    onValueChange={(v) => setEmbedDim(Math.round(v))}
                    ariaLabel="Embedding dimension"
                  />
                  <span className={styles.knobValue}>{embedDim}</span>
                </label>
              </div>
            </details>
          </div>

          <div className={styles.figure} aria-label="Embedding lookup figure">
            <div className={`${styles.figureSticky} panel-dark`}>
              <div className={styles.figureHeader}>
                <div className={styles.figureEyebrow}>Scroll the steps. Click the grid.</div>
                <div className={styles.figureMeta} aria-label="Current selection">
                  <div className={styles.metaItem}>
                    <span className={styles.metaKey}>ix</span>
                    <span className={styles.metaVal}>
                      {focusId} <span className={styles.metaChar}>({prettyChar(focusChar)})</span>
                    </span>
                  </div>
                  <div className={styles.metaItem}>
                    <span className={styles.metaKey}>cell</span>
                    <span className={styles.metaVal}>
                      X[{focusB}, {focusT}]
                    </span>
                  </div>
                </div>
              </div>

      <div className={styles.stage}>
        <div
          className={`focus-pulse ${pulsePanel === 'ids' ? 'focus-pulse--active' : ''} ${styles.card} ${activePanel === 'ids' ? styles.cardActive : styles.cardMuted} panel-dark inset-box`}
          style={
            {
              '--focus-pulse-color': 'color-mix(in oklab, var(--accent-cyan) 28%, transparent)',
            } as React.CSSProperties
          }
        >
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

        <div
          className={`focus-pulse ${pulsePanel === 'row' ? 'focus-pulse--active' : ''} ${styles.card} ${activePanel === 'row' ? styles.cardActive : styles.cardMuted} panel-dark inset-box`}
          style={
            {
              '--focus-pulse-color': 'color-mix(in oklab, var(--accent-magenta) 28%, transparent)',
            } as React.CSSProperties
          }
        >
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

        <div
          className={`focus-pulse ${pulsePanel === 'out' ? 'focus-pulse--active' : ''} ${styles.card} ${activePanel === 'out' ? styles.cardActive : styles.cardMuted} panel-dark inset-box`}
          style={
            {
              '--focus-pulse-color': 'color-mix(in oklab, var(--accent-yellow) 28%, transparent)',
            } as React.CSSProperties
          }
        >
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
