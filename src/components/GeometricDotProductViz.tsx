import { useState, useMemo } from 'react'
import { VizCard } from './VizCard'
import styles from './GeometricDotProductViz.module.css'

const WIDTH = 400
const HEIGHT = 400
const CENTER_X = WIDTH / 2
const CENTER_Y = HEIGHT / 2
const SCALE = 50 // pixels per unit

interface Vector {
  x: number
  y: number
}

function dotProduct(a: Vector, b: Vector): number {
  return a.x * b.x + a.y * b.y
}

function magnitude(v: Vector): number {
  return Math.sqrt(v.x * v.x + v.y * v.y)
}

function normalize(v: Vector): Vector {
  const mag = magnitude(v)
  if (mag === 0) return { x: 0, y: 0 }
  return { x: v.x / mag, y: v.y / mag }
}

function project(a: Vector, b: Vector): Vector {
  const bNorm = normalize(b)
  const projLength = dotProduct(a, bNorm)
  return { x: bNorm.x * projLength, y: bNorm.y * projLength }
}

function toScreen(v: Vector): { x: number; y: number } {
  return {
    x: CENTER_X + v.x * SCALE,
    y: CENTER_Y - v.y * SCALE, // flip y for screen coords
  }
}

function fromScreen(screenX: number, screenY: number): Vector {
  return {
    x: (screenX - CENTER_X) / SCALE,
    y: -(screenY - CENTER_Y) / SCALE,
  }
}

function angle(v: Vector): number {
  return Math.atan2(v.y, v.x)
}

function angleBetween(a: Vector, b: Vector): number {
  const dot = dotProduct(a, b)
  const magProduct = magnitude(a) * magnitude(b)
  if (magProduct === 0) return 0
  return Math.acos(Math.max(-1, Math.min(1, dot / magProduct)))
}

