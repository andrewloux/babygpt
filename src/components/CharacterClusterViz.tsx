import { useMemo, useState } from 'react'
import styles from './CharacterClusterViz.module.css'
import { VOCAB, cosineSimilarity } from '../data/characterData'

const DEFAULT_CORPUS = `It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.

The quick brown fox jumps over the lazy dog.`

// Helper to compute P(next | current)
function computeDistributions(text: string) {
  const counts: Record<string, Record<string, number>> = {}
  // Initialize
  for (const c of VOCAB) {
    counts[c] = {}
    for (const n of VOCAB) counts[c][n] = 0 // add-one smoothing handled later? No, let's keep it simple.
  }

  // Count bigrams
  const clean = text.toLowerCase().replace(/[^a-z ]/g, ' ')
  for (let i = 0; i < clean.length - 1; i++) {
    const curr = clean[i]
    if (!VOCAB.includes(curr)) continue
    const next = clean[i + 1]
    if (!VOCAB.includes(next)) continue

    counts[curr][next] = (counts[curr][next] || 0) + 1
  }

  // Normalize
  const dists: Record<string, { char: string; p: number; count: number }[]> = {}
  const totals: Record<string, number> = {}

  for (const c of VOCAB) {
    let sum = 0
    const row = counts[c]
    // Add 1 smoothing
    for (const n of VOCAB) sum += (row[n] + 1)
    totals[c] = Object.values(row).reduce((a, b) => a + b, 0)

    const d = []
    for (const n of VOCAB) {
      d.push({ char: n, count: row[n], p: (row[n] + 1) / sum })
    }
    d.sort((a, b) => b.p - a.p)
    dists[c] = d
  }

  return { dists, counts, totals }
}

// Convert distribution to flat vector for cosine sim
function toVec(dist: { char: string; p: number }[]): number[] {
  // Sort by VOCAB order to align
  const map = new Map(dist.map(d => [d.char, d.p]))
  return VOCAB.map(c => map.get(c) || 0)
}

function dot(a: number[], b: number[]): number {
  let s = 0
  for (let i = 0; i < a.length; i++) s += a[i] * b[i]
  return s
}

type CharacterClusterVizProps = {
  corpus?: string
  onCorpusChange?: (s: string) => void
  selectedA?: string
  onChangeA?: (s: string) => void
  selectedB?: string
  onChangeB?: (s: string) => void
}

