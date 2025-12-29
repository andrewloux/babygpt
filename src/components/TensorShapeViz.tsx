import { ReactNode, useEffect, useId, useMemo, useRef, useState } from 'react'
import { Slider } from './Slider'
import styles from './TensorShapeViz.module.css'
import { VizCard } from './VizCard'

type ScrollyStep = {
  label: string
  title: string
  body: ReactNode
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

function prettyChar(c: string): string {
  return c === ' ' ? '␣' : c
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n))
}

function embedValue(tokenId: number, dim: number) {
  const a = Math.sin((tokenId + 1) * 1337 + (dim + 1) * 97)
  const b = Math.sin((tokenId + 1) * 31 + (dim + 1) * 211)
  return clamp((a + b) * 0.5, -1, 1)
}

function wOutValue(dim: number, tokenId: number) {
  const a = Math.sin((dim + 1) * 17 + (tokenId + 1) * 101)
  const b = Math.sin((dim + 1) * 73 + (tokenId + 1) * 29)
  return clamp((a + b) * 0.5, -1, 1)
}

function biasValue(tokenId: number) {
  return Math.sin((tokenId + 1) * 9) * 0.08
}

function softmax(logits: number[]): number[] {
  const max = Math.max(...logits)
  const exps = logits.map((v) => Math.exp(v - max))
  const sum = exps.reduce((acc, v) => acc + v, 0) || 1
  return exps.map((v) => v / sum)
}

function getScrollBehavior(): ScrollBehavior {
  if (typeof window === 'undefined') return 'auto'
  if (!window.matchMedia) return 'auto'
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
}

type MiniBarRow = { label: string; value: number }

function pickTopRows(values: number[], n: number): MiniBarRow[] {
  return values
    .map((v, i) => ({ i, v }))
    .sort((a, b) => b.v - a.v)
    .slice(0, n)
    .map(({ i, v }) => ({ label: prettyChar(VOCAB[i] ?? '?'), value: v }))
}

type VectorBarsProps = {
  values: number[]
  count?: number
  ariaLabel?: string
}

function VectorBars({ values, count = 18, ariaLabel }: VectorBarsProps) {
  const slice = values.slice(0, count)
  const maxAbs = Math.max(1e-6, ...slice.map((v) => Math.abs(v)))

  return (
    <div className={styles.vectorBars} role="img" aria-label={ariaLabel}>
      {slice.map((v, i) => {
        const magnitude = Math.min(1, Math.abs(v) / maxAbs)
        const heightPct = magnitude * 50
        const top = v >= 0 ? `calc(50% - ${heightPct}%)` : '50%'
        return (
          <div key={i} className={styles.vectorBarWrap} title={`d${i}: ${v.toFixed(2)}`}>
            <div
              className={`${styles.vectorBar} ${v >= 0 ? styles.vectorBarPos : styles.vectorBarNeg}`}
              style={{ top, height: `${heightPct}%` }}
            />
          </div>
        )
      })}
    </div>
  )
}