export function GeometricDotProductViz() {
  const [vecA, setVecA] = useState<Vector>({ x: 2.5, y: 1.5 })
  const [vecB, setVecB] = useState<Vector>({ x: 3, y: -0.5 })
  const [dragging, setDragging] = useState<'A' | 'B' | null>(null)
  const [showProjection, setShowProjection] = useState(true)
  const [keyboardFocus, setKeyboardFocus] = useState<'A' | 'B' | null>(null)

  const computed = useMemo(() => {
    const dot = dotProduct(vecA, vecB)
    const magA = magnitude(vecA)
    const magB = magnitude(vecB)
    const proj = project(vecA, vecB)
    const projLength = magnitude(proj) * (dotProduct(vecA, vecB) >= 0 ? 1 : -1)
    const angleDeg = (angleBetween(vecA, vecB) * 180) / Math.PI

    return { dot, magA, magB, proj, projLength, angleDeg }
  }, [vecA, vecB])

  const handleMouseDown = (vec: 'A' | 'B') => (e: React.MouseEvent) => {
    e.preventDefault()
    setDragging(vec)
  }

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!dragging) return
    const svg = e.currentTarget
    const rect = svg.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const vec = fromScreen(x, y)

    // Clamp to reasonable bounds
    const clamped = {
      x: Math.max(-3.5, Math.min(3.5, vec.x)),
      y: Math.max(-3.5, Math.min(3.5, vec.y)),
    }

    if (dragging === 'A') setVecA(clamped)
    else setVecB(clamped)
  }

  const handleMouseUp = () => setDragging(null)

  const handleKeyDown = (vec: 'A' | 'B') => (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 0.5 : 0.1
    const current = vec === 'A' ? vecA : vecB
    const setter = vec === 'A' ? setVecA : setVecB

    let newVec = { ...current }
    let handled = true

    switch (e.key) {
      case 'ArrowLeft':
        newVec.x = Math.max(-3.5, current.x - step)
        break
      case 'ArrowRight':
        newVec.x = Math.min(3.5, current.x + step)
        break
      case 'ArrowUp':
        newVec.y = Math.min(3.5, current.y + step)
        break
      case 'ArrowDown':
        newVec.y = Math.max(-3.5, current.y - step)
        break
      default:
        handled = false
    }

    if (handled) {
      e.preventDefault()
      setter(newVec)
    }
  }

  const handleTouchStart = (vec: 'A' | 'B') => (e: React.TouchEvent) => {
    e.preventDefault()
    setDragging(vec)
  }

  const handleTouchMove = (e: React.TouchEvent<SVGSVGElement>) => {
    if (!dragging) return
    const svg = e.currentTarget
    const rect = svg.getBoundingClientRect()
    const touch = e.touches[0]
    const x = touch.clientX - rect.left
    const y = touch.clientY - rect.top
    const vec = fromScreen(x, y)

    const clamped = {
      x: Math.max(-3.5, Math.min(3.5, vec.x)),
      y: Math.max(-3.5, Math.min(3.5, vec.y)),
    }

    if (dragging === 'A') setVecA(clamped)
    else setVecB(clamped)
  }

  const handleTouchEnd = () => setDragging(null)

  const screenA = toScreen(vecA)
  const screenB = toScreen(vecB)
  const screenProj = toScreen(computed.proj)
  const origin = toScreen({ x: 0, y: 0 })

  // Arc for angle visualization
  const arcRadius = 30
  const angleA = angle(vecA)
  const angleB = angle(vecB)
  const startAngle = Math.min(angleA, angleB)
  const endAngle = Math.max(angleA, angleB)

  const arcStartX = origin.x + arcRadius * Math.cos(-startAngle)
  const arcStartY = origin.y + arcRadius * Math.sin(-startAngle)
  const arcEndX = origin.x + arcRadius * Math.cos(-endAngle)
  const arcEndY = origin.y + arcRadius * Math.sin(-endAngle)
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0

  const isPositive = computed.dot >= 0

  return (
    <VizCard title="Dot Product: The Geometric View" figNum="Fig. 2.4">
      <div className={styles.content}>
          <div className={styles.vizPanel}>
            <svg
              viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
              className={styles.svg}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              role="img"
              aria-label="Interactive geometric dot product visualization with draggable vectors"
            >
              <defs>
                <linearGradient id="vectorAGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="rgba(0,217,255,0.1)" />
                  <stop offset="50%" stopColor="rgba(0,217,255,0.95)" />
                  <stop offset="100%" stopColor="rgba(0,217,255,0.1)" />
                </linearGradient>
                <linearGradient id="vectorBGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="rgba(255,0,110,0.1)" />
                  <stop offset="50%" stopColor="rgba(255,0,110,0.95)" />
                  <stop offset="100%" stopColor="rgba(255,0,110,0.1)" />
                </linearGradient>
                <linearGradient id="projectionGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="rgba(255,214,10,0.2)" />
                  <stop offset="45%" stopColor="rgba(255,214,10,0.95)" />
                  <stop offset="100%" stopColor="rgba(255,214,10,0.35)" />
                </linearGradient>
                <marker
                  id="arrowA"
                  markerWidth="10"
                  markerHeight="10"
                  refX="9"
                  refY="3"
                  orient="auto"
                  markerUnits="strokeWidth"
                >
                  <path d="M0,0 L0,6 L9,3 z" fill="rgba(0,217,255,0.95)" />
                </marker>
                <marker
                  id="arrowB"
                  markerWidth="10"
                  markerHeight="10"
                  refX="9"
                  refY="3"
                  orient="auto"
                  markerUnits="strokeWidth"
                >
                  <path d="M0,0 L0,6 L9,3 z" fill="rgba(255,0,110,0.95)" />
                </marker>
              </defs>

              {/* Grid */}
              {[-3, -2, -1, 1, 2, 3].map((i) => (
                <g key={i}>
                  <line
                    x1={CENTER_X + i * SCALE}
                    y1={0}
                    x2={CENTER_X + i * SCALE}
                    y2={HEIGHT}
                    className={styles.gridLine}
                  />
                  <line
                    x1={0}
                    y1={CENTER_Y + i * SCALE}
                    x2={WIDTH}
                    y2={CENTER_Y + i * SCALE}
                    className={styles.gridLine}
                  />
                </g>
              ))}

              {/* Axes */}
              <line x1={0} y1={CENTER_Y} x2={WIDTH} y2={CENTER_Y} className={styles.axis} />
              <line x1={CENTER_X} y1={0} x2={CENTER_X} y2={HEIGHT} className={styles.axis} />

              {/* Projection visualization */}
              {showProjection && (
                <>
                  {/* Projection line (shadow) on B */}
                  <line
                    x1={origin.x}
                    y1={origin.y}
                    x2={screenProj.x}
                    y2={screenProj.y}
                    className={styles.projectionLine}
                    stroke="url(#projectionGradient)"
                  />
                  {/* Perpendicular dashed line from A to projection point */}
                  <line
                    x1={screenA.x}
                    y1={screenA.y}
                    x2={screenProj.x}
                    y2={screenProj.y}
                    className={styles.perpLine}
                  />
                  {/* Projection point glow */}
                  <circle cx={screenProj.x} cy={screenProj.y} r="12" className={styles.projPointGlow} />
                  {/* Projection point */}
                  <circle cx={screenProj.x} cy={screenProj.y} r="5" className={styles.projPoint} />
                </>
              )}

              {/* Angle arc */}
              <path
                d={`M ${arcStartX} ${arcStartY} A ${arcRadius} ${arcRadius} 0 ${largeArc} 1 ${arcEndX} ${arcEndY}`}
                className={isPositive ? styles.arcPositive : styles.arcNegative}
              />

              {/* Vector B (magenta) */}
              <line
                x1={origin.x}
                y1={origin.y}
                x2={screenB.x}
                y2={screenB.y}
                className={styles.vectorB}
                stroke="url(#vectorBGradient)"
                markerEnd="url(#arrowB)"
              />

              {/* Vector A (cyan) */}
              <line
                x1={origin.x}
                y1={origin.y}
                x2={screenA.x}
                y2={screenA.y}
                className={styles.vectorA}
                stroke="url(#vectorAGradient)"
                markerEnd="url(#arrowA)"
              />

              {/* Draggable handles */}
              <circle
                cx={screenA.x}
                cy={screenA.y}
                r="12"
                className={`${styles.handle} ${dragging === 'A' ? styles.dragging : ''} ${keyboardFocus === 'A' ? styles.focused : ''}`}
                onMouseDown={handleMouseDown('A')}
                onTouchStart={handleTouchStart('A')}
                tabIndex={0}
                role="button"
                aria-label="Vector A handle. Use arrow keys to move, hold shift for larger steps."
                onKeyDown={handleKeyDown('A')}
                onFocus={() => setKeyboardFocus('A')}
                onBlur={() => setKeyboardFocus(null)}
              />
              <circle
                cx={screenB.x}
                cy={screenB.y}
                r="12"
                className={`${styles.handle} ${styles.handleB} ${dragging === 'B' ? styles.dragging : ''} ${keyboardFocus === 'B' ? styles.focused : ''}`}
                onMouseDown={handleMouseDown('B')}
                onTouchStart={handleTouchStart('B')}
                tabIndex={0}
                role="button"
                aria-label="Vector B handle. Use arrow keys to move, hold shift for larger steps."
                onKeyDown={handleKeyDown('B')}
                onFocus={() => setKeyboardFocus('B')}
                onBlur={() => setKeyboardFocus(null)}
              />

              {/* Labels */}
              <text x={screenA.x + 15} y={screenA.y - 10} className={styles.labelA}>
                A
              </text>
              <text x={screenB.x + 15} y={screenB.y - 10} className={styles.labelB}>
                B
              </text>
            </svg>
          </div>

          <div className={styles.infoPanel}>
            <div className={styles.resultBox}>
              <div className={styles.resultLabel}>Dot Product</div>
              <div className={`${styles.resultValue} ${isPositive ? styles.positive : styles.negative}`}>
                {computed.dot.toFixed(2)}
              </div>
            </div>

            <div className={styles.breakdown}>
              <div className={styles.breakdownRow}>
                <span className={styles.breakdownLabel}>|A|</span>
                <span className={styles.breakdownValue}>{computed.magA.toFixed(2)}</span>
              </div>
              <div className={styles.breakdownRow}>
                <span className={styles.breakdownLabel}>|B|</span>
                <span className={styles.breakdownValue}>{computed.magB.toFixed(2)}</span>
              </div>
              <div className={styles.breakdownRow}>
                <span className={styles.breakdownLabel}>Angle</span>
                <span className={styles.breakdownValue}>{computed.angleDeg.toFixed(0)}°</span>
              </div>
              <div className={styles.breakdownRow}>
                <span className={styles.breakdownLabel}>Projection of A onto B</span>
                <span className={styles.breakdownValue}>{computed.projLength.toFixed(2)}</span>
              </div>
            </div>

            <div className={styles.formula}>
              A · B = |A| × |B| × cos(θ)
              <br />
              <span className={styles.formulaValues}>
                {computed.dot.toFixed(2)} = {computed.magA.toFixed(2)} × {computed.magB.toFixed(2)} ×{' '}
                {Math.cos((computed.angleDeg * Math.PI) / 180).toFixed(2)}
              </span>
            </div>

            <label className={styles.toggle} htmlFor="show-projection-toggle">
              <input
                id="show-projection-toggle"
                type="checkbox"
                checked={showProjection}
                onChange={(e) => setShowProjection(e.target.checked)}
                aria-label="Toggle projection visualization"
              />
              <span>Show projection (shadow)</span>
            </label>

            <div className={styles.insight}>
              {isPositive ? (
                <>
                  <span className={styles.insightIcon}>↗</span>
                  <span>Vectors point in similar directions (angle &lt; 90°)</span>
                </>
              ) : (
                <>
                  <span className={styles.insightIcon}>↙</span>
                  <span>Vectors point in opposite directions (angle &gt; 90°)</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className={styles.explanation}>
          Drag the arrow tips to explore. The dot product measures <strong>alignment</strong>: how much one vector
          points in the direction of another.
        </div>
    </VizCard>
  )
}
