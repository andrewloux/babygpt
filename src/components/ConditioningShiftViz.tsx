import { useCallback, useMemo, useRef, useState } from 'react'

import { VizCard } from './VizCard'
import styles from './ConditioningShiftViz.module.css'

type TokenKey = 'space' | 'e' | 't' | 'a' | 'o' | 'i' | 'h' | 'u' | 'q' | 'other'

type SupportItem = {
  key: TokenKey
  label: string
  ariaLabel: string
}

const SUPPORT: SupportItem[] = [
  { key: 'space', label: '␣', ariaLabel: 'space' },
  { key: 'e', label: 'e', ariaLabel: 'e' },
  { key: 't', label: 't', ariaLabel: 't' },
  { key: 'a', label: 'a', ariaLabel: 'a' },
  { key: 'o', label: 'o', ariaLabel: 'o' },
  { key: 'i', label: 'i', ariaLabel: 'i' },
  { key: 'h', label: 'h', ariaLabel: 'h' },
  { key: 'u', label: 'u', ariaLabel: 'u' },
  { key: 'q', label: 'q', ariaLabel: 'q' },
  { key: 'other', label: 'other', ariaLabel: 'other letters' },
]

type Distribution = Record<TokenKey, number>

const BASELINE: Distribution = {
  space: 0.18,
  e: 0.11,
  t: 0.09,
  a: 0.07,
  o: 0.07,
  i: 0.06,
  h: 0.06,
  u: 0.02,
  q: 0.001,
  other: 0.339,
}

type ContextPreset = {
  key: string
  label: string
  context: string
  blurb: string
  dist: Distribution
}

const CONTEXTS: ContextPreset[] = [
  {
    key: 'th',
    label: 'after “th”',
    context: 'th',
    blurb: '“th” narrows us into “the/this/that/there…” — e gets a huge boost.',
    dist: {
      space: 0.01,
      e: 0.55,
      t: 0.05,
      a: 0.10,
      o: 0.06,
      i: 0.08,
      h: 0.02,
      u: 0.0,
      q: 0.0,
      other: 0.13,
    },
  },
  {
    key: 'q',
    label: 'after “q”',
    context: 'q',
    blurb: 'After “q”, English overwhelmingly wants “u”.',
    dist: {
      space: 0.01,
      e: 0.005,
      t: 0.005,
      a: 0.01,
      o: 0.005,
      i: 0.005,
      h: 0.0,
      u: 0.90,
      q: 0.0,
      other: 0.06,
    },
  },
  {
    key: 'space',
    label: 'after “␣”',
    context: '␣',
    blurb: 'A space usually means “start of a word”, so the mix shifts.',
    dist: {
      space: 0.01,
      e: 0.07,
      t: 0.17,
      a: 0.12,
      o: 0.08,
      i: 0.06,
      h: 0.06,
      u: 0.03,
      q: 0.001,
      other: 0.399,
    },
  },
  {
    key: 'ing',
    label: 'after “ing”',
    context: 'ing',
    blurb: 'In many corpora, “ing” is often followed by a space — word boundary.',
    dist: {
      space: 0.55,
      e: 0.05,
      t: 0.03,
      a: 0.03,
      o: 0.02,
      i: 0.02,
      h: 0.01,
      u: 0.01,
      q: 0.0,
      other: 0.28,
    },
  },
]

function toArray(dist: Distribution) {
  return SUPPORT.map((item) => dist[item.key])
}

function sumArray(values: number[]) {
  return values.reduce((sum, v) => sum + v, 0)
}

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x))
}

function clamp(x: number, min: number, max: number) {
  return Math.max(min, Math.min(max, x))
}

function Prism({
  x,
  yBottom,
  width,
  height,
  depthX,
  depthY,
  faceClassName,
  topClassName,
  sideClassName,
  dimmed,
  highlighted,
}: {
  x: number
  yBottom: number
  width: number
  height: number
  depthX: number
  depthY: number
  faceClassName: string
  topClassName: string
  sideClassName: string
  dimmed: boolean
  highlighted: boolean
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
      className={`${styles.prism}${dimmed ? ` ${styles.prismDim}` : ''}${highlighted ? ` ${styles.prismHighlight}` : ''}`}
    >
      <polygon className={topClassName} points={topPoints} />
      <polygon className={sideClassName} points={sidePoints} />
      <rect className={faceClassName} x={x} y={yTop} width={width} height={h} rx={3} />
    </g>
  )
}