function MiniBars({ rows, kind }: { rows: MiniBarRow[]; kind: 'logits' | 'probs' }) {
  const max = Math.max(1e-9, ...rows.map((r) => (kind === 'probs' ? r.value : Math.abs(r.value))))
  return (
    <div className={styles.miniBars} aria-label={kind === 'probs' ? 'Top probabilities' : 'Top logits'}>
      {rows.map((r) => {
        const value = kind === 'probs' ? r.value : Math.abs(r.value)
        const widthPct = clamp((value / max) * 100, 0, 100)
        return (
          <div key={r.label} className={styles.miniBarRow}>
            <span className={styles.miniBarLabel}>{r.label}</span>
            <span className={styles.miniBarTrack} aria-hidden="true">
              <span className={`${styles.miniBarFill} ${kind === 'probs' ? styles.miniBarFillProbs : styles.miniBarFillLogits}`} style={{ width: `${widthPct}%` }} />
            </span>
            <span className={styles.miniBarValue}>
              {kind === 'probs' ? `${(r.value * 100).toFixed(1)}%` : r.value.toFixed(2)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export function TensorShapeViz() {
  const vocabSize = VOCAB.length
  const embedDim = 64

  const [tokenId, setTokenId] = useState(5)
  const tokenChar = VOCAB[tokenId] ?? '?'

  const oneHot = useMemo(() => {
    const out = Array.from({ length: vocabSize }, (_, i) => (i === tokenId ? 1 : 0))
    return out
  }, [tokenId, vocabSize])

  const embedding = useMemo(() => {
    return Array.from({ length: embedDim }, (_, d) => embedValue(tokenId, d))
  }, [tokenId, embedDim])

  const logits = useMemo(() => {
    const scale = 1 / Math.sqrt(embedDim)
    return Array.from({ length: vocabSize }, (_, j) => {
      let sum = 0
      for (let d = 0; d < embedDim; d++) sum += embedding[d] * wOutValue(d, j)
      return sum * scale + biasValue(j)
    })
  }, [embedding, embedDim, vocabSize])

  const probs = useMemo(() => softmax(logits), [logits])

  const topLogits = useMemo(() => pickTopRows(logits, 6), [logits])
  const topProbs = useMemo(() => pickTopRows(probs, 6), [probs])

  const [activeStep, setActiveStep] = useState(0)
  const stepRefs = useRef<Array<HTMLElement | null>>([])
  const stepperId = useId()

  const steps: ScrollyStep[] = useMemo(() => {
    const tokenLabel = `${tokenId} (${prettyChar(String(tokenChar))})`
    return [
      {
        label: 'ID',
        title: 'Start: a token ID is just a label',
        body: (
          <>
            <p className={styles.storyText}>
              The model receives a token as an <em>integer index</em>. That number has no geometry on its own — it’s just “row {tokenId}”.
            </p>
            <div className={`${styles.storyChip} inset-box`} aria-label="Token ID chip">
              <div className={styles.storyChipLabel}>x</div>
              <div className={styles.storyChipValue}>
                <code>{tokenLabel}</code> <span className={styles.storyChipMeta}>shape: scalar</span>
              </div>
            </div>
            <p className={styles.storyText}>
              If you add 1 to the ID, you didn’t “move the character a little.” You picked a different row.
            </p>
          </>
        ),
      },
      {
        label: 'One‑hot',
        title: 'Turn “row 5” into a selector vector',
        body: (
          <>
            <p className={styles.storyText}>
              One‑hot encoding is a length‑<code>V</code> vector with a single <code>1</code>. It’s the same information as the ID, just written as linear algebra.
            </p>
            <div className={`${styles.storyChip} inset-box`} aria-label="One-hot rule">
              <div className={styles.storyChipLabel}>rule</div>
              <div className={styles.storyChipValue}>
                <code>one_hot[i] = 1 if i = x else 0</code> <span className={styles.storyChipMeta}>shape: (V,)</span>
              </div>
            </div>
            <p className={styles.storyText}>
              This looks wasteful (and it is), but it lets us say “select a row” using plain matrix multiplication.
            </p>
          </>
        ),
      },
      {
        label: 'Embed',
        title: 'Row selection as multiplication',
        body: (
          <>
            <p className={styles.storyText}>
              The embedding table <code>E</code> has one row per token: <code>E</code> is <code>[V, D]</code>.
              Multiplying <code>one_hot</code> by <code>E</code> picks out exactly one row.
            </p>
            <div className={`${styles.storyChip} inset-box`} aria-label="Embedding formula">
              <div className={styles.storyChipLabel}>e</div>
              <div className={styles.storyChipValue}>
                <code>e = one_hot @ E = E[x, :]</code> <span className={styles.storyChipMeta}>shape: (D,)</span>
              </div>
            </div>
            <p className={styles.storyText}>
              This is where “geometry” enters: <code>e</code> is a vector you can move smoothly during training.
            </p>
          </>
        ),
      },
      {
        label: 'Logits',
        title: 'Project the D‑vector back to vocab scores',
        body: (
          <>
            <p className={styles.storyText}>
              Now we need a score for every possible next token. We use another matrix: <code>W_out</code> with shape <code>[D, V]</code>.
            </p>
            <div className={`${styles.storyChip} inset-box`} aria-label="Logits formula">
              <div className={styles.storyChipLabel}>s</div>
              <div className={styles.storyChipValue}>
                <code>logits = e @ W_out + b</code> <span className={styles.storyChipMeta}>shape: (V,)</span>
              </div>
            </div>
            <p className={styles.storyText}>
              These are not probabilities yet. They’re raw scores — “how much does this next token fit this embedding?”
            </p>
          </>
        ),
      },
      {
        label: 'Softmax',
        title: 'Normalize scores into probabilities',
        body: (
          <>
            <p className={styles.storyText}>
              Softmax turns arbitrary real numbers into a valid distribution: non‑negative and sums to <code>1</code>.
            </p>
            <div className={`${styles.storyChip} inset-box`} aria-label="Softmax formula">
              <div className={styles.storyChipLabel}>p</div>
              <div className={styles.storyChipValue}>
                <code>p[j] = exp(logits[j]) / Σ_k exp(logits[k])</code> <span className={styles.storyChipMeta}>shape: (V,)</span>
              </div>
            </div>
            <p className={styles.storyText}>
              Training only cares about one entry: the probability assigned to the true next token.
            </p>
          </>
        ),
      },
    ]
  }, [tokenId, tokenChar])

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
        threshold: [0.25, 0.4, 0.55, 0.75],
        rootMargin: '-25% 0px -55% 0px',
      },
    )

    targets.forEach((t) => observer.observe(t))
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    setActiveStep((s) => clamp(s, 0, steps.length - 1))
  }, [steps.length])

  const oneHotPreview = useMemo(() => oneHot.slice(0, vocabSize), [oneHot, vocabSize])

  return (
    <VizCard title="The Forward Pass: Shapes at Each Stage" subtitle="Same data, different shapes">
      <div className={styles.container}>
        <div className={styles.scrolly}>
          <div className={styles.story} aria-label="Forward pass story">
            <div className={styles.stepper} aria-label="Story steps">
              {steps.map((s, i) => {
                const isActive = i === activeStep
                return (
                  <button
                    key={s.label}
                    type="button"
                    className={`${styles.stepBtn} hover-lift focus-glow ${isActive ? styles.stepBtnActive : ''}`}
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

            {steps.map((s, i) => {
              const isActive = i === activeStep
              return (
                <section
                  key={s.label}
                  id={`${stepperId}-step-${i}`}
                  ref={(el) => {
                    stepRefs.current[i] = el
                  }}
                  className={`${styles.storyStep} panel-dark inset-box ${isActive ? styles.storyStepActive : ''}`}
                  data-step={i}
                  aria-labelledby={`${stepperId}-title-${i}`}
                >
                  <div className={styles.storyHeader}>
                    <div className={styles.storyKicker}>
                      Step {i + 1} / {steps.length}
                    </div>
                    <h4 id={`${stepperId}-title-${i}`} className={styles.storyTitle}>
                      {s.title}
                    </h4>
                  </div>
                  <div className={styles.storyBody}>{s.body}</div>
                </section>
              )
            })}

            <div className={`${styles.ruleBox} panel-dark inset-box`} aria-label="Matrix multiply rule">
              <div className={styles.ruleTitle}>Matrix multiply rule</div>
              <div className={styles.ruleText}>
                If <code>A</code> is <code>[m, n]</code> and <code>B</code> is <code>[n, k]</code>, then <code>A @ B</code> is <code>[m, k]</code>.
                The inner <code>n</code> must match — that’s the only rule.
              </div>
            </div>
          </div>

          <div className={styles.figure} aria-label="Forward pass figure">
            <div className={`${styles.figureSticky} panel-dark`}>
              <div className={styles.figureHeader}>
                <div className={styles.figureEyebrow}>Scroll the steps. Drag the token.</div>
                <div className={styles.figureTopRow}>
                  <div className={styles.tokenReadout} aria-label="Current token">
                    <span className={styles.tokenKey}>token</span>
                    <span className={styles.tokenVal}>
                      {tokenId} <span className={styles.tokenChar}>({prettyChar(tokenChar)})</span>
                    </span>
                  </div>
                  <div className={styles.shapeSummary} aria-label="Shape summary">
                    <span className={styles.shapeToken}>x</span>
                    <span className={styles.shapeBrackets}>scalar</span>
                    <span className={styles.shapeArrow} aria-hidden="true">
                      →
                    </span>
                    <span className={styles.shapeToken}>one_hot</span>
                    <span className={styles.shapeBrackets}>
                      ({vocabSize},)
                    </span>
                    <span className={styles.shapeArrow} aria-hidden="true">
                      →
                    </span>
                    <span className={styles.shapeToken}>e</span>
                    <span className={styles.shapeBrackets}>
                      ({embedDim},)
                    </span>
                    <span className={styles.shapeArrow} aria-hidden="true">
                      →
                    </span>
                    <span className={styles.shapeToken}>logits</span>
                    <span className={styles.shapeBrackets}>
                      ({vocabSize},)
                    </span>
                    <span className={styles.shapeArrow} aria-hidden="true">
                      →
                    </span>
                    <span className={styles.shapeToken}>p</span>
                    <span className={styles.shapeBrackets}>
                      ({vocabSize},)
                    </span>
                  </div>
                </div>
                <div className={`${styles.sliderWrap} inset-box`}>
                  <Slider
                    wrap={false}
                    min={0}
                    max={vocabSize - 1}
                    step={1}
                    value={tokenId}
                    onValueChange={(v) => setTokenId(Math.round(v))}
                    ariaLabel="Token ID"
                  />
                </div>
              </div>

              <div className={styles.pipeline} aria-label="Pipeline stages">
                <div
                  className={`${styles.stageCard} inset-box ${activeStep === 0 ? styles.stageActive : styles.stageMuted} ${styles.stageCyan}`}
                >
                  <div className={styles.stageHeader}>
                    <div className={styles.stageName}>Token ID</div>
                    <div className={styles.stageShape}>scalar</div>
                  </div>
                  <div className={styles.stageBody}>
                    <div className={`${styles.stageChip} ${styles.stageChipCyan}`}>
                      <span className={styles.stageChipKey}>x</span>
                      <span className={styles.stageChipVal}>
                        {tokenId} <span className={styles.stageChipMeta}>({prettyChar(tokenChar)})</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div
                  className={`${styles.stageCard} inset-box ${activeStep === 1 ? styles.stageActive : styles.stageMuted} ${styles.stageYellow}`}
                >
                  <div className={styles.stageHeader}>
                    <div className={styles.stageName}>One‑hot</div>
                    <div className={styles.stageShape}>({vocabSize},)</div>
                  </div>
                  <div className={styles.stageBody}>
                    <div className={styles.oneHotGrid} aria-label="One-hot vector">
                      {oneHotPreview.map((v, i) => {
                        const active = i === tokenId
                        return (
                          <div
                            key={i}
                            className={`${styles.oneHotCell} ${active ? styles.oneHotCellActive : ''}`}
                            aria-label={`one_hot[${i}] = ${v}`}
                            title={`${prettyChar(VOCAB[i] ?? '?')} → ${i}`}
                          >
                            <span className={styles.oneHotVal}>{v}</span>
                          </div>
                        )
                      })}
                    </div>
                    <div className={styles.stageHint}>
                      A length‑<span className={styles.axisTag}>V</span> selector. Exactly one <code>1</code>.
                    </div>
                  </div>
                </div>

                <div
                  className={`${styles.stageCard} inset-box ${activeStep === 2 ? styles.stageActive : styles.stageMuted} ${styles.stageMagenta}`}
                >
                  <div className={styles.stageHeader}>
                    <div className={styles.stageName}>Embedding</div>
                    <div className={styles.stageShape}>({embedDim},)</div>
                  </div>
                  <div className={styles.stageBody}>
                    <VectorBars values={embedding} count={18} ariaLabel="Embedding vector preview (first coordinates)" />
                    <div className={styles.stageHint}>
                      That’s <span className={styles.axisTag}>D</span> numbers. They’re coordinates, not “meaning labels”.
                    </div>
                  </div>
                </div>

                <div
                  className={`${styles.stageCard} inset-box ${activeStep === 3 ? styles.stageActive : styles.stageMuted} ${styles.stageCyan}`}
                >
                  <div className={styles.stageHeader}>
                    <div className={styles.stageName}>Logits</div>
                    <div className={styles.stageShape}>({vocabSize},)</div>
                  </div>
                  <div className={styles.stageBody}>
                    <MiniBars rows={topLogits} kind="logits" />
                    <div className={styles.stageHint}>One score per token (bigger = more preferred).</div>
                  </div>
                </div>

                <div
                  className={`${styles.stageCard} inset-box ${activeStep === 4 ? styles.stageActive : styles.stageMuted} ${styles.stageGreen}`}
                >
                  <div className={styles.stageHeader}>
                    <div className={styles.stageName}>Probabilities</div>
                    <div className={styles.stageShape}>({vocabSize},)</div>
                  </div>
                  <div className={styles.stageBody}>
                    <MiniBars rows={topProbs} kind="probs" />
                    <div className={styles.stageHint}>Same ordering as logits, but now sums to <code>1</code>.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </VizCard>
  )
}
