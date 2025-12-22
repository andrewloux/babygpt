import { useCallback, useMemo, useRef, useState } from 'react'

import { Slider } from './Slider'
import { VizCard } from './VizCard'
import styles from './SoftmaxLandscapeViz.module.css'

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

  return (
    <g
      className={`${styles.prism}${dimmed ? ` ${styles.prismDim}` : ''}${selected ? ` ${styles.prismSelected}` : ''}${hovered ? ` ${styles.prismHover}` : ''}`}
      filter={filter}
    >
      <polygon className={topClassName} points={topPoints} />
      <polygon className={sideClassName} points={sidePoints} />
      <rect className={faceClassName} x={x} y={yTop} width={width} height={h} rx={2} />
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

  const [depthX, setDepthX] = useState(DEPTH_X_DEFAULT)
  const [depthY, setDepthY] = useState(DEPTH_Y_DEFAULT)

  const [hoveredCell, setHoveredCell] = useState<CellCoord | null>(null)
  const [selectedCell, setSelectedCell] = useState<CellCoord>(() => ({
    i: Math.floor(GRID / 2),
    j: Math.floor(GRID / 2),
  }))

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

  const planePoints = useMemo(() => {
    const x0 = ORIGIN_X
    const y0 = ORIGIN_Y
    const x1 = ORIGIN_X + rowWidth
    const y1 = ORIGIN_Y
    const x2 = ORIGIN_X + rowWidth + (GRID - 1) * rowShiftX
    const y2 = ORIGIN_Y - (GRID - 1) * rowShiftY
    const x3 = ORIGIN_X + (GRID - 1) * rowShiftX
    const y3 = ORIGIN_Y - (GRID - 1) * rowShiftY

    return `${x0},${y0} ${x1},${y1} ${x2},${y2} ${x3},${y3}`
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
        <div className={styles.controls}>
          <div className={styles.controlsTitle}>Height shows…</div>
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

          <div className={styles.sliderBlock}>
            <div className={styles.sliderHeader}>
              <div className={styles.sliderLabel}>Temperature</div>
              <div className={styles.sliderValue}>{safeT.toFixed(1)}</div>
            </div>
            <Slider
              wrap={false}
              min={0.2}
              max={5}
              step={0.1}
              value={temperature}
              onValueChange={setTemperature}
              ariaLabel="Temperature"
            />
            <div className={styles.sliderHint}>{safeT < 1 ? 'sharper' : safeT > 1 ? 'flatter' : 'neutral'}</div>
          </div>

          <button
            type="button"
            className={styles.resetButton}
            onClick={() => {
              setDepthX(DEPTH_X_DEFAULT)
              setDepthY(DEPTH_Y_DEFAULT)
            }}
          >
            Reset view
          </button>

          <div className={styles.readout} aria-live="polite">
            <div className={styles.readoutTitle}>Inspecting</div>
            <div className={styles.readoutMono}>
              Δℓ(e)=<span className={styles.readoutAccentCyan}>{formatSigned(focus?.a ?? 0)}</span>{' '}
              Δℓ(a)=<span className={styles.readoutAccentMagenta}>{formatSigned(focus?.b ?? 0)}</span>{' '}
              ℓ(i)=<span className={styles.readoutMuted}>0.0</span>
            </div>
            <div className={styles.readoutRows}>
              <div className={styles.readoutRow}>
                <span className={styles.readoutKey} style={{ color: 'var(--accent-cyan)' }}>
                  P('e')
                </span>
                <span className={styles.readoutVal}>{(focus?.probs[0] ?? 0).toFixed(3)}</span>
              </div>
              <div className={styles.readoutRow}>
                <span className={styles.readoutKey} style={{ color: 'var(--accent-magenta)' }}>
                  P('a')
                </span>
                <span className={styles.readoutVal}>{(focus?.probs[1] ?? 0).toFixed(3)}</span>
              </div>
              <div className={styles.readoutRow}>
                <span className={styles.readoutKey} style={{ color: 'var(--accent-yellow)' }}>
                  P('i')
                </span>
                <span className={styles.readoutVal}>{(focus?.probs[2] ?? 0).toFixed(3)}</span>
              </div>
            </div>
            <div className={styles.readoutHint}>
              Drag to rotate. <span className={styles.readoutHintMuted}>Click a pillar to pin a point.</span>
            </div>
          </div>
        </div>

        <div className={styles.chartPanel}>
          <div className={styles.chartHeader}>
            <div className={styles.axisHint}>
              Left→right: Δℓ(e). Front→back: Δℓ(a). Height: <span className={styles.axisEmph}>P('{token.label}')</span>.
            </div>
          </div>

          <svg
            viewBox={`0 0 ${viewW} ${viewH}`}
            className={styles.svg}
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
            </defs>

            <polygon className={styles.plane} points={planePoints} />

            <text x={ORIGIN_X} y={ORIGIN_Y + 34} className={styles.axisLabel} textAnchor="start">
              Δℓ(e): {RANGE_MIN} → {RANGE_MAX}
            </text>
            <text
              x={ORIGIN_X + rowWidth + (GRID - 1) * rowShiftX + 16}
              y={ORIGIN_Y - (GRID - 1) * rowShiftY + 6}
              className={styles.axisLabel}
              textAnchor="start"
            >
              Δℓ(a): {RANGE_MIN} → {RANGE_MAX}
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
                  const opacity = clamp(0.12 + p * 0.9, 0.12, 1)

                  nodes.push(
                    <g
                      key={`${i},${j}`}
                      data-cell="true"
                      data-i={i}
                      data-j={j}
                      style={{ opacity }}
                      onMouseEnter={() => (!isDragging ? setHoveredCell({ i, j }) : null)}
                      onMouseLeave={() => (!isDragging ? setHoveredCell(null) : null)}
                    >
                      <Prism
                        x={x}
                        yBottom={yBottom}
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
                        filter={isHovered ? 'url(#barGlow)' : undefined}
                      />
                    </g>
                  )
                }
              }

              return nodes
            })()}
          </svg>
        </div>
      </div>
    </VizCard>
  )
}