export function CharacterClusterViz({
  corpus: propCorpus,
  onCorpusChange,
  selectedA,
  onChangeA,
  selectedB,
  onChangeB
}: CharacterClusterVizProps) {
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1)
  const [internalCorpus, setInternalCorpus] = useState(DEFAULT_CORPUS)
  const [internalA, setInternalA] = useState('a')
  const [internalB, setInternalB] = useState('e')

  const corpus = propCorpus ?? internalCorpus
  const setCorpus = onCorpusChange ?? setInternalCorpus
  const charA = selectedA ?? internalA
  const setCharA = onChangeA ?? setInternalA
  const charB = selectedB ?? internalB
  const setCharB = onChangeB ?? setInternalB

  const model = useMemo(() => computeDistributions(corpus), [corpus])
  const dists = model.dists

  const vecA = toVec(dists[charA])
  const vecB = toVec(dists[charB])
  const cosSim = cosineSimilarity(vecA, vecB)
  const matchProb = dot(vecA, vecB)
  const baseline = 1 / VOCAB.length

  const topOverlap = useMemo(() => {
    const all = VOCAB.map((ch, i) => ({
      char: ch,
      pa: vecA[i],
      pb: vecB[i],
      contrib: vecA[i] * vecB[i],
    }))
    all.sort((x, y) => y.contrib - x.contrib)
    return all.slice(0, 3)
  }, [vecA, vecB])

  // -- SPATIAL PLOT CONFIG --
  // We explicitly pick two dimensions to be our "X" and "Y" axes
  // For English, P(next=' ') and P(next='e') are good differentiators
  const axisXToken = ' '
  const axisYToken = 'e'
  const axisXLabel = 'P(next = space)'
  const axisYLabel = `P(next = 'e')`

  // Compute stats for scaling
  // Find max Prob for X and Y across all chars to fit plot
  let maxX = 0.1
  let maxY = 0.1

  const points = VOCAB.map(c => {
    const d = dists[c]
    const px = d.find(k => k.char === axisXToken)?.p || 0
    const py = d.find(k => k.char === axisYToken)?.p || 0
    if (px > maxX) maxX = px
    if (py > maxY) maxY = py
    return { char: c, x: px, y: py }
  })

  // Pad max
  maxX *= 1.1
  maxY *= 1.1

  const toPctX = (v: number) => (v / maxX) * 100
  const toPctY = (v: number) => (v / maxY) * 100

  // Points for A and B
  const pA = points.find(p => p.char === charA)!
  const pB = points.find(p => p.char === charB)!

  const aX = toPctX(pA.x)
  const aY = 100 - toPctY(pA.y)
  const bX = toPctX(pB.x)
  const bY = 100 - toPctY(pB.y)

  const renderHist = (char: string) => {
    const top5 = dists[char].slice(0, 5)
    const total = model.totals[char] ?? 0
    const pretty = char === ' ' ? 'space' : `'${char}'`
    return (
      <div className={styles.histogram}>
        <div className={styles.histMeta}>
          Pairs starting with {pretty}:{' '}
          <span className={styles.histMetaValue}>{total.toLocaleString()}×</span>
          {total === 0 && (
            <span className={styles.histMetaNote}>
              (never appears here → the “distribution” below is mostly +1 smoothing)
            </span>
          )}
        </div>
        {top5.map((d) => (
          <div key={d.char} className={styles.barRow}>
            <div className={styles.barLabel}>{d.char === ' ' ? '␣' : d.char}</div>
            <div className={styles.barTrack}>
              <div className={styles.barFill} style={{ width: `${d.p * 100}%` }}>
                <span className={styles.barPct}>{(d.p * 100).toFixed(0)}%</span>
                <span className={styles.barCount}>{d.count.toLocaleString()}×</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.ambientGlow} />

      <div className={styles.card}>
        <div className={styles.header}>
          <h3 className={styles.title}>From Histograms to Coordinates</h3>

          <div className={styles.topControls} aria-label="Pick two context characters">
            <label className={styles.picker}>
              <span className={`${styles.pickerLabel} ${styles.pickerLabelA}`}>A</span>
              <select
                className={`${styles.pickerSelect} ${styles.pickerSelectA}`}
                value={charA}
                onChange={(e) => setCharA(e.target.value)}
              >
                {VOCAB.map(c => (
                  <option key={c} value={c}>
                    {c === ' ' ? 'Space' : c}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.picker}>
              <span className={`${styles.pickerLabel} ${styles.pickerLabelB}`}>B</span>
              <select
                className={`${styles.pickerSelect} ${styles.pickerSelectB}`}
                value={charB}
                onChange={(e) => setCharB(e.target.value)}
              >
                {VOCAB.map(c => (
                  <option key={c} value={c}>
                    {c === ' ' ? 'Space' : c}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <ol className={styles.stepper} aria-label="Three-step walkthrough">
            <li className={styles.stepItem}>
              <button
                type="button"
                className={`${styles.stepPill} ${activeStep === 1 ? styles.stepPillActive : ''}`}
                onClick={() => setActiveStep(1)}
                aria-current={activeStep === 1 ? 'step' : undefined}
              >
                <span className={styles.stepNum}>1</span>
                <span className={styles.stepText}>
                  <span className={styles.stepTitle}>Counts</span>
                  <span className={styles.stepMeta}>(data)</span>
                </span>
              </button>
            </li>
            <li className={styles.stepItem}>
              <button
                type="button"
                className={`${styles.stepPill} ${activeStep === 2 ? styles.stepPillActive : ''}`}
                onClick={() => setActiveStep(2)}
                aria-current={activeStep === 2 ? 'step' : undefined}
              >
                <span className={styles.stepNum}>2</span>
                <span className={styles.stepText}>
                  <span className={styles.stepTitle}>Postcard</span>
                  <span className={styles.stepMeta}>(2D)</span>
                </span>
              </button>
            </li>
            <li className={styles.stepItem}>
              <button
                type="button"
                className={`${styles.stepPill} ${activeStep === 3 ? styles.stepPillActive : ''}`}
                onClick={() => setActiveStep(3)}
                aria-current={activeStep === 3 ? 'step' : undefined}
              >
                <span className={styles.stepNum}>3</span>
                <span className={styles.stepText}>
                  <span className={styles.stepTitle}>Similarity</span>
                  <span className={styles.stepMeta}>(score)</span>
                </span>
              </button>
            </li>
          </ol>
        </div>

        {activeStep === 1 && (
          <>
            <div className={styles.stepNote}>
              <strong>Step 1: counts → probabilities.</strong> Scan the corpus and count every adjacent pair (current → next).
              Normalize each row into a next‑character distribution.
            </div>

            <div className={styles.corpusSection}>
              <textarea
                className={styles.corpusInput}
                value={corpus}
                onChange={(e) => setCorpus(e.target.value)}
                rows={3}
                spellCheck={false}
              />
            </div>

            <div className={styles.histGrid} aria-label="Next-character distributions for A and B">
              <div className={`${styles.charCard} ${styles.charCardA}`}>
                <div className={styles.charHeader}>
                  <strong className={`${styles.vectorLabel} ${styles.vectorLabelA}`}>
                    After {charA === ' ' ? 'space' : `'${charA}'`}
                  </strong>
                </div>
                {renderHist(charA)}
              </div>
              <div className={`${styles.charCard} ${styles.charCardB}`}>
                <div className={styles.charHeader}>
                  <strong className={`${styles.vectorLabel} ${styles.vectorLabelB}`}>
                    After {charB === ' ' ? 'space' : `'${charB}'`}
                  </strong>
                </div>
                {renderHist(charB)}
              </div>
            </div>
          </>
        )}

        {activeStep === 2 && (
          <>
            <div className={styles.stepNote}>
              <strong>Step 2: a 2D postcard.</strong> Each character has 27 probabilities. We’ll plot just two of them as X/Y
              so you can see the cloud.
            </div>

            <div className={styles.spatialPlotArea}>
              <div className={`${styles.axisLabel} ${styles.xAxisLabel}`}>{axisXLabel} →</div>
              <div className={`${styles.axisLabel} ${styles.yAxisLabel}`}>↑ {axisYLabel}</div>

              {/* Vectors for A and B */}
              <svg
                className={styles.spatialOverlay}
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <defs>
                  <linearGradient
                    id="vectorA"
                    gradientUnits="userSpaceOnUse"
                    x1="0"
                    y1="100"
                    x2={aX}
                    y2={aY}
                  >
                    <stop offset="0%" stopColor="rgba(0, 217, 255, 0)" />
                    <stop offset="70%" stopColor="rgba(0, 217, 255, 0.35)" />
                    <stop offset="100%" stopColor="rgba(0, 217, 255, 0.95)" />
                  </linearGradient>
                  <linearGradient
                    id="vectorB"
                    gradientUnits="userSpaceOnUse"
                    x1="0"
                    y1="100"
                    x2={bX}
                    y2={bY}
                  >
                    <stop offset="0%" stopColor="rgba(255, 0, 110, 0)" />
                    <stop offset="70%" stopColor="rgba(255, 0, 110, 0.33)" />
                    <stop offset="100%" stopColor="rgba(255, 0, 110, 0.92)" />
                  </linearGradient>

                  <marker
                    id="arrowA"
                    viewBox="0 0 10 10"
                    refX="8.5"
                    refY="5"
                    markerWidth="5"
                    markerHeight="5"
                    orient="auto"
                    markerUnits="strokeWidth"
                  >
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(0, 217, 255, 0.95)" />
                  </marker>
                  <marker
                    id="arrowB"
                    viewBox="0 0 10 10"
                    refX="8.5"
                    refY="5"
                    markerWidth="5"
                    markerHeight="5"
                    orient="auto"
                    markerUnits="strokeWidth"
                  >
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(255, 0, 110, 0.92)" />
                  </marker>
                </defs>

                <line
                  className={styles.vectorLineAGlow}
                  x1={0}
                  y1={100}
                  x2={aX}
                  y2={aY}
                  stroke="rgba(0, 217, 255, 0.25)"
                />
                <line
                  className={styles.vectorLineA}
                  x1={0}
                  y1={100}
                  x2={aX}
                  y2={aY}
                  stroke="url(#vectorA)"
                  markerEnd="url(#arrowA)"
                />
                <line
                  className={styles.vectorLineBGlow}
                  x1={0}
                  y1={100}
                  x2={bX}
                  y2={bY}
                  stroke="rgba(255, 0, 110, 0.20)"
                />
                <line
                  className={styles.vectorLineB}
                  x1={0}
                  y1={100}
                  x2={bX}
                  y2={bY}
                  stroke="url(#vectorB)"
                  markerEnd="url(#arrowB)"
                />
              </svg>

              {/* Points */}
              {points.map(p => (
                <button
                  key={p.char}
                  type="button"
                  className={`${styles.point} ${p.char === charA ? styles.selectedA : ''} ${p.char === charB ? styles.selectedB : ''}`}
                  style={{ left: `${toPctX(p.x)}%`, bottom: `${toPctY(p.y)}%` }}
                  onClick={(e) => {
                    if (e.shiftKey) setCharB(p.char)
                    else setCharA(p.char)
                  }}
                  aria-label={`Select '${p.char === ' ' ? 'space' : p.char}'${p.char === charA ? ' (A)' : p.char === charB ? ' (B)' : ''}`}
                >
                  {p.char === ' ' ? '␣' : p.char}
                </button>
              ))}
            </div>

            <div className={styles.hintRow}>
              Tip: click for A, <strong>shift+click</strong> for B.
              <span className={styles.hintDivider} aria-hidden="true">·</span>
              This plot uses only two coordinates.
            </div>
          </>
        )}

        {activeStep === 3 && (
          <>
            <div className={styles.stepNote}>
              <strong>Step 3: one score.</strong> Roll one next‑character from A and one from B. The dot product is the chance
              the two rolls match.
            </div>

            <div className={styles.simCard}>
              <div className={styles.simBlock}>
                <div className={styles.simLabel}>Overlap (dot)</div>
                <div className={styles.simValue}>{matchProb.toFixed(4)}</div>
                <div className={styles.simMeta}>
                  Uniform baseline: <span className={styles.simMono}>1/{VOCAB.length}</span> ≈ {baseline.toFixed(4)}
                </div>
              </div>

              <div className={styles.overlapChips} aria-label="Top overlap contributors">
                {topOverlap.map((x) => (
                  <span key={x.char} className={styles.overlapChip}>
                    <span className={styles.overlapChipChar}>{x.char === ' ' ? '␣' : x.char}</span>
                    <span className={styles.overlapChipPct}>
                      {(matchProb <= 0 ? 0 : (x.contrib / matchProb) * 100).toFixed(0)}%
                    </span>
                  </span>
                ))}
              </div>

              <details className={styles.details}>
                <summary className={styles.detailsSummary}>
                  Optional: normalize lengths (cosine similarity)
                </summary>
                <div className={styles.detailsBody}>
                  <div className={styles.detailsRow}>
                    <div className={styles.detailsLabel}>cos(A, B)</div>
                    <div
                      className={styles.detailsValue}
                      style={{
                        color:
                          cosSim > 0.9
                            ? 'var(--accent-green)'
                            : cosSim < 0.8
                              ? 'var(--accent-red)'
                              : 'var(--accent-yellow)',
                      }}
                    >
                      {cosSim.toFixed(2)}
                    </div>
                  </div>
                  <div className={styles.detailsNote}>
                    Cosine is the dot product after you scale both vectors to length 1. It asks about <em>shape</em>, ignoring
                    magnitude.
                  </div>
                </div>
              </details>

              <div className={styles.simHint}>
                The score uses all 27 next‑character probabilities. The plot is just a postcard.
              </div>
            </div>
          </>
        )}

        <div className={styles.insight}>
          <strong>The link:</strong> the histograms are the fingerprints. Training tries to give characters coordinates whose
          similarities behave like fingerprint similarities.
        </div>
      </div>
    </div>
  )
}
