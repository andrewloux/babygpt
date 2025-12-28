import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { Slider } from './Slider'
import { VizCard } from './VizCard'
import styles from './SoftmaxLandscapeViz.module.css'

// Temperature color calculation: T<1 is cyan, T=1 is white, T>1 is magenta
function getTempColorRgb(temperature: number): string {
  if (temperature < 1) {
    return `0, ${Math.round(180 + (1 - temperature) * 75)}, 255` // cyan-ish
  } else if (temperature > 1) {
    return `255, ${Math.round(Math.max(0, 180 - (temperature - 1) * 60))}, ${Math.round(Math.max(100, 255 - (temperature - 1) * 50))}` // magenta-ish
  }
  return '255, 255, 255' // white at T=1
}

const TOKENS = [
  { key: 'e', label: 'e', rgb: '0, 217, 255', accent: 'var(--accent-cyan)' },
  { key: 'a', label: 'a', rgb: '255, 0, 170', accent: 'var(--accent-magenta)' },
  { key: 'i', label: 'i', rgb: '255, 214, 0', accent: 'var(--accent-yellow)' },
] as const

type TokenKey = (typeof TOKENS)[number]['key']

type Cell = {
  i: number
  j: number
  a: number
  b: number
  probs: [number, number, number]
}

type CellCoord = { i: number; j: number }

function clamp(x: number, min: number, max: number) {
  return Math.max(min, Math.min(max, x))
}

function softmax3(a: number, b: number, c: number, temperature: number): [number, number, number] {
  const invT = 1 / temperature
  const sa = a * invT
  const sb = b * invT
  const sc = c * invT

  const m = Math.max(sa, sb, sc)
  const ea = Math.exp(sa - m)
  const eb = Math.exp(sb - m)
  const ec = Math.exp(sc - m)
  const sum = ea + eb + ec

  return [ea / sum, eb / sum, ec / sum]
}

function formatSigned(x: number) {
  if (Math.abs(x) < 1e-9) return '0.0'
  return `${x >= 0 ? '+' : ''}${x.toFixed(1)}`
}

function Prism({
  x,
  yBottom,
  width,
  height,
  depthX,
  depthY,
  dimmed,
  selected,
  hovered,
  topClassName,
  sideClassName,
  faceClassName,
  filter,
  heightRatio,
  entranceDelay,
  showEntrance,
}: {
  x: number
  yBottom: number
  width: number
  height: number
  depthX: number
  depthY: number
  dimmed: boolean
  selected: boolean
  hovered: boolean
  topClassName: string
  sideClassName: string
  faceClassName: string
  filter?: string
  heightRatio: number
  entranceDelay?: number
  showEntrance?: boolean
}) {
  const h = Math.max(0, height)
  const yTop = yBottom - h

  if (h <= 0.1) return null

  const topPoints = [
    [x, yTop],
    [x + depthX, yTop - depthY],
    [x + width + depthX, yTop - depthY],
    [x + width, yTop],
  ]
    .map((p) => p.join(','))
    .join(' ')

  const sidePoints = [
    [x + width, yTop],
    [x + width + depthX, yTop - depthY],
    [x + width + depthX, yBottom - depthY],
    [x + width, yBottom],
  ]
    .map((p) => p.join(','))
    .join(' ')

  // Gradient IDs based on height ratio (cool cyan to warm magenta)
  const gradientId = `prismGrad-${Math.round(heightRatio * 100)}`

  const prismClasses = [
    styles.prism,
    dimmed && styles.prismDim,
    selected && styles.prismSelected,
    hovered && styles.prismHover,
    showEntrance && styles.prismEnter,
  ].filter(Boolean).join(' ')

  return (
    <g
      className={prismClasses}
      filter={filter}
      style={showEntrance && entranceDelay !== undefined ? { ['--entrance-delay' as string]: entranceDelay } : undefined}
    >
      {/* Selected prism base glow */}
      {selected && (
        <ellipse
          className={styles.prismSelectedGlow}
          cx={x + width / 2 + depthX / 2}
          cy={yBottom - depthY / 2 + 2}
          rx={width * 0.8}
          ry={4}
        />
      )}
      <polygon className={topClassName} points={topPoints} style={{ fill: `url(#${gradientId}-top)` }} />
      <polygon className={sideClassName} points={sidePoints} style={{ fill: `url(#${gradientId}-side)` }} />
      <rect className={faceClassName} x={x} y={yTop} width={width} height={h} rx={2} style={{ fill: `url(#${gradientId}-face)` }} />
      {/* Selected prism ring */}
      {selected && (
        <rect
          className={styles.prismSelectedRing}
          x={x - 1}
          y={yTop - 1}
          width={width + 2}
          height={h + 2}
          rx={3}
        />
      )}
    </g>
  )
}

