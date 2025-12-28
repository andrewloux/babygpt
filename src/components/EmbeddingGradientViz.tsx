import { useMemo, useState } from 'react'
import { VizCard } from './VizCard'
import { Slider } from './Slider'
import styles from './EmbeddingGradientViz.module.css'

type Vec2 = [number, number]

const INITIAL_EMBEDDINGS: Record<string, Vec2> = {
  a: [0.5, 0.8],
  e: [0.6, 0.7],
  i: [0.55, 0.75], // vowel cluster
  t: [0.2, 0.3],
  n: [0.3, 0.4],
  s: [0.4, 0.3],
  q: [0.9, 0.1],
}

const CHARS = Object.keys(INITIAL_EMBEDDINGS)

// --- Math Utilities ---
function softmax(logits: number[]): number[] {
  const maxLogit = Math.max(...logits)
  const exps = logits.map((l) => Math.exp(l - maxLogit))
  const sumExp = exps.reduce((a, b) => a + b, 0)
  return exps.map((e) => e / sumExp)
}

function dot(a: Vec2, b: Vec2): number {
  return a[0] * b[0] + a[1] * b[1]
}

function vecAdd(a: Vec2, b: Vec2): Vec2 {
  return [a[0] + b[0], a[1] + b[1]]
}

function vecSub(a: Vec2, b: Vec2): Vec2 {
  return [a[0] - b[0], a[1] - b[1]]
}

function vecScale(v: Vec2, s: number): Vec2 {
  return [v[0] * s, v[1] * s]
}

function vecMag(v: Vec2): number {
  return Math.sqrt(v[0] * v[0] + v[1] * v[1])
}

function angleBetween(a: Vec2, b: Vec2): number {
  const magA = vecMag(a)
  const magB = vecMag(b)
  if (magA < 1e-10 || magB < 1e-10) return 0
  const cosAngle = Math.max(-1, Math.min(1, dot(a, b) / (magA * magB)))
  return Math.acos(cosAngle) * (180 / Math.PI) // degrees
}

