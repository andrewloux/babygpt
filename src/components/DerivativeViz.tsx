import { useMemo, useState } from 'react'

import { Slider } from './Slider'
import { VizCard } from './VizCard'
import styles from './DerivativeViz.module.css'

function clamp(x: number, min: number, max: number) {
  return Math.max(min, Math.min(max, x))
}

function f(x: number) {
  return x * x
}

function fp(x: number) {
  return 2 * x
}

export function DerivativeViz() {
  const [x, setX] = useState(1.4)
  const [showSecant, setShowSecant] = useState(true)
  const [dx, setDx] = useState(0.8)

  const safeX = clamp(x, -2.5, 2.5)
  const safeDx = clamp(dx, 0.1, 2.0)

  const y = f(safeX)
  const slope = fp(safeX)

  const x2 = safeX + safeDx
  const y2 = f(x2)
  const secantSlope = (y2 - y) / safeDx

  const view = useMemo(() => {
    const W = 520
    const H = 260
    const padL = 44
    const padR = 16
    const padT = 18
    const padB = 34

    const minX = -2.5
    const maxX = 2.5
    const minY = -0.5
    const maxY = 6.5

    const sx = (vx: number) => padL + ((vx - minX) / (maxX - minX)) * (W - padL - padR)
    const sy = (vy: number) => padT + (1 - (vy - minY) / (maxY - minY)) * (H - padT - padB)

    const xAxisY = sy(0)
    const yAxisX = sx(0)

    const pts: [number, number][] = []
    const N = 80
    for (let i = 0; i <= N; i++) {
      const vx = minX + (i / N) * (maxX - minX)
      pts.push([sx(vx), sy(f(vx))])
    }

    const curve = pts.map((p) => p.join(',')).join(' ')

    const px = sx(safeX)
    const py = sy(y)

    const p2x = sx(x2)
    const p2y = sy(y2)

    const tangentX1 = sx(minX)
    const tangentY1 = sy(y + slope * (minX - safeX))
    const tangentX2 = sx(maxX)
    const tangentY2 = sy(y + slope * (maxX - safeX))

    const secantX1 = px
    const secantY1 = py
    const secantX2 = p2x
    const secantY2 = p2y

    return {
      W,
      H,
      curve,
      xAxisY,
      yAxisX,
      px,
      py,
      p2x,
      p2y,
      tangentX1,
      tangentY1,
      tangentX2,
      tangentY2,
      secantX1,
      secantY1,
      secantX2,
      secantY2,
    }
  }, [safeX, safeDx, slope, y, x2, y2])

  return (
    <VizCard
      title="Derivative = Slope"
      subtitle="A point, a tangent, and a “wiggle”"
      figNum="Fig. 2.10"
      footer={
        <div className={styles.footer}>
          The derivative at <strong>x</strong> is the slope of the tangent line there. Finite differences (the secant) are the same idea with a non‑zero wiggle <strong>Δx</strong>.
        </div>
      }
    >
      <div className={styles.layout}>
        <div className={`${styles.chart} panel-dark inset-box`}>
          <svg
            className={styles.svg}
            viewBox={`0 0 ${view.W} ${view.H}`}
            role="img"
            aria-label="A parabola with a point and a tangent line showing slope"
          >
            <defs>
              <marker id="axisArrow" markerWidth="10" markerHeight="10" refX="6" refY="3" orient="auto" markerUnits="strokeWidth">
                <path d="M0,0 L6,3 L0,6 Z" fill="rgba(255,255,255,0.35)" />
              </marker>
            </defs>

            <line className={styles.axis} x1={44} y1={view.xAxisY} x2={504} y2={view.xAxisY} markerEnd="url(#axisArrow)" />
            <line className={styles.axis} x1={view.yAxisX} y1={226} x2={view.yAxisX} y2={22} markerEnd="url(#axisArrow)" />

            <polyline className={styles.curve} points={view.curve} />

            <line className={styles.tangent} x1={view.tangentX1} y1={view.tangentY1} x2={view.tangentX2} y2={view.tangentY2} />

            {showSecant ? (
              <>
                <line className={styles.secant} x1={view.secantX1} y1={view.secantY1} x2={view.secantX2} y2={view.secantY2} />
                <circle className={styles.point2} cx={view.p2x} cy={view.p2y} r={5} />
              </>
            ) : null}

            <circle className={styles.point} cx={view.px} cy={view.py} r={6} />
            <text className={styles.label} x={view.px + 10} y={view.py - 10}>
              (x, L(x))
            </text>
          </svg>
        </div>

        <div className={styles.controls}>
          <div className={`${styles.panel} panel-dark inset-box`}>
            <div className={styles.panelTitle}>Pick a point</div>
            <div className={styles.row}>
              <div className={styles.key}>x</div>
              <div className={styles.val}>{safeX.toFixed(2)}</div>
            </div>
            <Slider wrap={false} min={-2.5} max={2.5} step={0.01} value={x} onValueChange={setX} ariaLabel="x position" />
            <div className={styles.row}>
              <div className={styles.key}>L(x)</div>
              <div className={styles.val}>{y.toFixed(2)}</div>
            </div>
            <div className={styles.row}>
              <div className={styles.key}>Slope</div>
              <div className={styles.valEmph}>{slope.toFixed(2)}</div>
            </div>
          </div>

          <div className={`${styles.panel} panel-dark inset-box`}>
            <label className={styles.toggle}>
              <input type="checkbox" checked={showSecant} onChange={(e) => setShowSecant(e.target.checked)} />
              <span>Show finite difference (secant)</span>
            </label>

            {showSecant ? (
              <>
                <div className={styles.row}>
                  <div className={styles.key}>Δx</div>
                  <div className={styles.val}>{safeDx.toFixed(2)}</div>
                </div>
                <Slider wrap={false} min={0.1} max={2.0} step={0.01} value={dx} onValueChange={setDx} ariaLabel="delta x" />
                <div className={styles.row}>
                  <div className={styles.key}>Secant</div>
                  <div className={styles.val}>{secantSlope.toFixed(2)}</div>
                </div>
                <div className={styles.hint}>Shrink Δx and watch the secant slope approach the tangent slope.</div>
              </>
            ) : (
              <div className={styles.hint}>The tangent slope is the derivative: “how fast the loss changes if I nudge x.”</div>
            )}
          </div>
        </div>
      </div>
    </VizCard>
  )
}