export function SoftmaxLandscapeViz() {
  const GRID = 15
  const RANGE_MIN = -6
  const RANGE_MAX = 6
  const STEP = (RANGE_MAX - RANGE_MIN) / (GRID - 1)

  const BAR_W = 10
  const GAP = 2
  const COL_STEP = BAR_W + GAP
  const MAX_H = 110

  const DEPTH_X_DEFAULT = 10
  const DEPTH_Y_DEFAULT = 7
  const DEPTH_X_MIN = 4
  const DEPTH_X_MAX = 16
  const DEPTH_Y_MIN = 3
  const DEPTH_Y_MAX = 12
  const DRAG_SENSITIVITY = 0.06
  const DRAG_THRESHOLD_PX = 4

  const ROW_PAD_X = 2
  const ROW_PAD_Y = 2

  const ORIGIN_X = 64
  const ORIGIN_Y = 360

  const [selectedToken, setSelectedToken] = useState<TokenKey>('e')
  const selectedIndex = TOKENS.findIndex((t) => t.key === selectedToken)
  const token = TOKENS[Math.max(0, selectedIndex)] ?? TOKENS[0]

  const [temperature, setTemperature] = useState(1.0)
  const safeT = Math.max(0.2, temperature)

  // Track temperature changes for pulse animation
  const [tempPulse, setTempPulse] = useState(false)
  const prevTempRef = useRef(temperature)
  useEffect(() => {
    if (prevTempRef.current !== temperature) {
      setTempPulse(true)
      const timer = setTimeout(() => setTempPulse(false), 200)
      prevTempRef.current = temperature
      return () => clearTimeout(timer)
    }
  }, [temperature])

  // Temperature color for visual feedback
  const tempColorRgb = getTempColorRgb(safeT)

  // Track mount state for entrance animations
  const [hasMounted, setHasMounted] = useState(false)
  useEffect(() => {
    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => setHasMounted(true), 50)
    return () => clearTimeout(timer)
  }, [])

  const [depthX, setDepthX] = useState(DEPTH_X_DEFAULT)
  const [depthY, setDepthY] = useState(DEPTH_Y_DEFAULT)

  const [hoveredCell, setHoveredCell] = useState<CellCoord | null>(null)
  const [selectedCell, setSelectedCell] = useState<CellCoord>(() => ({
    i: Math.floor(GRID / 2),
    j: Math.floor(GRID / 2),
  }))

  // Track focus cell changes for readout flash animation
  const [readoutFlash, setReadoutFlash] = useState(false)
  const prevFocusCellRef = useRef<CellCoord | null>(null)
  useEffect(() => {
    const prevCell = prevFocusCellRef.current
    const currentCell = hoveredCell ?? selectedCell
    if (prevCell && (prevCell.i !== currentCell.i || prevCell.j !== currentCell.j)) {
      setReadoutFlash(true)
      const timer = setTimeout(() => setReadoutFlash(false), 350)
      return () => clearTimeout(timer)
    }
    prevFocusCellRef.current = currentCell
  }, [hoveredCell, selectedCell])

  const [isDragging, setIsDragging] = useState(false)
  const dragState = useRef<{
    pointerId: number
    startClientX: number
    startClientY: number
    startDepthX: number
    startDepthY: number
    pressedCell: CellCoord | null
    dragging: boolean
  } | null>(null)

  const rowShiftX = depthX + ROW_PAD_X
  const rowShiftY = depthY + ROW_PAD_Y

  const rowShiftXMax = DEPTH_X_MAX + ROW_PAD_X

  const rowWidth = GRID * BAR_W + (GRID - 1) * GAP
  const shiftXMax = (GRID - 1) * rowShiftXMax

  const viewW = ORIGIN_X + rowWidth + shiftXMax + DEPTH_X_MAX + 120
  const viewH = ORIGIN_Y + 110

  const grid = useMemo(() => {
    const rows: Cell[][] = []
    for (let j = 0; j < GRID; j++) {
      const b = RANGE_MIN + j * STEP
      const row: Cell[] = []
      for (let i = 0; i < GRID; i++) {
        const a = RANGE_MIN + i * STEP
        row.push({ i, j, a, b, probs: softmax3(a, b, 0, safeT) })
      }
      rows.push(row)
    }
    return rows
  }, [GRID, RANGE_MIN, STEP, safeT])

  const focusCell = useMemo(() => hoveredCell ?? selectedCell, [hoveredCell, selectedCell])
  const focus = grid[focusCell.j]?.[focusCell.i] ?? grid[0]?.[0]

  const handlePointerDown = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    e.preventDefault()

    const target = e.target as Element | null
    const cellEl = target?.closest?.('[data-cell]') as Element | null
    const iAttr = cellEl?.getAttribute('data-i')
    const jAttr = cellEl?.getAttribute('data-j')
    const pressedCell =
      iAttr !== null && jAttr !== null ? { i: Number(iAttr), j: Number(jAttr) } : null

    dragState.current = {
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startDepthX: depthX,
      startDepthY: depthY,
      pressedCell,
      dragging: false,
    }
    e.currentTarget.setPointerCapture(e.pointerId)
  }, [depthX, depthY])

  const handlePointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    const state = dragState.current
    if (!state || state.pointerId !== e.pointerId) return

    const dx = e.clientX - state.startClientX
    const dy = e.clientY - state.startClientY

    if (!state.dragging && Math.abs(dx) + Math.abs(dy) > DRAG_THRESHOLD_PX) {
      state.dragging = true
      state.pressedCell = null
      setHoveredCell(null)
      setIsDragging(true)
    }

    if (!state.dragging) return

    const nextDepthX = clamp(state.startDepthX + dx * DRAG_SENSITIVITY, DEPTH_X_MIN, DEPTH_X_MAX)
    const nextDepthY = clamp(state.startDepthY + -dy * DRAG_SENSITIVITY, DEPTH_Y_MIN, DEPTH_Y_MAX)

    setDepthX(nextDepthX)
    setDepthY(nextDepthY)
  }, [])

  const endDrag = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    const state = dragState.current
    if (!state || state.pointerId !== e.pointerId) return

    if (!state.dragging && state.pressedCell) {
      setSelectedCell(state.pressedCell)
    }

    dragState.current = null
    setIsDragging(false)
  }, [])

  const plane = useMemo(() => {
    const x0 = ORIGIN_X
    const y0 = ORIGIN_Y
    const x1 = ORIGIN_X + rowWidth
    const y1 = ORIGIN_Y
    const x2 = ORIGIN_X + rowWidth + (GRID - 1) * rowShiftX
    const y2 = ORIGIN_Y - (GRID - 1) * rowShiftY
    const x3 = ORIGIN_X + (GRID - 1) * rowShiftX
    const y3 = ORIGIN_Y - (GRID - 1) * rowShiftY

    return {
      points: `${x0},${y0} ${x1},${y1} ${x2},${y2} ${x3},${y3}`,
      x0,
      y0,
      x1,
      y1,
      x2,
      y2,
      x3,
      y3,
    }
  }, [GRID, ORIGIN_X, ORIGIN_Y, rowShiftX, rowShiftY, rowWidth])

  const svgStyle = useMemo(() => ({ ['--bar-rgb' as any]: token.rgb }), [token.rgb])

  const dimOthers = hoveredCell !== null && !isDragging

  return (
    <VizCard
      title="Softmax as a Landscape"
      subtitle="How logit gaps map to probabilities"
      figNum="Fig. 2.6"
      footer={
        <div className={styles.footer}>
          We fix one logit to 0 (because softmax only cares about differences), vary the other two, and plot the resulting probability.
          Temperature reshapes the same landscape: cold makes sharp cliffs, hot makes a flatter plateau.
        </div>
      }
    >
      <div className={styles.layout}>
        {/* Token selector - compact horizontal strip at top */}
        <div className={styles.tokenSelector}>
          <span className={styles.tokenSelectorLabel}>Height:</span>
          <div className={styles.tokenButtons} role="tablist" aria-label="Choose which probability to plot as height">
            {TOKENS.map((t) => {
              const active = t.key === selectedToken
              return (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className={`${styles.tokenButton}${active ? ` ${styles.tokenButtonActive}` : ''}`}
                  onClick={() => setSelectedToken(t.key)}
                  style={{ ['--token-accent' as any]: t.accent }}
                >
                  <span className={styles.tokenDot} aria-hidden="true" />
                  <span className={styles.tokenLabel}>P('{t.label}')</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Chart panel - the hero element */}
        <div className={styles.chartPanel}>
          <div
            className={`${styles.chartFrame} panel-dark inset-box`}
            style={{ ['--ambient-color' as string]: token.accent }}
          >
            {/* Drag hint - subtle overlay at top */}
            <div className={`${styles.hudOverlay} ${styles.hudTopRight} ${styles.dragHint}`}>
              drag to rotate · click to pin
            </div>

            <svg
              viewBox={`0 0 ${viewW} ${viewH}`}
              className={`${styles.svg}${hasMounted ? '' : ` ${styles.svgEnter}`}`}
              style={svgStyle}
              role="img"
              aria-label="Softmax landscape showing probability as a function of logit differences and temperature"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
            >
              <defs>
                <filter id="barGlow" x="-40%" y="-40%" width="180%" height="180%">
                  <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="rgba(0, 217, 255, 0.45)" />
                  <feDropShadow dx="0" dy="0" stdDeviation="7" floodColor="rgba(255, 0, 170, 0.25)" />
                </filter>

                <filter id="prismShadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="rgba(0, 0, 0, 0.3)" />
                </filter>

                {/* Shadow blur filter for ambient ground shadow */}
                <filter id="shadowBlur" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="15" />
                </filter>

                {/* Radial gradient for ground plane - lighter center, darker edges */}
                <radialGradient id="planeGradient" cx="50%" cy="50%" r="70%" fx="50%" fy="50%">
                  <stop offset="0%" stopColor="rgba(255, 255, 255, 0.06)" />
                  <stop offset="70%" stopColor="rgba(255, 255, 255, 0.03)" />
                  <stop offset="100%" stopColor="rgba(255, 255, 255, 0.01)" />
                </radialGradient>

                <marker
                  id="axisArrow"
                  markerWidth="10"
                  markerHeight="10"
                  refX="6"
                  refY="3"
                  orient="auto"
                  markerUnits="strokeWidth"
                >
                  <path d="M0,0 L6,3 L0,6 Z" fill="rgba(255,255,255,0.45)" />
                </marker>

                {/* Generate gradient definitions for each height level (0-100%) */}
                {Array.from({ length: 101 }, (_, i) => {
                  const ratio = i / 100

                  // Face gradient (top lighter, bottom darker)
                  const faceTopAlpha = 0.35 + ratio * 0.15
                  const faceBottomAlpha = 0.18 + ratio * 0.08

                  // Top face (brighter)
                  const topAlpha = 0.38 + ratio * 0.18

                  // Side face (darkest)
                  const sideAlpha = 0.16 + ratio * 0.1

                  return (
                    <g key={i}>
                      <linearGradient id={`prismGrad-${i}-face`} x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor={`rgba(var(--bar-rgb), ${faceTopAlpha})`} />
                        <stop offset="100%" stopColor={`rgba(var(--bar-rgb), ${faceBottomAlpha})`} />
                      </linearGradient>
                      <linearGradient id={`prismGrad-${i}-top`} x1="0%" y1="100%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor={`rgba(var(--bar-rgb), ${topAlpha * 0.85})`} />
                        <stop offset="100%" stopColor={`rgba(var(--bar-rgb), ${topAlpha})`} />
                      </linearGradient>
                      <linearGradient id={`prismGrad-${i}-side`} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor={`rgba(var(--bar-rgb), ${sideAlpha * 1.1})`} />
                        <stop offset="100%" stopColor={`rgba(var(--bar-rgb), ${sideAlpha * 0.7})`} />
                      </linearGradient>
                    </g>
                  )
                })}
              </defs>

              {/* Ambient shadow beneath the grid */}
              <ellipse
                cx={ORIGIN_X + rowWidth / 2 + (GRID - 1) * rowShiftX / 2}
                cy={ORIGIN_Y + 20}
                rx={rowWidth / 2 + 40}
                ry={30}
                fill="rgba(0, 0, 0, 0.25)"
                filter="url(#shadowBlur)"
              />

              <polygon className={styles.plane} points={plane.points} fill="url(#planeGradient)" />

              {/* Temperature heat overlay - subtle color tint based on T */}
              <rect
                x={0}
                y={0}
                width={viewW}
                height={viewH}
                fill={`rgba(${safeT > 1 ? '255, 100, 50' : '50, 180, 255'}, ${Math.abs(safeT - 1) * 0.03})`}
                pointerEvents="none"
                className={styles.heatOverlay}
              />

              <line
                className={styles.axisArrow}
                x1={plane.x0}
                y1={plane.y0}
                x2={plane.x1}
                y2={plane.y1}
                markerEnd="url(#axisArrow)"
              />
              <line
                className={styles.axisArrow}
                x1={plane.x0}
                y1={plane.y0}
                x2={plane.x3}
                y2={plane.y3}
                markerEnd="url(#axisArrow)"
              />

              <text
                x={plane.x1 + 12}
                y={plane.y1 + 6}
                className={styles.axisLabel}
                textAnchor="start"
              >
                'e' logit →
              </text>
              <text
                x={plane.x3 - 6}
                y={plane.y3 - 10}
                className={styles.axisLabel}
                textAnchor="end"
              >
                'a' logit →
              </text>

            {(() => {
              const nodes: React.ReactNode[] = []

              for (let j = GRID - 1; j >= 0; j--) {
                const rowBaseX = ORIGIN_X + j * rowShiftX
                const rowBaseY = ORIGIN_Y - j * rowShiftY

                for (let i = 0; i < GRID; i++) {
                  const cell = grid[j]?.[i]
                  if (!cell) continue

                  const p = cell.probs[selectedIndex] ?? 0
                  const height = p * MAX_H

                  const x = rowBaseX + i * COL_STEP
                  const yBottom = rowBaseY

                  const isSelected = selectedCell.i === i && selectedCell.j === j
                  const isHovered = hoveredCell?.i === i && hoveredCell?.j === j && !isDragging

                  const dimmed = dimOthers && !isHovered && !isSelected

                  // Depth-of-field: back rows (higher j) are slightly faded
                  const distanceFactor = j / (GRID - 1)
                  const depthFade = 1 - distanceFactor * 0.3 // Back rows at 70% opacity

                  const baseOpacity = clamp(0.12 + p * 0.9, 0.12, 1)
                  const opacity = baseOpacity * depthFade

                  // Entrance delay: back rows (higher j) appear first, front rows last
                  // Within a row, left to right
                  const entranceDelay = (GRID - 1 - j) * GRID + i

                  nodes.push(
                    <g
                      key={`${i},${j}`}
                      className={styles.prismCell}
                      data-cell="true"
                      data-i={i}
                      data-j={j}
                      style={{
                        opacity,
                        transform: `translate(${x}px, ${yBottom}px)`,
                      }}
                      onMouseEnter={() => (!isDragging ? setHoveredCell({ i, j }) : null)}
                      onMouseLeave={() => (!isDragging ? setHoveredCell(null) : null)}
                    >
                      <Prism
                        x={0}
                        yBottom={0}
                        width={BAR_W}
                        height={height}
                        depthX={depthX}
                        depthY={depthY}
                        dimmed={dimmed}
                        selected={isSelected}
                        hovered={isHovered}
                        topClassName={styles.top}
                        sideClassName={styles.side}
                        faceClassName={styles.face}
                        filter={isHovered ? 'url(#barGlow)' : isSelected ? 'url(#prismShadow)' : undefined}
                        heightRatio={p}
                        entranceDelay={entranceDelay}
                        showEntrance={!hasMounted}
                      />
                    </g>
                  )
                }
              }

              return nodes
            })()}
            </svg>
          </div>

          {/* Controls bar below chart - unobstructed view */}
          <div className={styles.controlsBar}>
            {/* Readout section */}
            <div className={styles.readoutSection} aria-live="polite">
              <div className={styles.readoutLogits}>
                <span className={styles.readoutAccentCyan}>'e'={formatSigned(focus?.a ?? 0)}</span>
                <span className={styles.readoutAccentMagenta}>'a'={formatSigned(focus?.b ?? 0)}</span>
                <span className={styles.readoutAccentYellow}>'i'=0</span>
              </div>
              <div className={`${styles.readoutProb}${readoutFlash ? ` ${styles.readoutFlash}` : ''}`}>
                P('{token.label}') = {(focus?.probs[selectedIndex] ?? 0).toFixed(3)}
              </div>
            </div>

            {/* Temperature control */}
            <div
              className={styles.tempSection}
              style={{
                ['--temp-r' as string]: tempColorRgb.split(', ')[0],
                ['--temp-g' as string]: tempColorRgb.split(', ')[1],
                ['--temp-b' as string]: tempColorRgb.split(', ')[2],
              }}
            >
              <div className={styles.tempRow}>
                <span className={styles.tempLabel}>T</span>
                <span
                  className={styles.tempIndicatorDot}
                  style={{ background: `rgb(${tempColorRgb})` }}
                  aria-hidden="true"
                />
                <span className={`${styles.tempValue}${tempPulse ? ` ${styles.tempValuePulse}` : ''}`}>
                  {safeT.toFixed(1)}
                </span>
              </div>
              <Slider
                wrap={false}
                min={0.2}
                max={5}
                step={0.1}
                value={temperature}
                onValueChange={setTemperature}
                ariaLabel="Temperature"
                inputClassName={styles.tempSlider}
              />
              <div className={styles.tempHint}>sharper ← → flatter</div>
            </div>
          </div>
        </div>
      </div>
    </VizCard>
  )
}
