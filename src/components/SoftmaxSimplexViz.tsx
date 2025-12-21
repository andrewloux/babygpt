import { useState, useMemo } from 'react'
import { VizCard } from './VizCard'
import { Slider } from './Slider'
import styles from './SoftmaxSimplexViz.module.css'

const WIDTH = 400
const HEIGHT = 350
const TRIANGLE_SIZE = 280
const CENTER_X = WIDTH / 2
const CENTER_Y = HEIGHT / 2 + 20

// Use concrete characters instead of A, B, C
const CHARS = ['e', 'a', 'i'] as const

// Equilateral triangle vertices
const VERTICES = {
  A: { x: CENTER_X, y: CENTER_Y - TRIANGLE_SIZE * 0.577 },
  B: { x: CENTER_X - TRIANGLE_SIZE / 2, y: CENTER_Y + TRIANGLE_SIZE * 0.289 },
  C: { x: CENTER_X + TRIANGLE_SIZE / 2, y: CENTER_Y + TRIANGLE_SIZE * 0.289 },
}

function softmax(logits: number[], temperature: number): number[] {
  const scaled = logits.map((l) => l / temperature)
  const maxL = Math.max(...scaled)
  const exps = scaled.map((l) => Math.exp(l - maxL))
  const sum = exps.reduce((a, b) => a + b, 0)
  return exps.map((e) => e / sum)
}

// Convert probabilities (barycentric coords) to 2D point
function toCartesian(probs: number[]): { x: number; y: number } {
  const [pA, pB, pC] = probs
  return {
    x: pA * VERTICES.A.x + pB * VERTICES.B.x + pC * VERTICES.C.x,
    y: pA * VERTICES.A.y + pB * VERTICES.B.y + pC * VERTICES.C.y,
  }
}

