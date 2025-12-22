import { useMemo, useRef, useState } from 'react'
import { VizCard } from './VizCard'
import { Slider } from './Slider'
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

export function EmbeddingGradientViz() {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const dragPointerId = useRef<number | null>(null)

  const [embeddings, setEmbeddings] = useState<Record<string, Vec2>>(INITIAL_EMBEDDINGS)
  const [contextChar, setContextChar] = useState<string>('a')
  const [actualChar, setActualChar] = useState<string>('t')
  const [eta, setEta] = useState(0.5)
  const [stepCount, setStepCount] = useState(0)

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

  // Preview: where the context embedding will move on the next step.
  const previewContextNext = useMemo(() => {
    const rawNext = vecSub(contextEmb, vecScale(gradient, eta))
    return clampVec(rawNext, 0.05, 0.95)
  }, [contextEmb, gradient, eta])

  // SVG coordinate mapping (0-1 space to pixel space with margins)
  const toSvgX = (x: number) => MARGIN + x * (WIDTH - 2 * MARGIN)
  const toSvgY = (y: number) => HEIGHT - MARGIN - y * (HEIGHT - 2 * MARGIN)

  const updateContextFromPointer = (e: React.PointerEvent) => {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return

    const sx = ((e.clientX - rect.left) / rect.width) * WIDTH
    const sy = ((e.clientY - rect.top) / rect.height) * HEIGHT

    const x01 = (sx - MARGIN) / (WIDTH - 2 * MARGIN)
    const y01 = (HEIGHT - MARGIN - sy) / (HEIGHT - 2 * MARGIN)
    const newEmb = clampVec([x01, y01], 0.05, 0.95)

    setEmbeddings((prev) => ({
      ...prev,
      [contextChar]: newEmb,
    }))
  }

  const onContextPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    dragPointerId.current = e.pointerId
    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
    updateContextFromPointer(e)
  }

  const onContextPointerMove = (e: React.PointerEvent) => {
    if (dragPointerId.current !== e.pointerId) return
    updateContextFromPointer(e)
  }

  const onContextPointerUp = (e: React.PointerEvent) => {
    if (dragPointerId.current !== e.pointerId) return
    dragPointerId.current = null
  }

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
    setEmbeddings((prev) => {
      const ctxEmb = prev[contextChar]
      const logitsNow = CHARS.map((c) => dot(ctxEmb, prev[c]))
      const probsNow = softmax(logitsNow)

      const predictedNow: Vec2 = CHARS.reduce(
        (acc, c, i) => vecAdd(acc, vecScale(prev[c], probsNow[i])),
        [0, 0] as Vec2
      )
      const gradNow = vecSub(predictedNow, prev[actualChar])
      const rawNext = vecSub(ctxEmb, vecScale(gradNow, eta))
      const next = clampVec(rawNext, 0.05, 0.95)

      return {
        ...prev,
        [contextChar]: next,
      }
    })
    setStepCount((c) => c + 1)
  }

  function reset() {
    setEmbeddings(INITIAL_EMBEDDINGS)
    setContextChar('a')
    setActualChar('t')
    setStepCount(0)
  }

  const probRows = useMemo(
    () =>
      CHARS.map((c, i) => ({ char: c, prob: predictions[i] }))
        .sort((a, b) => b.prob - a.prob),
    [predictions]
  )

  const edgeRows = useMemo(() => {
    const top = probRows.slice(0, 3)
    const actualRow = probRows.find((r) => r.char === actualChar)
    if (actualRow && !top.some((r) => r.char === actualRow.char)) top.push(actualRow)
    return top
  }, [probRows, actualChar])

  return (
    <VizCard
      title="One Gradient Step, In 2D"
      subtitle="Drag the context embedding, watch the update direction"
      figNum="Fig. 2.5"
    >
      <div className={styles.layout}>
        <div className={styles.left}>
          <div className={styles.graphContainer}>
            <div className={styles.plotArea}>
              <svg
                ref={svgRef}
                className={styles.svg}
                viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
                role="img"
                aria-label="2D embedding space"
              >
                <defs>
                <radialGradient id="contextGlow">
                  <stop offset="0%" stopColor="rgba(255,0,110,0.45)" />
                  <stop offset="100%" stopColor="rgba(255,0,110,0)" />
                </radialGradient>
                <radialGradient id="actualGlow">
                  <stop offset="0%" stopColor="rgba(0,217,255,0.45)" />
                  <stop offset="100%" stopColor="rgba(0,217,255,0)" />
                </radialGradient>
                <radialGradient id="predictedGlow">
                  <stop offset="0%" stopColor="rgba(255,214,10,0.45)" />
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

              {/* Probability-weighted connections (show top few so the centroid feels computable) */}
              {edgeRows.map((row) => {
                const targetEmb = embeddings[row.char]
                return (
                  <line
                    key={`prob-${row.char}`}
                    x1={toSvgX(contextEmb[0])}
                    y1={toSvgY(contextEmb[1])}
                    x2={toSvgX(targetEmb[0])}
                    y2={toSvgY(targetEmb[1])}
                    stroke="rgba(0, 217, 255, 0.45)"
                    strokeWidth={Math.max(1, row.prob * 7)}
                    opacity={0.2 + row.prob * 0.85}
                    className={styles.probConnection}
                  />
                )
              })}

              {/* Character points */}
              {CHARS.map((c) => {
                const [x, y] = embeddings[c]
                const isContext = c === contextChar
                const isActual = c === actualChar
                const svgX = toSvgX(x)
                const svgY = toSvgY(y)

                return (
                  <g key={c}>
                    {isContext && (
                      <circle
                        cx={svgX}
                        cy={svgY}
                        r="24"
                        fill="url(#contextGlow)"
                        className={styles.glow}
                      />
                    )}
                    {isActual && (
                      <circle
                        cx={svgX}
                        cy={svgY}
                        r="24"
                        fill="url(#actualGlow)"
                        className={styles.glow}
                      />
                    )}

                    {/* Context ring (drag handle) */}
                    {isContext && (
                      <>
                        <circle
                          cx={svgX}
                          cy={svgY}
                          r="16"
                          fill="none"
                          stroke="var(--accent-magenta)"
                          strokeWidth="2"
                          className={styles.contextRing}
                        />
                        <circle
                          cx={svgX}
                          cy={svgY}
                          r="18"
                          fill="transparent"
                          className={styles.contextHit}
                          onPointerDown={onContextPointerDown}
                          onPointerMove={onContextPointerMove}
                          onPointerUp={onContextPointerUp}
                          onPointerCancel={onContextPointerUp}
                        />
                      </>
                    )}

                    <circle
                      cx={svgX}
                      cy={svgY}
                      r="6"
                      fill={isActual ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.72)'}
                      stroke="rgba(255,255,255,0.9)"
                      strokeWidth="1"
                      className={styles.point}
                      onClick={() => !isContext && setActualChar(c)}
                    />
                    <text
                      x={svgX + 10}
                      y={svgY - 10}
                      className={styles.label}
                      fill={
                        isContext
                          ? 'var(--accent-magenta)'
                          : isActual
                            ? 'var(--accent-cyan)'
                            : 'rgba(255,255,255,0.6)'
                      }
                    >
                      {c}
                    </text>
                  </g>
                )
              })}

              {/* Predicted centroid */}
              <g>
                <circle
                  cx={toSvgX(predictedCentroid[0])}
                  cy={toSvgY(predictedCentroid[1])}
                  r="24"
                  fill="url(#predictedGlow)"
                  className={styles.glow}
                />
                <circle
                  cx={toSvgX(predictedCentroid[0])}
                  cy={toSvgY(predictedCentroid[1])}
                  r="8"
                  fill="none"
                  stroke="var(--accent-yellow)"
                  strokeWidth="2.5"
                  className={styles.centroid}
                />
              </g>

              {/* Gradient arrow: FROM actual TO predicted centroid (uphill) */}
              <line
                x1={toSvgX(actualEmb[0])}
                y1={toSvgY(actualEmb[1])}
                x2={toSvgX(predictedCentroid[0])}
                y2={toSvgY(predictedCentroid[1])}
                stroke="var(--accent-yellow)"
                strokeWidth="2"
                markerEnd="url(#gradArrow)"
                className={styles.gradArrow}
              />

              {/* Update arrow: FROM context TO next context (downhill) */}
              <line
                x1={toSvgX(contextEmb[0])}
                y1={toSvgY(contextEmb[1])}
                x2={toSvgX(previewContextNext[0])}
                y2={toSvgY(previewContextNext[1])}
                stroke="var(--accent-magenta)"
                strokeWidth="2.5"
                strokeDasharray="6,4"
                markerEnd="url(#updateArrow)"
                className={styles.updateArrow}
              />

              {/* Ghost of next context position */}
              <circle
                cx={toSvgX(previewContextNext[0])}
                cy={toSvgY(previewContextNext[1])}
                r="7"
                fill="none"
                stroke="rgba(255, 0, 110, 0.65)"
                strokeWidth="2"
                strokeDasharray="3,3"
                className={styles.previewDot}
              />
              </svg>
            </div>
            <div className={styles.plotHint}>
              Drag the <span className={styles.hintContext}>magenta ring</span> (context). Click a point to set the{' '}
              <span className={styles.hintActual}>actual</span>.
            </div>
          </div>
        </div>

        <div className={`${styles.right} panel-dark`} aria-label="Controls">
          <div className={styles.pickers}>
            <div className={styles.pickerRow}>
              <span className={styles.pickerLabel}>Context</span>
              <select
                value={contextChar}
                onChange={(e) => setContextChar(e.target.value)}
                className={styles.pickerSelect}
              >
                {CHARS.map((c) => (
                  <option key={`ctx-${c}`} value={c}>
                    '{c}'
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.pickerRow}>
              <span className={styles.pickerLabel}>Actual</span>
              <select
                value={actualChar}
                onChange={(e) => setActualChar(e.target.value)}
                className={styles.pickerSelect}
              >
                {CHARS.map((c) => (
                  <option key={`actual-${c}`} value={c}>
                    '{c}'
                  </option>
                ))}
              </select>
              <button className={styles.smallBtn} type="button" onClick={sampleNext}>
                Sample
              </button>
            </div>
          </div>

          <div className={styles.stats}>
            <div className={styles.stat}>
              <div className={styles.statLabel}>loss</div>
              <div className={styles.statValue}>{currentLoss.toFixed(3)}</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statLabel}>p(actual)</div>
              <div className={styles.statValue}>{(currentProbActual * 100).toFixed(1)}%</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statLabel}>step</div>
              <div className={styles.statValue}>{stepCount}</div>
            </div>
          </div>

          <div className={styles.etaControl}>
            <span className={styles.etaLabel}>η</span>
            <Slider
              wrap={false}
              min={0.05}
              max={1.0}
              step={0.05}
              value={eta}
              onValueChange={setEta}
              ariaLabel="Step size eta"
            />
            <span className={styles.etaValue}>{eta.toFixed(2)}</span>
          </div>

          <div className={styles.actions}>
            <button className={`${styles.btn} ${styles.primaryBtn}`} type="button" onClick={takeStep}>
              Take step
            </button>
            <button className={styles.btn} type="button" onClick={reset}>
              Reset
            </button>
          </div>

          <div className={styles.probs} aria-label="Predicted probabilities">
            <div className={styles.probHeader}>p(next | context)</div>
            <div className={styles.probList}>
              {probRows.map((row) => {
                const isActual = row.char === actualChar
                return (
                  <div key={`p-${row.char}`} className={styles.probRow}>
                    <span className={styles.probChar}>{row.char}</span>
                    <div className={styles.probBarTrack} aria-hidden="true">
                      <div
                        className={`${styles.probBar} ${isActual ? styles.probBarActual : ''}`}
                        style={{ width: `${row.prob * 100}%` }}
                      />
                    </div>
                    <span className={styles.probValue}>{row.prob.toFixed(2)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </VizCard>
  )
}