export function EmbeddingGradientViz() {
  const [embeddings, setEmbeddings] = useState<Record<string, Vec2>>(INITIAL_EMBEDDINGS)
  const [contextChar, setContextChar] = useState<string>('a')
  const [actualChar, setActualChar] = useState<string>('t')
  const [compareContext, setCompareContext] = useState<string | null>('e') // Compare different CONTEXTS targeting same token
  const [eta, setEta] = useState(0.5)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  // --- Derived State ---
  const { loss, probActual, gradient } = useMemo(() => {
    const contextEmb = embeddings[contextChar]
    const actualEmb = embeddings[actualChar]
    if (!contextEmb || !actualEmb) return { loss: 0, probActual: 0, gradient: [0, 0] as Vec2 }

    const logits = CHARS.map((c) => dot(contextEmb, embeddings[c]))
    const predictions = softmax(logits)

    const actualIdx = CHARS.indexOf(actualChar)
    const loss = -Math.log(Math.max(predictions[actualIdx], 1e-10))
    const probActual = predictions[actualIdx] ?? 0

    const predictedCentroid: Vec2 = CHARS.reduce(
      (acc, c, i) => vecAdd(acc, vecScale(embeddings[c], predictions[i])),
      [0, 0] as Vec2,
    )

    const gradient = vecSub(predictedCentroid, actualEmb)
    return { loss, probActual, gradient }
  }, [embeddings, contextChar, actualChar])

  // --- Compare Mode: Gradient for DIFFERENT CONTEXT targeting SAME token ---
  const compareGradient = useMemo(() => {
    if (!compareContext) return null
    const compareContextEmb = embeddings[compareContext]
    const targetEmb = embeddings[actualChar]
    if (!compareContextEmb || !targetEmb) return null

    // Compute predictions from the COMPARE context's perspective
    const logits = CHARS.map((c) => dot(compareContextEmb, embeddings[c]))
    const predictions = softmax(logits)

    const predictedCentroid: Vec2 = CHARS.reduce(
      (acc, c, i) => vecAdd(acc, vecScale(embeddings[c], predictions[i])),
      [0, 0] as Vec2,
    )

    // Gradient toward the SAME target as the primary context
    return vecSub(predictedCentroid, targetEmb)
  }, [embeddings, compareContext, actualChar])

  // --- Angle between gradients (for similarity indicator) ---
  const gradientAngle = useMemo(() => {
    if (!compareGradient) return null
    return angleBetween(gradient, compareGradient)
  }, [gradient, compareGradient])

  // --- Actions ---
  function takeStep() {
    setEmbeddings((prev) => {
      const newContextEmb = vecSub(prev[contextChar], vecScale(gradient, eta))
      return {
        ...prev,
        [contextChar]: newContextEmb,
      }
    })
    // Trigger animation
    setLastUpdated(contextChar)
    setTimeout(() => setLastUpdated(null), 500)
  }

  function reset() {
    setEmbeddings(INITIAL_EMBEDDINGS)
    setContextChar('a')
    setActualChar('t')
    setCompareContext('e')
  }

  return (
    <VizCard
      title="Why Similar Tokens Cluster"
      subtitle="Different contexts predicting the same target get pushed in similar directions."
      figNum="Fig. 2.13a"
    >
      <div className={styles.layout}>
        {/* --- Left Panel: Controls --- */}
        <div className={styles.controls}>
          <div className={styles.section}>
            <div className={styles.sectionTitle}>1. Setup</div>
            <div className={styles.picker}>
              <label htmlFor="context-char-picker">Context Token</label>
              <select
                id="context-char-picker"
                value={contextChar}
                onChange={(e) => setContextChar(e.target.value)}
              >
                {CHARS.map((c) => (
                  <option key={c} value={c}>
                    '{c}'
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.picker}>
              <label htmlFor="actual-char-picker">Actual Next Token</label>
              <select
                id="actual-char-picker"
                value={actualChar}
                onChange={(e) => setActualChar(e.target.value)}
              >
                {CHARS.map((c) => (
                  <option key={c} value={c}>
                    '{c}'
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.picker}>
              <label htmlFor="compare-context-picker">Compare Context:</label>
              <select
                id="compare-context-picker"
                value={compareContext ?? ''}
                onChange={(e) => setCompareContext(e.target.value || null)}
              >
                <option value="">None</option>
                {CHARS.filter((c) => c !== contextChar).map((c) => (
                  <option key={c} value={c}>
                    '{c}'
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>2. Take a Step</div>
            <div className={styles.etaControl}>
              <span>η (Learning Rate)</span>
              <Slider min={0.05} max={1.0} step={0.05} value={eta} onValueChange={setEta} ariaLabel="Learning Rate" />
              <span>{eta.toFixed(2)}</span>
            </div>
            <div className={styles.actions}>
              <button className={styles.primaryBtn} type="button" onClick={takeStep}>
                Nudge Context Embedding
              </button>
              <button className={styles.secondaryBtn} type="button" onClick={reset}>
                Reset
              </button>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>3. Observe</div>
            <div className={styles.stats}>
              <div>
                Loss: <span>{loss.toFixed(3)}</span>
              </div>
              <div>
                P(actual): <span>{(probActual * 100).toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* --- Right Panel: Embedding Table (The Hero) --- */}
        <div className={styles.tableContainer}>
          <div className={styles.tableTitle}>Embedding Table (E)</div>
          <table className={styles.embeddingTable}>
            <thead>
              <tr>
                <th>Token</th>
                <th>Embedding[0]</th>
                <th>Embedding[1]</th>
                <th>Gradient (∂L/∂E)</th>
              </tr>
            </thead>
            <tbody>
              {CHARS.map((char) => {
                const isContext = char === contextChar
                const emb = embeddings[char]
                const grad = isContext ? gradient : [0, 0]
                const isUpdated = char === lastUpdated

                return (
                  <tr key={char} className={isUpdated ? styles.updatedRow : ''}>
                    <td className={isContext ? styles.contextCell : ''}>'{char}'</td>
                    <td>{emb[0].toFixed(3)}</td>
                    <td>{emb[1].toFixed(3)}</td>
                    <td className={isContext ? styles.gradCell : styles.zeroGradCell}>
                      [{grad[0].toFixed(2)}, {grad[1].toFixed(2)}]
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div className={styles.tableFooter}>
            Only the row for the context token <strong>'{contextChar}'</strong> receives a non-zero gradient and gets updated.
          </div>

          {/* --- Gradient Comparison SVG --- */}
          {compareContext && compareGradient && (
            <div className={styles.gradientCompare}>
              <div className={styles.gradientCompareTitle}>
                Both contexts → '{actualChar}'
              </div>
              <svg width="200" height="200" viewBox="-100 -100 200 200" className={styles.gradientSvg}>
                {/* Grid lines */}
                <line x1="-90" y1="0" x2="90" y2="0" stroke="var(--color-border)" strokeWidth="1" />
                <line x1="0" y1="-90" x2="0" y2="90" stroke="var(--color-border)" strokeWidth="1" />

                {/* Primary gradient arrow (blue) - for contextChar */}
                {(() => {
                  const scale = 80 / Math.max(vecMag(gradient), vecMag(compareGradient), 0.01)
                  const gx = gradient[0] * scale
                  const gy = -gradient[1] * scale // flip y for SVG coords
                  return (
                    <g>
                      <line x1="0" y1="0" x2={gx} y2={gy} stroke="var(--color-accent-blue)" strokeWidth="3" />
                      <circle cx={gx} cy={gy} r="5" fill="var(--color-accent-blue)" />
                      <text x={gx + 8} y={gy - 8} fill="var(--color-accent-blue)" fontSize="12" fontWeight="600">
                        '{contextChar}'
                      </text>
                    </g>
                  )
                })()}

                {/* Comparison gradient arrow (orange) - for compareContext */}
                {(() => {
                  const scale = 80 / Math.max(vecMag(gradient), vecMag(compareGradient), 0.01)
                  const gx = compareGradient[0] * scale
                  const gy = -compareGradient[1] * scale
                  return (
                    <g>
                      <line x1="0" y1="0" x2={gx} y2={gy} stroke="var(--color-accent-orange)" strokeWidth="3" />
                      <circle cx={gx} cy={gy} r="5" fill="var(--color-accent-orange)" />
                      <text x={gx + 8} y={gy + 16} fill="var(--color-accent-orange)" fontSize="12" fontWeight="600">
                        '{compareContext}'
                      </text>
                    </g>
                  )
                })()}
              </svg>

              {/* Similarity indicator */}
              <div className={gradientAngle !== null && gradientAngle < 45 ? styles.similarGradients : styles.differentGradients}>
                {gradientAngle !== null && (
                  <>
                    Angle: {gradientAngle.toFixed(1)}°
                    {gradientAngle < 45 && <span className={styles.similarBadge}> Similar direction — this is why they cluster!</span>}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </VizCard>
  )
}
