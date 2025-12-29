import { useRef, useState, type MouseEvent } from 'react'

import { VizCard } from './VizCard'
import styles from './ColorSpaceViz.module.css'

type HoverPos = { x: number; y: number }

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function labelFor(pos: HoverPos): string {
  if (pos.x > 80 && pos.y < 20) return 'Pure Red'
  if (pos.y > 80 && pos.x < 20) return 'Pure Yellow'
  if (Math.abs(pos.x - pos.y) < 15) return 'Orange-ish'
  return pos.x > pos.y ? 'Reddish Orange' : 'Yellowish Orange'
}

export function ColorSpaceViz() {
  const [hoverPos, setHoverPos] = useState<HoverPos | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)

  const SIZE = 320
  const PADDING = 40
  const MAX_VAL = 100

  const scale = (val: number) => (val / MAX_VAL) * SIZE

  const vectors = [
    { label: 'Pure Red', r: 100, y: 0, color: 'rgb(255, 60, 60)' },
    { label: 'Orange', r: 50, y: 50, color: 'rgb(255, 160, 20)' },
  ]

  const getCoords = (r: number, y: number) => ({
    x: PADDING + scale(r),
    y: PADDING + SIZE - scale(y),
  })

  // Color math (simplified, but faithful enough for intuition):
  // - Red axis contributes to Red channel.
  // - Yellow axis contributes to both Red and Green (since “yellow light” is red+green).
  const getColor = (r: number, y: number) => {
    const rInput = (r / 100) * 255
    const yInput = (y / 100) * 255

    const totalR = Math.min(255, rInput + yInput)
    const totalG = Math.min(255, yInput)
    const totalB = 0

    return `rgb(${Math.round(totalR)}, ${Math.round(totalG)}, ${totalB})`
  }

  const handleMouseMove = (e: MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const rawX = e.clientX - rect.left - PADDING
    const rawY = rect.bottom - PADDING - e.clientY

    const xVal = clamp((rawX / SIZE) * MAX_VAL, 0, MAX_VAL)
    const yVal = clamp((rawY / SIZE) * MAX_VAL, 0, MAX_VAL)

    setHoverPos({ x: xVal, y: yVal })
  }

  const handleMouseLeave = () => setHoverPos(null)

  const activeColor = hoverPos ? getColor(hoverPos.x, hoverPos.y) : 'transparent'
  const origin = getCoords(0, 0)
  const activePoint = hoverPos ? getCoords(hoverPos.x, hoverPos.y) : origin

  return (
    <VizCard
      title="Color as Coordinates"
      subtitle="A tiny 2D vector space"
      footer={<div className={styles.footerText}>Move in the square. You’re choosing (Red, Yellow) coordinates.</div>}
    >
      <div className={styles.container}>
        <div className={`${styles.vizWrapper} inset-box`}>
          <svg
            ref={svgRef}
            width={SIZE + PADDING * 2}
            height={SIZE + PADDING * 2}
            className={styles.canvas}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <defs>
              <marker id="arrowEnd" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                <path d="M0,0 L0,6 L9,3 z" fill="rgba(255, 255, 255, 0.55)" />
              </marker>
            </defs>

            <line
              x1={PADDING}
              y1={PADDING + SIZE}
              x2={PADDING + SIZE + 10}
              y2={PADDING + SIZE}
              className={styles.axisLine}
              markerEnd="url(#arrowEnd)"
            />
            <line
              x1={PADDING}
              y1={PADDING + SIZE}
              x2={PADDING}
              y2={PADDING - 10}
              className={styles.axisLine}
              markerEnd="url(#arrowEnd)"
            />

            <text x={PADDING + SIZE} y={PADDING + SIZE + 24} className={styles.axisLabel} textAnchor="end">
              Red
            </text>
            <text
              x={10}
              y={PADDING}
              className={styles.axisLabel}
              style={{
                writingMode: 'vertical-rl',
                transform: 'rotate(180deg)',
                transformOrigin: `10px ${PADDING}px`,
              }}
            >
              Yellow
            </text>

            {vectors.map((v) => {
              const end = getCoords(v.r, v.y)
              return (
                <g key={v.label} style={{ opacity: hoverPos ? 0.28 : 0.6 }}>
                  <line
                    x1={origin.x}
                    y1={origin.y}
                    x2={end.x}
                    y2={end.y}
                    stroke={v.color}
                    strokeWidth="2"
                    strokeDasharray="4 4"
                    className={styles.staticVectorLine}
                  />
                  <circle cx={end.x} cy={end.y} r={4} fill={v.color} className={styles.staticVectorDot} />
                </g>
              )
            })}

            {hoverPos && (
              <g>
                <line
                  x1={origin.x}
                  y1={origin.y}
                  x2={activePoint.x}
                  y2={activePoint.y}
                  stroke={activeColor}
                  strokeWidth="4"
                  className={styles.activeVectorLine}
                />

                <g className={styles.handleGroup} style={{ transform: `translate(${activePoint.x}px, ${activePoint.y}px)` }}>
                  <circle r="12" className={styles.handleRing} />
                  <circle r="8" fill={activeColor} className={styles.handleColor} />
                </g>
              </g>
            )}
          </svg>

          {hoverPos && (
            <div
              className={styles.infoCard}
              style={{
                left: activePoint.x + 20,
                top: activePoint.y - 40,
              }}
            >
              <div className={styles.colorName}>
                <span className={styles.colorSwatch} style={{ background: activeColor }} aria-hidden="true" />
                {labelFor(hoverPos)}
              </div>
              <div className={styles.colorValues}>
                <span>R: {hoverPos.x.toFixed(0)}</span>
                <span>Y: {hoverPos.y.toFixed(0)}</span>
              </div>
            </div>
          )}
        </div>

        <div className={styles.legend}>
          {vectors.map((v) => (
            <div key={v.label} className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: v.color }} aria-hidden="true" />
              {v.label}
            </div>
          ))}
          <div className={styles.legendItem}>
            <span className={styles.legendDotOutline} aria-hidden="true" />
            Move cursor to mix
          </div>
        </div>
      </div>
    </VizCard>
  )
}
