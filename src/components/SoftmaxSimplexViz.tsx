import { useEffect, useMemo, useRef, useState } from 'react'
import { VizCard } from './VizCard'
import { Slider } from './Slider'
import styles from './SoftmaxSimplexViz.module.css'

const WIDTH = 360
const HEIGHT = 320
const TRIANGLE_SIZE = 260
const CENTER_X = WIDTH / 2
const CENTER_Y = HEIGHT / 2 + 18

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

function clampProbs(probs: number[], eps = 1e-4): number[] {
  const clamped = probs.map((p) => Math.max(eps, p))
  const sum = clamped.reduce((a, b) => a + b, 0)
  return clamped.map((p) => p / sum)
}

function logitsFromProbs(probs: number[], temperature: number): number[] {
  const safe = clampProbs(probs)
  const raw = safe.map((p) => Math.log(p) * temperature)
  const mean = raw.reduce((a, b) => a + b, 0) / raw.length
  return raw.map((x) => x - mean)
}

// Convert probabilities (barycentric coords) to 2D point
function toCartesian(probs: number[]): { x: number; y: number } {
  const [pA, pB, pC] = probs
  return {
    x: pA * VERTICES.A.x + pB * VERTICES.B.x + pC * VERTICES.C.x,
    y: pA * VERTICES.A.y + pB * VERTICES.B.y + pC * VERTICES.C.y,
  }
}

function toBarycentric(p: { x: number; y: number }): number[] {
  const a = VERTICES.A
  const b = VERTICES.B
  const c = VERTICES.C

  const v0 = { x: b.x - a.x, y: b.y - a.y }
  const v1 = { x: c.x - a.x, y: c.y - a.y }
  const v2 = { x: p.x - a.x, y: p.y - a.y }

  const d00 = v0.x * v0.x + v0.y * v0.y
  const d01 = v0.x * v1.x + v0.y * v1.y
  const d11 = v1.x * v1.x + v1.y * v1.y
  const d20 = v2.x * v0.x + v2.y * v0.y
  const d21 = v2.x * v1.x + v2.y * v1.y

  const denom = d00 * d11 - d01 * d01
  if (denom === 0) return [1 / 3, 1 / 3, 1 / 3]

  const v = (d11 * d20 - d01 * d21) / denom
  const w = (d00 * d21 - d01 * d20) / denom
  const u = 1 - v - w
  return clampProbs([u, v, w])
}

export function SoftmaxSimplexViz() {
  const [logitA, setLogitA] = useState(1.5)
  const [logitB, setLogitB] = useState(0.5)
  const [logitC, setLogitC] = useState(-0.5)
  const [temperature, setTemperature] = useState(1.0)
  const [trail, setTrail] = useState<{ x: number; y: number }[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const isDraggingRef = useRef(false)
  const pointRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })

  const probs = useMemo(
    () => softmax([logitA, logitB, logitC], temperature),
    [logitA, logitB, logitC, temperature]
  )

  const point = useMemo(() => toCartesian(probs), [probs])

  useEffect(() => {
    const last = pointRef.current
    pointRef.current = point
    if (!trail.length) {
      setTrail([point])
      return
    }

    if (Math.hypot(point.x - last.x, point.y - last.y) <= 5) return
    setTrail((prev) => [...prev.slice(-40), point])
  }, [point.x, point.y, trail.length])

  const updateFromClientPoint = (clientX: number, clientY: number) => {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    if (!rect.width || !rect.height) return

    const x = ((clientX - rect.left) / rect.width) * WIDTH
    const y = ((clientY - rect.top) / rect.height) * HEIGHT

    const nextProbs = toBarycentric({ x, y })
    const [a, b, c] = logitsFromProbs(nextProbs, temperature)
    setLogitA(a)
    setLogitB(b)
    setLogitC(c)
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
              min={-10}
              max={10}
              step={0.1}
              value={logitA}
              onValueChange={setLogitA}
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
              min={-10}
              max={10}
              step={0.1}
              value={logitB}
              onValueChange={setLogitB}
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
              min={-10}
              max={10}
              step={0.1}
              value={logitC}
              onValueChange={setLogitC}
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
              onValueChange={setTemperature}
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

          <button className={styles.clearBtn} type="button" onClick={() => setTrail([point])} aria-label="Clear trail">
            Clear trail
          </button>
        </div>

        <div className={styles.vizPanel}>
          <svg
            ref={svgRef}
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className={`${styles.svg} ${isDragging ? styles.dragging : ''}`}
            role="img"
            aria-label="Probability simplex visualization showing distribution across three characters"
            onPointerDown={(e) => {
              isDraggingRef.current = true
              setIsDragging(true)
              ;(e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId)
              updateFromClientPoint(e.clientX, e.clientY)
            }}
            onPointerMove={(e) => {
              if (!isDraggingRef.current) return
              updateFromClientPoint(e.clientX, e.clientY)
            }}
            onPointerUp={(e) => {
              isDraggingRef.current = false
              setIsDragging(false)
              ;(e.currentTarget as SVGSVGElement).releasePointerCapture(e.pointerId)
            }}
            onPointerCancel={() => {
              isDraggingRef.current = false
              setIsDragging(false)
            }}
          >
            {/* Triangle fill */}
            <path d={trianglePath} className={styles.triangleFill} />

            {/* Grid lines */}
            {gridLines}

            {/* Triangle outline */}
            <path d={trianglePath} className={styles.triangleOutline} />

            {/* Vertex labels */}
            <text
              x={VERTICES.A.x}
              y={VERTICES.A.y - 15}
              className={styles.vertexLabel}
              style={{ fill: 'var(--accent-cyan)' }}
            >
              100% '{CHARS[0]}'
            </text>
            <text
              x={VERTICES.B.x - 40}
              y={VERTICES.B.y + 20}
              className={styles.vertexLabel}
              style={{ fill: 'var(--accent-magenta)' }}
            >
              100% '{CHARS[1]}'
            </text>
            <text
              x={VERTICES.C.x + 40}
              y={VERTICES.C.y + 20}
              className={styles.vertexLabel}
              style={{ fill: 'var(--accent-yellow)' }}
            >
              100% '{CHARS[2]}'
            </text>

            {/* Center label */}
            <text x={CENTER_X} y={CENTER_Y + 5} className={styles.centerLabel}>
              uniform
            </text>

            {/* Trail */}
            {trail.length > 1 && <polyline points={trail.map((p) => `${p.x},${p.y}`).join(' ')} className={styles.trail} />}

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
          </>
        )}
        {temperature >= 0.5 && temperature <= 2 && (
          <>
            <strong>Normal temperature (T={temperature.toFixed(1)}):</strong> The distribution reflects the score differences.
          </>
        )}
        {temperature > 2 && (
          <>
            <strong>Hot model (T={temperature.toFixed(1)}):</strong> Probability spreads toward uniform.
          </>
        )}
      </div>
    </VizCard>
  )
}
