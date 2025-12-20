import { useState } from 'react'
import styles from './GradientDescentViz.module.css'

const LOSS_FN = (w: number) => 0.5 * w * w
const DERIVATIVE = (w: number) => w

const X_MIN = -3
const X_MAX = 3
const Y_MAX = 5

const WIDTH = 520
const HEIGHT = 250

export function GradientDescentViz() {
  const [w, setW] = useState(-2.5)
  const [eta, setEta] = useState(0.8)
  const [stepCount, setStepCount] = useState(0)
  const [isDone, setIsDone] = useState(false)

  const toSvgX = (x: number) => ((x - X_MIN) / (X_MAX - X_MIN)) * WIDTH
  const toSvgY = (y: number) => HEIGHT - (y / Y_MAX) * (HEIGHT - 22) - 22

  const pathData = (() => {
    let d = `M ${toSvgX(X_MIN)} ${toSvgY(LOSS_FN(X_MIN))}`
    for (let x = X_MIN + 0.08; x <= X_MAX; x += 0.08) {
      d += ` L ${toSvgX(x)} ${toSvgY(LOSS_FN(x))}`
    }
    return d
  })()

  const currentLoss = LOSS_FN(w)
  const currentSlope = DERIVATIVE(w)
  const stepSize = eta * currentSlope
  const nextW = w - stepSize

  const tangentX1 = w - 0.8
  const tangentY1 = currentLoss - 0.8 * currentSlope
  const tangentX2 = w + 0.8
  const tangentY2 = currentLoss + 0.8 * currentSlope

  function takeStep() {
    if (Math.abs(currentSlope) < 0.01) {
      setIsDone(true)
      return
    }
    setW(nextW)
    setStepCount((c) => c + 1)
  }

  function reset() {
    setW(-2.5)
    setStepCount(0)
    setIsDone(false)
  }

  return (
    <div className={styles.container}>
      <div className={styles.ambientGlow} />
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.headerText}>
            <h3 className={styles.title}>Gradient Descent</h3>
            <p className={styles.subtitle}>Use the slope to decide which way is “down”</p>
          </div>
          <span className={styles.figNum}>Fig. 2.4</span>
        </div>

        <div className={styles.graphContainer}>
          <svg className={styles.curveSvg} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="Loss curve with tangent and step">
            <defs>
              <linearGradient id="lossGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="rgba(255,255,255,0.12)" />
                <stop offset="50%" stopColor="rgba(255,255,255,0.26)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0.12)" />
              </linearGradient>
              <linearGradient id="tangentGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="rgba(0,217,255,0.1)" />
                <stop offset="50%" stopColor="rgba(0,217,255,0.95)" />
                <stop offset="100%" stopColor="rgba(0,217,255,0.1)" />
              </linearGradient>
              <linearGradient id="stepGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="rgba(255,214,10,0.2)" />
                <stop offset="45%" stopColor="rgba(255,214,10,0.95)" />
                <stop offset="100%" stopColor="rgba(255,214,10,0.35)" />
              </linearGradient>
              <marker id="arrowhead" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto">
                <polygon points="0 0, 10 4, 0 8" fill="rgba(255,214,10,0.95)" />
              </marker>
            </defs>

            {/* Soft grid */}
            {[1, 2, 3, 4].map((i) => (
              <line
                key={`h-${i}`}
                x1="0"
                y1={toSvgY((i / 5) * Y_MAX)}
                x2={WIDTH}
                y2={toSvgY((i / 5) * Y_MAX)}
                className={styles.gridLine}
              />
            ))}
            {[-2, -1, 0, 1, 2].map((x) => (
              <line
                key={`v-${x}`}
                x1={toSvgX(x)}
                y1="0"
                x2={toSvgX(x)}
                y2={HEIGHT}
                className={styles.gridLine}
              />
            ))}

            {/* X Axis / ground */}
            <line x1="0" y1={HEIGHT - 22} x2={WIDTH} y2={HEIGHT - 22} className={styles.axisLine} />

            {/* Loss curve */}
            <path d={pathData} stroke="url(#lossGradient)" className={styles.lossPath} />

            {/* Tangent line */}
            <line
              x1={toSvgX(tangentX1)}
              y1={toSvgY(tangentY1)}
              x2={toSvgX(tangentX2)}
              y2={toSvgY(tangentY2)}
              stroke="url(#tangentGradient)"
              className={styles.tangentLine}
            />

            {/* Current point glow */}
            <circle cx={toSvgX(w)} cy={toSvgY(currentLoss)} r="15" className={styles.ballGlow} />

            {/* Current point */}
            <circle cx={toSvgX(w)} cy={toSvgY(currentLoss)} r="7.5" className={styles.ball} />

            {/* Step arrow */}
            {!isDone && (
              <line
                x1={toSvgX(w)}
                y1={toSvgY(currentLoss)}
                x2={toSvgX(nextW)}
                y2={toSvgY(LOSS_FN(nextW))}
                stroke="url(#stepGradient)"
                className={styles.stepArrow}
                markerEnd="url(#arrowhead)"
                style={{ opacity: Math.abs(w - nextW) < 0.05 ? 0 : 1 }}
              />
            )}
          </svg>
        </div>

        <div className={styles.explanation}>
          {stepCount === 0 && 'Start here. The goal is to reach the bottom (loss = 0).'}
          {stepCount > 0 && !isDone && 'Stepping down against the slope…'}
          {isDone && 'Converged. The slope is effectively zero.'}
        </div>

        <div className={styles.formulaContainer}>
          <div className={styles.formula}>
            <span className={`${styles.term} ${styles.wTerm}`}>
              w <span className={styles.termName}>Current position</span>
            </span>
            <span className={styles.op}>←</span>
            <span className={`${styles.term} ${styles.wTerm}`}>
              w <span className={styles.termName}>Current position</span>
            </span>
            <span className={styles.op}>−</span>
            <span className={`${styles.term} ${styles.etaTerm}`}>
              η <span className={styles.termName}>Step size ({eta.toFixed(1)})</span>
            </span>
            <span className={styles.op}>·</span>
            <span className={`${styles.term} ${styles.slopeTerm}`}>
              slope <span className={styles.termName}>Steepness ({currentSlope.toFixed(2)})</span>
            </span>
          </div>
        </div>

        <div className={styles.controls}>
          <button className={styles.btn} type="button" onClick={reset}>
            Reset
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
            />
            <span className={styles.etaValue}>{eta.toFixed(1)}</span>
          </div>

          <button
            className={`${styles.btn} ${styles.primaryBtn}`}
            type="button"
            onClick={takeStep}
            disabled={isDone}
          >
            Take step
          </button>
        </div>
      </div>
    </div>
  )
}
