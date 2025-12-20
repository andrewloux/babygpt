import katex from 'katex'
import 'katex/dist/katex.min.css'
import { useMemo, useState } from 'react'
import styles from './EmbeddingGradientViz.module.css'

type Vec2 = [number, number]

// Character embeddings in 2D space
const INITIAL_EMBEDDINGS: Record<string, Vec2> = {
  a: [0.5, 0.8],
  e: [0.6, 0.7],
  t: [0.2, 0.3],
  n: [0.3, 0.4],
  s: [0.4, 0.3],
  q: [0.9, 0.1],
}

// Realistic-ish P(next|context) for demo
const NEXT_PROBS: Record<string, Record<string, number>> = {
  a: { t: 0.3, n: 0.25, s: 0.2, e: 0.1, a: 0.1, q: 0.05 },
  e: { t: 0.28, n: 0.27, s: 0.18, a: 0.12, e: 0.1, q: 0.05 },
  t: { a: 0.25, e: 0.2, n: 0.18, s: 0.15, t: 0.12, q: 0.1 },
  n: { a: 0.28, e: 0.22, t: 0.2, s: 0.15, n: 0.1, q: 0.05 },
  s: { a: 0.25, e: 0.22, t: 0.2, n: 0.15, s: 0.1, q: 0.08 },
  q: { a: 0.3, e: 0.25, t: 0.15, n: 0.15, s: 0.1, q: 0.05 },
}

const CHARS = ['a', 'e', 't', 'n', 's', 'q'] as const
const WIDTH = 520
const HEIGHT = 400
const MARGIN = 40

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

function vecScale(v: Vec2, s: number): Vec2 {
  return [v[0] * s, v[1] * s]
}

function vecSub(a: Vec2, b: Vec2): Vec2 {
  return [a[0] - b[0], a[1] - b[1]]
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val))
}

function clampVec(v: Vec2, min: number, max: number): Vec2 {
  return [clamp(v[0], min, max), clamp(v[1], min, max)]
}

type Panel = 'explain' | 'trails' | 'auto'