export function SoftmaxSimplexViz() {
  const [logitA, setLogitA] = useState(1.5)
  const [logitB, setLogitB] = useState(0.5)
  const [logitC, setLogitC] = useState(-0.5)
  const [temperature, setTemperature] = useState(1.0)
  const [trail, setTrail] = useState<{ x: number; y: number }[]>([])

  const probs = useMemo(
    () => softmax([logitA, logitB, logitC], temperature),
    [logitA, logitB, logitC, temperature]
  )

  const point = useMemo(() => toCartesian(probs), [probs])

  // Add to trail when point changes significantly
  const addToTrail = (newPoint: { x: number; y: number }) => {
    setTrail((prev) => {
      const last = prev[prev.length - 1]
      if (!last || Math.hypot(newPoint.x - last.x, newPoint.y - last.y) > 5) {
        return [...prev.slice(-20), newPoint]
      }
      return prev
    })
  }

  const handleSliderChange = (setter: (v: number) => void) => (v: number) => {
    setter(v)
    setTimeout(() => addToTrail(toCartesian(softmax([logitA, logitB, logitC], temperature))), 0)
  }

  const trianglePath = `M ${VERTICES.A.x} ${VERTICES.A.y} L ${VERTICES.B.x} ${VERTICES.B.y} L ${VERTICES.C.x} ${VERTICES.C.y} Z`

  // Grid lines for the simplex - all 3 directions
  const gridLines = []
  for (let i = 1; i < 5; i++) {
    const t = i / 5
    // Lines parallel to BC (horizontal-ish)
    gridLines.push(
      <line
        key={`gridBC${i}`}
        x1={VERTICES.A.x * (1 - t) + VERTICES.B.x * t}
        y1={VERTICES.A.y * (1 - t) + VERTICES.B.y * t}
        x2={VERTICES.A.x * (1 - t) + VERTICES.C.x * t}
        y2={VERTICES.A.y * (1 - t) + VERTICES.C.y * t}
        className={styles.gridLine}
      />
    )
    // Lines parallel to AC
    gridLines.push(
      <line
        key={`gridAC${i}`}
        x1={VERTICES.B.x * (1 - t) + VERTICES.A.x * t}
        y1={VERTICES.B.y * (1 - t) + VERTICES.A.y * t}
        x2={VERTICES.B.x * (1 - t) + VERTICES.C.x * t}
        y2={VERTICES.B.y * (1 - t) + VERTICES.C.y * t}
        className={styles.gridLine}
      />
    )
    // Lines parallel to AB
    gridLines.push(
      <line
        key={`gridAB${i}`}
        x1={VERTICES.C.x * (1 - t) + VERTICES.A.x * t}
        y1={VERTICES.C.y * (1 - t) + VERTICES.A.y * t}
        x2={VERTICES.C.x * (1 - t) + VERTICES.B.x * t}
        y2={VERTICES.C.y * (1 - t) + VERTICES.B.y * t}
        className={styles.gridLine}
      />
    )
  }

  return (
    <VizCard
      title="The Probability Simplex"
      subtitle="Visualizing the space of probability distributions"
      figNum="Fig. 2.5"
    >
      <div className={styles.content}>
          <div className={styles.sliderPanel}>
            <div className={styles.scenario}>
              After seeing <strong>"th"</strong>, the model predicts...
            </div>

            <div className={styles.sliderGroup}>
              <label className={styles.sliderLabel} htmlFor="logitA">
                <span className={styles.logitName} style={{ color: 'var(--accent-cyan)' }}>
                  score('{CHARS[0]}')
                </span>
                <span className={styles.logitValue}>{logitA.toFixed(1)}</span>
              </label>
              <Slider
                id="logitA"
                wrap={false}
                min={-3}
                max={3}
                step={0.1}
                value={logitA}
                onValueChange={handleSliderChange(setLogitA)}
                ariaLabel={`Score for character ${CHARS[0]}`}
              />
            </div>

            <div className={styles.sliderGroup}>
              <label className={styles.sliderLabel} htmlFor="logitB">
                <span className={styles.logitName} style={{ color: 'var(--accent-magenta)' }}>
                  score('{CHARS[1]}')
                </span>
                <span className={styles.logitValue}>{logitB.toFixed(1)}</span>
              </label>
              <Slider
                id="logitB"
                wrap={false}
                min={-3}
                max={3}
                step={0.1}
                value={logitB}
                onValueChange={handleSliderChange(setLogitB)}
                ariaLabel={`Score for character ${CHARS[1]}`}
              />
            </div>

            <div className={styles.sliderGroup}>
              <label className={styles.sliderLabel} htmlFor="logitC">
                <span className={styles.logitName} style={{ color: 'var(--accent-yellow)' }}>
                  score('{CHARS[2]}')
                </span>
                <span className={styles.logitValue}>{logitC.toFixed(1)}</span>
              </label>
              <Slider
                id="logitC"
                wrap={false}
                min={-3}
                max={3}
                step={0.1}
                value={logitC}
                onValueChange={handleSliderChange(setLogitC)}
                ariaLabel={`Score for character ${CHARS[2]}`}
              />
            </div>

            <div className={styles.sliderGroup}>
              <label className={styles.sliderLabel} htmlFor="temperature">
                <span className={styles.logitName}>Temperature</span>
                <span className={styles.logitValue}>{temperature.toFixed(1)}</span>
              </label>
              <Slider
                id="temperature"
                wrap={false}
                min={0.1}
                max={5}
                step={0.1}
                value={temperature}
                onValueChange={handleSliderChange(setTemperature)}
                ariaLabel="Temperature parameter"
              />
            </div>

            <div className={styles.probDisplay}>
              <div className={styles.probRow}>
                <span style={{ color: 'var(--accent-cyan)' }}>P('{CHARS[0]}')</span>
                <span>{(probs[0] * 100).toFixed(1)}%</span>
              </div>
              <div className={styles.probRow}>
                <span style={{ color: 'var(--accent-magenta)' }}>P('{CHARS[1]}')</span>
                <span>{(probs[1] * 100).toFixed(1)}%</span>
              </div>
              <div className={styles.probRow}>
                <span style={{ color: 'var(--accent-yellow)' }}>P('{CHARS[2]}')</span>
                <span>{(probs[2] * 100).toFixed(1)}%</span>
              </div>
            </div>

            <button
              className={styles.clearBtn}
              type="button"
              onClick={() => setTrail([])}
              aria-label="Clear trail"
            >
              Clear Trail
            </button>
          </div>

          <div className={styles.vizPanel}>
            <svg
              viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
              className={styles.svg}
              role="img"
              aria-label="Probability simplex visualization showing distribution across three characters"
            >
              <defs>
                <linearGradient id="pointGradient" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="rgba(0, 217, 255, 0.95)" />
                  <stop offset="100%" stopColor="rgba(0, 217, 255, 0.7)" />
                </linearGradient>
              </defs>

              {/* Triangle fill */}
              <path d={trianglePath} className={styles.triangleFill} />

              {/* Grid lines */}
              {gridLines}

              {/* Triangle outline */}
              <path d={trianglePath} className={styles.triangleOutline} />

              {/* Vertex labels */}
              <text x={VERTICES.A.x} y={VERTICES.A.y - 15} className={styles.vertexLabel} style={{ fill: 'var(--accent-cyan)' }}>
                100% '{CHARS[0]}'
              </text>
              <text x={VERTICES.B.x - 40} y={VERTICES.B.y + 20} className={styles.vertexLabel} style={{ fill: 'var(--accent-magenta)' }}>
                100% '{CHARS[1]}'
              </text>
              <text x={VERTICES.C.x + 40} y={VERTICES.C.y + 20} className={styles.vertexLabel} style={{ fill: 'var(--accent-yellow)' }}>
                100% '{CHARS[2]}'
              </text>

              {/* Center label */}
              <text x={CENTER_X} y={CENTER_Y + 5} className={styles.centerLabel}>
                uniform
              </text>

              {/* Trail */}
              {trail.length > 1 && (
                <polyline
                  points={trail.map((p) => `${p.x},${p.y}`).join(' ')}
                  className={styles.trail}
                />
              )}

              {/* Current point glow */}
              <circle cx={point.x} cy={point.y} r="15" className={styles.pointGlow} />

              {/* Current point */}
              <circle cx={point.x} cy={point.y} r="8" className={styles.point} />
            </svg>
          </div>
        </div>

        <div className={styles.explanation}>
          {temperature < 0.5 && (
            <>
              <strong>Cold model (T={temperature.toFixed(1)}):</strong> Probability mass concentrates on the highest-scoring token.
              Like a cold gas — particles settle into the lowest-energy state.
            </>
          )}
          {temperature >= 0.5 && temperature <= 2 && (
            <>
              <strong>Normal temperature (T={temperature.toFixed(1)}):</strong> The distribution reflects the score differences.
              This is what the model "actually believes" based on training.
            </>
          )}
          {temperature > 2 && (
            <>
              <strong>Hot model (T={temperature.toFixed(1)}):</strong> Probability spreads toward uniform.
              Like a hot gas — particles explore all states, ignoring energy differences.
            </>
          )}
        </div>
    </VizCard>
  )
}