export function ConditioningShiftViz() {
  const [contextKey, setContextKey] = useState(CONTEXTS[0].key)
  const [hovered, setHovered] = useState<TokenKey | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const DEPTH_X_DEFAULT = 8
  const DEPTH_Y_DEFAULT = 6
  const DEPTH_X_MIN = 0
  const DEPTH_X_MAX = 18
  const DEPTH_Y_MIN = 0
  const DEPTH_Y_MAX = 14
  const DRAG_SENSITIVITY = 0.06

  const [depthX, setDepthX] = useState(DEPTH_X_DEFAULT)
  const [depthY, setDepthY] = useState(DEPTH_Y_DEFAULT)
  const dragState = useRef<{
    pointerId: number
    startClientX: number
    startClientY: number
    startDepthX: number
    startDepthY: number
  } | null>(null)

  const context = useMemo(() => CONTEXTS.find((c) => c.key === contextKey) ?? CONTEXTS[0], [contextKey])

  const base = useMemo(() => toArray(BASELINE), [])
  const conditional = useMemo(() => toArray(context.dist), [context.dist])

  const overallMax = useMemo(() => {
    let max = 0
    for (const v of toArray(BASELINE)) max = Math.max(max, v)
    for (const preset of CONTEXTS) {
      for (const v of toArray(preset.dist)) max = Math.max(max, v)
    }
    return max
  }, [])

  const focusKey = useMemo(() => {
    if (hovered) return hovered
    let best: TokenKey = SUPPORT[0].key
    let bestVal = -1
    for (let i = 0; i < SUPPORT.length; i++) {
      const key = SUPPORT[i].key
      const v = conditional[i]
      if (v > bestVal) {
        bestVal = v
        best = key
      }
    }
    return best
  }, [conditional, hovered])

  const focusItem = SUPPORT.find((s) => s.key === focusKey) ?? SUPPORT[0]
  const focusIndex = SUPPORT.findIndex((s) => s.key === focusKey)

  const focusBase = base[focusIndex] ?? 0
  const focusCond = conditional[focusIndex] ?? 0

  const baseSum = sumArray(base)
  const condSum = sumArray(conditional)

  const BAR_W = 28
  const GAP = 12
  const LANE_X = 40
  const LANE_Y = 22
  const MAX_H = 120
  const ORIGIN_X = 68
  const BASELINE_Y = 180
  const laneWidth = SUPPORT.length * BAR_W + (SUPPORT.length - 1) * GAP
  // Keep the viewBox large enough for the *maximum* depth, then render the current depth inside it.
  const viewW = ORIGIN_X + laneWidth + LANE_X + DEPTH_X_MAX + 72
  const viewH = BASELINE_Y + 70

  const hScale = overallMax === 0 ? 0 : MAX_H / overallMax

  const baseLabel = `P(next) = ${baseSum.toFixed(2)}`
  const condLabel = `P(next | ${context.context}) = ${condSum.toFixed(2)}`

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      e.preventDefault()
      setHovered(null)
      setIsDragging(true)
      dragState.current = {
        pointerId: e.pointerId,
        startClientX: e.clientX,
        startClientY: e.clientY,
        startDepthX: depthX,
        startDepthY: depthY,
      }
      e.currentTarget.setPointerCapture(e.pointerId)
    },
    [depthX, depthY]
  )

  const handlePointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    const state = dragState.current
    if (!state || state.pointerId !== e.pointerId) return

    const dx = e.clientX - state.startClientX
    const dy = e.clientY - state.startClientY

    const nextDepthX = clamp(state.startDepthX + dx * DRAG_SENSITIVITY, DEPTH_X_MIN, DEPTH_X_MAX)
    const nextDepthY = clamp(state.startDepthY + -dy * DRAG_SENSITIVITY, DEPTH_Y_MIN, DEPTH_Y_MAX)

    setDepthX(nextDepthX)
    setDepthY(nextDepthY)
  }, [])

  const endDrag = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    const state = dragState.current
    if (!state || state.pointerId !== e.pointerId) return
    dragState.current = null
    setIsDragging(false)
  }, [])

  return (
    <VizCard
      title="Conditioning Shifts Probability Mass"
      subtitle="Two distributions over the same alphabet"
      footer={
        <div className={styles.footer}>
          Both rows sum to 1. Conditioning doesn’t “pick a winner” — it changes what’s plausible by moving probability mass around.
        </div>
      }
    >
      <div className={styles.layout}>
        <div className={styles.controls}>
          <div className={styles.controlsTitle}>Choose a context</div>
          <div className={styles.contextButtons} role="tablist" aria-label="Choose a conditioning context">
            {CONTEXTS.map((c) => {
              const active = c.key === contextKey
              return (
                <button
                  key={c.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className={`${styles.contextButton}${active ? ` ${styles.contextButtonActive}` : ''}`}
                  onClick={() => setContextKey(c.key)}
                >
                  {c.label}
                </button>
              )
            })}
          </div>
          <div className={styles.contextBlurb}>{context.blurb}</div>

          <div className={styles.legend}>
            <div className={styles.legendItem}>
              <span className={`${styles.swatch} ${styles.swatchBase}`} aria-hidden="true" />
              <span className={styles.legendText}>Unconditional</span>
            </div>
            <div className={styles.legendItem}>
              <span className={`${styles.swatch} ${styles.swatchCond}`} aria-hidden="true" />
              <span className={styles.legendText}>Conditioned</span>
            </div>
          </div>
        </div>

        <div className={styles.chartPanel}>
          <div className={styles.interactionHint}>
            Drag to rotate. <span className={styles.interactionHintMuted}>Hover a bar to inspect.</span>
          </div>
          <svg
            className={styles.svg}
            viewBox={`0 0 ${viewW} ${viewH}`}
            role="img"
            aria-label="A 3D-style bar chart comparing unconditional and conditional probability distributions"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            <defs>
              <filter id="softGlow" x="-40%" y="-40%" width="180%" height="180%">
                <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="rgba(0, 217, 255, 0.45)" />
                <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="rgba(255, 0, 170, 0.22)" />
              </filter>
            </defs>

            <g className={styles.axes}>
              <line
                x1={ORIGIN_X + LANE_X}
                y1={BASELINE_Y - LANE_Y}
                x2={ORIGIN_X + LANE_X + laneWidth}
                y2={BASELINE_Y - LANE_Y}
                className={styles.axisLineBack}
              />
              <line
                x1={ORIGIN_X}
                y1={BASELINE_Y}
                x2={ORIGIN_X + laneWidth}
                y2={BASELINE_Y}
                className={styles.axisLineFront}
              />

              <text
                x={ORIGIN_X + LANE_X - 10}
                y={BASELINE_Y - LANE_Y - 10}
                className={styles.axisLabel}
                textAnchor="end"
              >
                {baseLabel}
              </text>
              <text
                x={ORIGIN_X - 10}
                y={BASELINE_Y - 10}
                className={styles.axisLabel}
                textAnchor="end"
              >
                {condLabel}
              </text>
            </g>

            {SUPPORT.map((item, i) => {
              const x0 = ORIGIN_X + i * (BAR_W + GAP)
              const baseProb = clamp01(base[i] ?? 0)
              const condProb = clamp01(conditional[i] ?? 0)

              const baseH = baseProb * hScale
              const condH = condProb * hScale

              const isFocus = item.key === focusKey
              const dimmed = hovered !== null && !isFocus

              return (
                <g
                  key={item.key}
                  className={styles.group}
                  onMouseEnter={() => (!isDragging ? setHovered(item.key) : null)}
                  onMouseLeave={() => (!isDragging ? setHovered(null) : null)}
                >
                  <rect
                    x={x0}
                    y={BASELINE_Y - MAX_H - LANE_Y - DEPTH_Y_MAX - 4}
                    width={BAR_W + LANE_X + DEPTH_X_MAX}
                    height={MAX_H + LANE_Y + DEPTH_Y_MAX + 44}
                    fill="transparent"
                  />

                  <g transform={`translate(${LANE_X} ${-LANE_Y})`}>
                    <Prism
                      x={x0}
                      yBottom={BASELINE_Y}
                      width={BAR_W}
                      height={baseH}
                      depthX={depthX}
                      depthY={depthY}
                      faceClassName={styles.faceBase}
                      topClassName={styles.topBase}
                      sideClassName={styles.sideBase}
                      dimmed={dimmed}
                      highlighted={isFocus}
                    />
                  </g>

                  <g filter={isFocus ? 'url(#softGlow)' : undefined}>
                    <Prism
                      x={x0}
                      yBottom={BASELINE_Y}
                      width={BAR_W}
                      height={condH}
                      depthX={depthX}
                      depthY={depthY}
                      faceClassName={styles.faceCond}
                      topClassName={styles.topCond}
                      sideClassName={styles.sideCond}
                      dimmed={dimmed}
                      highlighted={isFocus}
                    />
                  </g>

                  <text x={x0 + BAR_W / 2} y={BASELINE_Y + 30} className={styles.tick} textAnchor="middle">
                    {item.label}
                  </text>
                </g>
              )
            })}
          </svg>

          <div className={styles.readout} aria-live="polite">
            <div className={styles.readoutLeft}>
              <div className={styles.readoutTitle}>Selected</div>
              <div className={styles.readoutToken}>
                <span className={styles.readoutMono}>{focusItem.label}</span>
                <span className={styles.readoutHint}>(hover a bar to inspect)</span>
              </div>
            </div>

            <div className={styles.readoutRight}>
              <div className={styles.readoutRow}>
                <span className={styles.readoutLabel}>P(next)</span>
                <span className={styles.readoutValue}>{focusBase.toFixed(3)}</span>
              </div>
              <div className={styles.readoutRow}>
                <span className={styles.readoutLabel}>
                  P(next | <span className={styles.readoutMonoSmall}>{context.context}</span>)
                </span>
                <span className={styles.readoutValue}>{focusCond.toFixed(3)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </VizCard>
  )
}