export function EmbeddingGradientViz() {
  const [embeddings, setEmbeddings] = useState<Record<string, Vec2>>(INITIAL_EMBEDDINGS)
  const [contextChar, setContextChar] = useState<string>('a')
  const [actualChar, setActualChar] = useState<string>('t')
  const [eta, setEta] = useState(0.5)
  const [stepCount, setStepCount] = useState(0)
  const [isAutoTraining, setIsAutoTraining] = useState(false)
  const [autoSteps, setAutoSteps] = useState(50)
  const [trainSpeed, setTrainSpeed] = useState(50)
  const [trajectories, setTrajectories] = useState<Record<string, Vec2[]>>({})
  const [showCompletionMessage, setShowCompletionMessage] = useState(false)
  const [showTrails, setShowTrails] = useState(true)
  const [trailLength, setTrailLength] = useState(20)
  const [panel, setPanel] = useState<Panel | null>(null)

  // Compute softmax predictions based on dot products
  const contextEmb = embeddings[contextChar]
  const logits = CHARS.map((c) => dot(contextEmb, embeddings[c]))
  const predictions = softmax(logits)

  // Calculate cross-entropy loss: -log(p_actual)
  const actualIdx = CHARS.indexOf(actualChar as typeof CHARS[number])
  const currentLoss = -Math.log(Math.max(predictions[actualIdx], 1e-10))
  const currentProbActual = predictions[actualIdx] ?? 0

  // Compute predicted centroid: Σ pⱼ × E[j]
  const predictedCentroid: Vec2 = CHARS.reduce(
    (acc, c, i) => vecAdd(acc, vecScale(embeddings[c], predictions[i])),
    [0, 0] as Vec2
  )

  const actualEmb = embeddings[actualChar]

  // Gradient: predicted - actual (points FROM actual TOWARD predicted)
  const gradient = vecSub(predictedCentroid, actualEmb)

  // SVG coordinate mapping (0-1 space to pixel space with margins)
  const toSvgX = (x: number) => MARGIN + x * (WIDTH - 2 * MARGIN)
  const toSvgY = (y: number) => HEIGHT - MARGIN - y * (HEIGHT - 2 * MARGIN)

  function sampleNext() {
    const probs = NEXT_PROBS[contextChar]
    const rand = Math.random()
    let cumulative = 0
    for (const c of CHARS) {
      cumulative += probs[c]
      if (rand < cumulative) {
        setActualChar(c)
        return
      }
    }
    setActualChar(CHARS[CHARS.length - 1])
  }

  function takeStep() {
    // Update: E[context] -= η × gradient
    // Since gradient points uphill (toward predicted), subtracting it moves us downhill (toward actual)
    const rawNewEmb = vecSub(embeddings[contextChar], vecScale(gradient, eta))
    const newEmb = clampVec(rawNewEmb, 0.05, 0.95)

    // Record trajectory (trimmed to max trail length)
    setTrajectories((prev) => {
      const newTrail = [...(prev[contextChar] || []), embeddings[contextChar]]
      return {
        ...prev,
        [contextChar]: newTrail.slice(-trailLength),
      }
    })

    setEmbeddings({
      ...embeddings,
      [contextChar]: newEmb,
    })
    setStepCount((c) => c + 1)
  }

  function reset() {
    setEmbeddings(INITIAL_EMBEDDINGS)
    setContextChar('a')
    setActualChar('t')
    setStepCount(0)
    setTrajectories({})
    setShowCompletionMessage(false)
  }

  async function autoTrain() {
    setIsAutoTraining(true)
    setShowCompletionMessage(false)
    setTrajectories({})

    for (let i = 0; i < autoSteps; i++) {
      // Cycle through contexts to ensure all characters get updated
      const ctx = CHARS[i % CHARS.length]
      setContextChar(ctx)
      await new Promise((r) => setTimeout(r, trainSpeed))

      // Sample next character based on probabilities
      const probs = NEXT_PROBS[ctx]
      const rand = Math.random()
      let cumulative = 0
      let nextChar = CHARS[CHARS.length - 1]
      for (const c of CHARS) {
        cumulative += probs[c]
        if (rand < cumulative) {
          nextChar = c
          break
        }
      }
      setActualChar(nextChar)
      await new Promise((r) => setTimeout(r, trainSpeed))

      // Take gradient step
      // Compute gradient and new embedding, capturing old position for trajectory
      let oldPosition: Vec2 | null = null
      setEmbeddings((currentEmbeddings) => {
        const currentContextEmb = currentEmbeddings[ctx]
        oldPosition = currentContextEmb
        const currentLogits = CHARS.map((c) => dot(currentContextEmb, currentEmbeddings[c]))
        const currentPredictions = softmax(currentLogits)
        const currentPredictedCentroid: Vec2 = CHARS.reduce(
          (acc, c, idx) => vecAdd(acc, vecScale(currentEmbeddings[c], currentPredictions[idx])),
          [0, 0] as Vec2
        )
        const currentActualEmb = currentEmbeddings[nextChar]
        const currentGradient = vecSub(currentPredictedCentroid, currentActualEmb)
        const rawNewEmb = vecSub(currentContextEmb, vecScale(currentGradient, eta))
        const newEmb = clampVec(rawNewEmb, 0.05, 0.95)

        return {
          ...currentEmbeddings,
          [ctx]: newEmb,
        }
      })

      // Update trajectory with captured old position (after embeddings update)
      if (oldPosition) {
        const positionToRecord = oldPosition
        setTrajectories((prev) => {
          const newTrail = [...(prev[ctx] || []), positionToRecord]
          return {
            ...prev,
            [ctx]: newTrail.slice(-trailLength),
          }
        })
      }

      setStepCount((c) => c + 1)
      await new Promise((r) => setTimeout(r, trainSpeed))
    }

    setIsAutoTraining(false)
    setShowCompletionMessage(true)
  }

  const explainEqHtml = useMemo(() => {
    const blocks = [
      String.raw`\hat{e} = \sum_j p_j \cdot E[j]`,
      String.raw`\nabla_{E[c]} L = \hat{e} - E[\text{actual}]`,
      String.raw`E[c] \leftarrow E[c] - \eta \cdot \nabla L`,
    ]

    return blocks.map((eq) =>
      katex.renderToString(eq, {
        throwOnError: false,
        displayMode: true,
      }),
    )
  }, [])

  const togglePanel = (next: Panel) => {
    setPanel((prev) => (prev === next ? null : next))
  }

  return (
    <div className={styles.container}>
      <div className={styles.ambientGlow} />
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.headerText}>
            <h3 className={styles.title}>Embedding Gradient Derivation</h3>
            <p className={styles.subtitle}>Understanding gradient descent: gradient points uphill, we move downhill</p>
          </div>
          <span className={styles.figNum}>Fig. 2.5</span>
        </div>

        <div className={styles.graphContainer}>
          <svg className={styles.svg} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="2D embedding space">
            <defs>
              <radialGradient id="contextGlow">
                <stop offset="0%" stopColor="rgba(255,0,110,0.5)" />
                <stop offset="100%" stopColor="rgba(255,0,110,0)" />
              </radialGradient>
              <radialGradient id="actualGlow">
                <stop offset="0%" stopColor="rgba(0,217,255,0.5)" />
                <stop offset="100%" stopColor="rgba(0,217,255,0)" />
              </radialGradient>
              <radialGradient id="predictedGlow">
                <stop offset="0%" stopColor="rgba(255,214,10,0.5)" />
                <stop offset="100%" stopColor="rgba(255,214,10,0)" />
              </radialGradient>
              <marker id="gradArrow" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto">
                <polygon points="0 0, 10 4, 0 8" fill="rgba(255,214,10,0.95)" />
              </marker>
              <marker id="updateArrow" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto">
                <polygon points="0 0, 10 4, 0 8" fill="rgba(255,0,110,0.95)" />
              </marker>
            </defs>

            {/* Soft grid */}
            {[0.25, 0.5, 0.75].map((i) => (
              <line
                key={`h-${i}`}
                x1={MARGIN}
                y1={toSvgY(i)}
                x2={WIDTH - MARGIN}
                y2={toSvgY(i)}
                className={styles.gridLine}
              />
            ))}
            {[0.25, 0.5, 0.75].map((i) => (
              <line
                key={`v-${i}`}
                x1={toSvgX(i)}
                y1={MARGIN}
                x2={toSvgX(i)}
                y2={HEIGHT - MARGIN}
                className={styles.gridLine}
              />
            ))}

            {/* Axes */}
            <line
              x1={MARGIN}
              y1={toSvgY(0)}
              x2={WIDTH - MARGIN}
              y2={toSvgY(0)}
              className={styles.axisLine}
            />
            <line
              x1={toSvgX(0)}
              y1={MARGIN}
              x2={toSvgX(0)}
              y2={HEIGHT - MARGIN}
              className={styles.axisLine}
            />

            {/* Trajectory trails */}
            {showTrails && Object.entries(trajectories).map(([char, trail]) => (
              <g key={`trail-${char}`}>
                {trail.map((pos, idx) => {
                  const opacity = Math.max(0.1, idx / trail.length) * 0.5
                  return (
                    <circle
                      key={`${char}-${idx}`}
                      cx={toSvgX(pos[0])}
                      cy={toSvgY(pos[1])}
                      r="2"
                      fill="rgba(255, 255, 255, 0.3)"
                      opacity={opacity}
                    />
                  )
                })}
              </g>
            ))}

            {/* Character points */}
            {CHARS.map((c) => {
              const [x, y] = embeddings[c]
              const isContext = c === contextChar
              const isActual = c === actualChar
              const svgX = toSvgX(x)
              const svgY = toSvgY(y)

              return (
                <g key={c}>
                  {/* Glow for context */}
                  {isContext && (
                    <circle
                      cx={svgX}
                      cy={svgY}
                      r="22"
                      fill="url(#contextGlow)"
                      className={styles.glow}
                    />
                  )}
                  {/* Glow for actual */}
                  {isActual && (
                    <circle
                      cx={svgX}
                      cy={svgY}
                      r="22"
                      fill="url(#actualGlow)"
                      className={styles.glow}
                    />
                  )}
                  {/* Context ring */}
                  {isContext && (
                    <circle
                      cx={svgX}
                      cy={svgY}
                      r="12"
                      fill="none"
                      stroke="var(--accent-magenta)"
                      strokeWidth="2"
                      className={styles.contextRing}
                    />
                  )}
                  {/* Point */}
                  <circle
                    cx={svgX}
                    cy={svgY}
                    r="5"
                    fill={isActual ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.7)'}
                    stroke="rgba(255,255,255,0.9)"
                    strokeWidth="1"
                    className={styles.point}
                  />
                  {/* Label */}
                  <text
                    x={svgX + 10}
                    y={svgY - 10}
                    className={styles.label}
                    fill={isContext ? 'var(--accent-magenta)' : isActual ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.6)'}
                  >
                    {c}
                  </text>
                </g>
              )
            })}

            {/* Probability-weighted connections showing centroid computation */}
            {CHARS.map((char, i) => {
              const prob = predictions[i]
              const targetEmb = embeddings[char]

              return (
                <line
                  key={`prob-${char}`}
                  x1={toSvgX(contextEmb[0])}
                  y1={toSvgY(contextEmb[1])}
                  x2={toSvgX(targetEmb[0])}
                  y2={toSvgY(targetEmb[1])}
                  stroke="rgba(255,214,10,0.5)"
                  strokeWidth={prob * 5}
                  opacity={prob * 0.9}
                  className={styles.probConnection}
                />
              )
            })}

            {/* Predicted centroid */}
            <g>
              <circle
                cx={toSvgX(predictedCentroid[0])}
                cy={toSvgY(predictedCentroid[1])}
                r="22"
                fill="url(#predictedGlow)"
                className={styles.glow}
              />
              <circle
                cx={toSvgX(predictedCentroid[0])}
                cy={toSvgY(predictedCentroid[1])}
                r="7"
                fill="none"
                stroke="var(--accent-yellow)"
                strokeWidth="2.5"
                className={styles.centroid}
              />
              <text
                x={toSvgX(predictedCentroid[0]) + 12}
                y={toSvgY(predictedCentroid[1]) + 16}
                className={styles.label}
                fill="var(--accent-yellow)"
              >
                predicted centroid
              </text>
            </g>

            {/* Gradient arrow: FROM actual TO predicted (uphill direction) */}
            <line
              x1={toSvgX(actualEmb[0])}
              y1={toSvgY(actualEmb[1])}
              x2={toSvgX(predictedCentroid[0])}
              y2={toSvgY(predictedCentroid[1])}
              stroke="var(--accent-yellow)"
              strokeWidth="2"
              markerEnd="url(#gradArrow)"
              className={styles.gradArrow}
              opacity="0.7"
            />

            {/* Update direction arrow: FROM predicted TO actual (downhill, where we move) */}
            {(() => {
              // Calculate gradient direction in SVG pixel space for consistent visual offset
              const actualSvgX = toSvgX(actualEmb[0])
              const actualSvgY = toSvgY(actualEmb[1])
              const predictedSvgX = toSvgX(predictedCentroid[0])
              const predictedSvgY = toSvgY(predictedCentroid[1])

              // Vector from actual to predicted in SVG space
              const svgDx = predictedSvgX - actualSvgX
              const svgDy = predictedSvgY - actualSvgY
              const svgLength = Math.sqrt(svgDx ** 2 + svgDy ** 2)

              let offsetX = 0
              let offsetY = 0

              // Only apply offset if gradient is non-negligible in SVG space
              if (svgLength > 1) {
                const OFFSET_PIXELS = 4 // Fixed pixel offset for visual separation
                // Perpendicular vector: rotate 90 degrees in SVG space
                const perpX = -svgDy / svgLength * OFFSET_PIXELS
                const perpY = svgDx / svgLength * OFFSET_PIXELS
                offsetX = perpX
                offsetY = perpY
              }

              return (
                <line
                  x1={predictedSvgX + offsetX}
                  y1={predictedSvgY + offsetY}
                  x2={actualSvgX + offsetX}
                  y2={actualSvgY + offsetY}
                  stroke="var(--accent-magenta)"
                  strokeWidth="2.5"
                  strokeDasharray="5,3"
                  markerEnd="url(#updateArrow)"
                  className={styles.updateArrow}
                />
              )
            })()}
          </svg>
        </div>

        <div className={styles.legend} aria-label="Legend">
          <div className={styles.legendRow}>
            <span className={`${styles.legendLine} ${styles.legendGradient}`} aria-hidden="true" />
            <span>gradient (uphill)</span>
          </div>
          <div className={styles.legendRow}>
            <span className={`${styles.legendLine} ${styles.legendUpdate}`} aria-hidden="true" />
            <span>update direction (downhill)</span>
          </div>
        </div>

        <div className={styles.metrics} aria-label="Current state">
          <div className={styles.metric}>
            <div className={styles.metricLabel}>loss</div>
            <div className={styles.metricValue}>{currentLoss.toFixed(3)}</div>
          </div>
          <div className={styles.metric}>
            <div className={styles.metricLabel}>p(actual)</div>
            <div className={styles.metricValue}>{(currentProbActual * 100).toFixed(1)}%</div>
          </div>
          <div className={styles.metric}>
            <div className={styles.metricLabel}>step</div>
            <div className={styles.metricValue}>{stepCount}</div>
          </div>
          <div className={styles.metric}>
            <div className={styles.metricLabel}>context</div>
            <div className={styles.metricValue}>'{contextChar}'</div>
          </div>
        </div>

        <div className={styles.controls}>
          <button className={styles.btn} type="button" onClick={reset} disabled={isAutoTraining}>
            Reset
          </button>

          <div className={styles.contextControl}>
            <label className={styles.contextLabel} htmlFor="context">
              Context:
            </label>
            <select
              id="context"
              value={contextChar}
              onChange={(e) => setContextChar(e.target.value)}
              className={styles.contextSelect}
              disabled={isAutoTraining}
            >
              {CHARS.map((c) => (
                <option key={c} value={c}>
                  '{c}'
                </option>
              ))}
            </select>
          </div>

          <button className={styles.btn} type="button" onClick={sampleNext} disabled={isAutoTraining}>
            Sample next
          </button>

          <div className={styles.etaControl}>
            <label className={styles.etaLabel} htmlFor="eta">
              η
            </label>
            <input
              id="eta"
              type="range"
              min="0.1"
              max="1.0"
              step="0.1"
              value={eta}
              onChange={(e) => setEta(parseFloat(e.target.value))}
              className={styles.etaSlider}
              disabled={isAutoTraining}
            />
            <span className={styles.etaValue}>{eta.toFixed(1)}</span>
          </div>

          <button className={`${styles.btn} ${styles.primaryBtn}`} type="button" onClick={takeStep} disabled={isAutoTraining}>
            Take step
          </button>
        </div>

        <div className={styles.panelRow} role="tablist" aria-label="Controls">
          <button
            type="button"
            className={`${styles.panelBtn} ${panel === 'explain' ? styles.panelBtnActive : ''}`}
            onClick={() => togglePanel('explain')}
            aria-selected={panel === 'explain'}
          >
            Explain
          </button>
          <button
            type="button"
            className={`${styles.panelBtn} ${panel === 'trails' ? styles.panelBtnActive : ''}`}
            onClick={() => togglePanel('trails')}
            aria-selected={panel === 'trails'}
          >
            Trails
          </button>
          <button
            type="button"
            className={`${styles.panelBtn} ${panel === 'auto' ? styles.panelBtnActive : ''}`}
            onClick={() => togglePanel('auto')}
            aria-selected={panel === 'auto'}
          >
            Auto
          </button>
          <div className={styles.panelHint}>
            {panel ? 'Tap again to close.' : 'Open a panel if you want the math or knobs.'}
          </div>
        </div>

        {panel === 'explain' && (
          <div className={styles.panel} role="tabpanel" aria-label="Explanation">
            {showCompletionMessage ? (
              <div className={styles.panelNote}>
                Training complete. Characters that predict similar next characters tend to drift toward similar places.
              </div>
            ) : (
              <div className={styles.panelNote}>
                Yellow lines are probabilities. Their weighted average is the predicted centroid. Yellow arrow points uphill (gradient). Magenta dashed arrow points downhill (the update direction).
              </div>
            )}

            <div className={styles.eqStack} aria-label="Equations">
              {explainEqHtml.map((html, idx) => (
                <div
                  key={idx}
                  className={styles.eq}
                  dangerouslySetInnerHTML={{ __html: html }}
                />
              ))}
            </div>

            <div className={styles.panelFine}>
              We subtract the gradient because we’re minimizing loss: the gradient points in the direction loss increases fastest.
            </div>
          </div>
        )}

        {panel === 'trails' && (
          <div className={styles.panel} role="tabpanel" aria-label="Trail controls">
            <div className={styles.panelControls}>
              <label className={styles.trailCheckbox}>
                <input
                  type="checkbox"
                  checked={showTrails}
                  onChange={(e) => setShowTrails(e.target.checked)}
                  disabled={isAutoTraining}
                />
                <span className={styles.trailCheckboxLabel}>Show trails</span>
              </label>
              {showTrails && (
                <div className={styles.trailLengthControl}>
                  <label className={styles.trailLengthLabel} htmlFor="trailLength">
                    Trail length
                  </label>
                  <input
                    id="trailLength"
                    type="range"
                    min="5"
                    max="50"
                    step="5"
                    value={trailLength}
                    onChange={(e) => setTrailLength(Number(e.target.value))}
                    className={styles.trailLengthSlider}
                    disabled={isAutoTraining}
                  />
                  <span className={styles.trailLengthValue}>{trailLength}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {panel === 'auto' && (
          <div className={styles.panel} role="tabpanel" aria-label="Auto training controls">
            <div className={styles.autoTrainControls}>
              <label className={styles.autoStepsLabel} htmlFor="autoSteps">
                Steps
              </label>
              <select
                id="autoSteps"
                value={autoSteps}
                onChange={(e) => setAutoSteps(parseInt(e.target.value))}
                className={styles.autoStepsSelect}
                disabled={isAutoTraining}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <div className={styles.speedControl}>
                <label className={styles.speedLabel} htmlFor="trainSpeed">
                  Speed
                </label>
                <span className={styles.speedLabelText}>Slow</span>
                {/* Invert slider: right=fast (low delay), left=slow (high delay) */}
                {(() => {
                  const MIN_DELAY = 10
                  const MAX_DELAY = 200
                  const invert = (v: number) => MIN_DELAY + MAX_DELAY - v
                  return (
                    <input
                      id="trainSpeed"
                      type="range"
                      min={MIN_DELAY}
                      max={MAX_DELAY}
                      step="10"
                      value={invert(trainSpeed)}
                      onChange={(e) => setTrainSpeed(invert(Number(e.target.value)))}
                      className={styles.speedSlider}
                      disabled={isAutoTraining}
                    />
                  )
                })()}
                <span className={styles.speedLabelText}>Fast</span>
              </div>
              <button
                className={`${styles.btn} ${styles.autoTrainBtn}`}
                type="button"
                onClick={autoTrain}
                disabled={isAutoTraining}
              >
                {isAutoTraining ? 'Training...' : 'Auto-train'}
              </button>
            </div>
            <div className={styles.panelFine}>
              Runs many small steps so you can watch points drift.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
