import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { VizCard } from './VizCard'
import styles from './SoftmaxSimplexViz.module.css'

// Hook for smooth animated number transitions
function useAnimatedValue(target: number, duration = 200) {
  const [current, setCurrent] = useState(target)
  const animRef = useRef<number | undefined>(undefined)
  const startRef = useRef(target)
  const startTimeRef = useRef(0)
  const currentRef = useRef(target)

  // Keep currentRef in sync
  currentRef.current = current

  useEffect(() => {
    // Capture the starting value at the moment target changes
    startRef.current = currentRef.current
    startTimeRef.current = performance.now()

    const animate = (now: number) => {
      const elapsed = now - startTimeRef.current
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic
      const newValue = startRef.current + (target - startRef.current) * eased
      setCurrent(newValue)

      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate)
      }
    }

    animRef.current = requestAnimationFrame(animate)
    return () => {
      if (animRef.current !== undefined) cancelAnimationFrame(animRef.current)
    }
  }, [target, duration])

  return current
}

const WIDTH = 360
const HEIGHT = 320
const TRIANGLE_SIZE = 260
const CENTER_X = WIDTH / 2
const CENTER_Y = HEIGHT / 2 + 18
const SNAP_DISTANCE = 15

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

// Compute perpendicular foot from point to line segment
function perpendicularFoot(
  p: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number }
): { x: number; y: number } {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)))
  return { x: a.x + t * dx, y: a.y + t * dy }
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
  const [attemptLocked, setAttemptLocked] = useState(false)
  const [pulseId, setPulseId] = useState(0)
  const [pulseTarget, setPulseTarget] = useState<'plot' | 'feedback' | null>(null)
  const [clickRipple, setClickRipple] = useState<{ x: number; y: number; id: number } | null>(null)
  const [nearVertex, setNearVertex] = useState<'A' | 'B' | 'C' | null>(null)
  const [flashingRows, setFlashingRows] = useState<Set<number>>(new Set())
  const [activeSlider, setActiveSlider] = useState<'A' | 'B' | 'C' | 'T' | null>(null)
  const [valuePulseId, setValuePulseId] = useState({ A: 0, B: 0, C: 0, T: 0 })
  const [lockBtnPressed, setLockBtnPressed] = useState(false)
  const [challengeFailed, setChallengeFailed] = useState(false)
  const [confetti, setConfetti] = useState<{ x: number; y: number; color: string; id: number }[]>([])
  const [successRing, setSuccessRing] = useState(false)
  const [resetSpinning, setResetSpinning] = useState(false)
  const [isEntering, setIsEntering] = useState(true)
  const [prevTempRegime, setPrevTempRegime] = useState<'cold' | 'medium' | 'hot'>('medium')
  const [explanationKey, setExplanationKey] = useState(0)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const vizPanelRef = useRef<HTMLDivElement | null>(null)
  const isDraggingRef = useRef(false)
  const pointRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const rippleIdRef = useRef(0)
  const prevProbsRef = useRef<number[]>([1/3, 1/3, 1/3])

  const probs = useMemo(
    () => softmax([logitA, logitB, logitC], temperature),
    [logitA, logitB, logitC, temperature]
  )

  // Animated probability values for smooth number transitions
  const animatedProb0 = useAnimatedValue(probs[0], 200)
  const animatedProb1 = useAnimatedValue(probs[1], 200)
  const animatedProb2 = useAnimatedValue(probs[2], 200)
  const animatedProbs = [animatedProb0, animatedProb1, animatedProb2]

  // Find the dominant (highest) probability index
  const dominantIndex = useMemo(() => {
    const maxProb = Math.max(...probs)
    return probs.indexOf(maxProb)
  }, [probs])

  // Detect significant changes (>10%) and trigger flash
  useEffect(() => {
    const FLASH_THRESHOLD = 0.10
    const newFlashing = new Set<number>()

    for (let i = 0; i < 3; i++) {
      const delta = Math.abs(probs[i] - prevProbsRef.current[i])
      if (delta > FLASH_THRESHOLD) {
        newFlashing.add(i)
      }
    }

    if (newFlashing.size > 0) {
      setFlashingRows(newFlashing)
      // Clear flash after animation completes
      const t = setTimeout(() => setFlashingRows(new Set()), 300)
      prevProbsRef.current = [...probs]
      return () => clearTimeout(t)
    }

    prevProbsRef.current = [...probs]
  }, [probs])

  const point = useMemo(() => toCartesian(probs), [probs])

  // Check proximity to vertices for snap indicator
  const checkNearVertex = useMemo(() => {
    const distA = Math.hypot(point.x - VERTICES.A.x, point.y - VERTICES.A.y)
    const distB = Math.hypot(point.x - VERTICES.B.x, point.y - VERTICES.B.y)
    const distC = Math.hypot(point.x - VERTICES.C.x, point.y - VERTICES.C.y)

    if (distA < SNAP_DISTANCE) return 'A'
    if (distB < SNAP_DISTANCE) return 'B'
    if (distC < SNAP_DISTANCE) return 'C'
    return null
  }, [point.x, point.y])

  // Update near vertex state during drag
  useEffect(() => {
    if (isDragging) {
      setNearVertex(checkNearVertex)
    } else {
      setNearVertex(null)
    }
  }, [isDragging, checkNearVertex])

  const ratioEI = probs[0] / Math.max(1e-12, probs[2])
  const challengeSuccess =
    attemptLocked &&
    probs[1] < 0.05 &&
    probs[0] > 0.2 &&
    probs[2] > 0.2 &&
    ratioEI >= 0.7 &&
    ratioEI <= 1.3

  // Progress calculation for how close user is to success (before locking)
  const progressMetrics = useMemo(() => {
    // P(a) < 5% - how close are we? (1 when met, 0 when at 100%)
    const aProgress = probs[1] < 0.05 ? 1 : Math.max(0, 1 - (probs[1] - 0.05) / 0.95)
    // P(e) > 20% - how close? (1 when met, 0 when at 0%)
    const eProgress = probs[0] > 0.2 ? 1 : probs[0] / 0.2
    // P(i) > 20% - how close?
    const iProgress = probs[2] > 0.2 ? 1 : probs[2] / 0.2
    // 0.7 <= P(e)/P(i) <= 1.3 - balanced?
    const ratio = probs[0] / Math.max(1e-12, probs[2])
    const ratioProgress = ratio >= 0.7 && ratio <= 1.3 ? 1 :
      ratio < 0.7 ? ratio / 0.7 : Math.max(0, 1 - (ratio - 1.3) / 1.7)

    return {
      aProgress,
      eProgress,
      iProgress,
      ratioProgress,
      overall: (aProgress + eProgress + iProgress + ratioProgress) / 4,
      allMet: aProgress === 1 && eProgress === 1 && iProgress === 1 && ratioProgress === 1
    }
  }, [probs])

  // Trigger confetti on success
  // Mount animation trigger - entrance animations play, then we clear the entering state
  useEffect(() => {
    const t = setTimeout(() => setIsEntering(false), 1200)
    return () => clearTimeout(t)
  }, [])

  // Determine current temperature regime and trigger explanation transition
  const currentTempRegime = temperature < 0.5 ? 'cold' : temperature <= 2 ? 'medium' : 'hot'

  useEffect(() => {
    if (currentTempRegime !== prevTempRegime) {
      setPrevTempRegime(currentTempRegime)
      setExplanationKey((k) => k + 1)
    }
  }, [currentTempRegime, prevTempRegime])

  // Calculate glow position and color based on point
  const glowX = (point.x / WIDTH) * 100
  const glowY = (point.y / HEIGHT) * 100

  // Blend color based on probabilities - dominant vertex determines tint
  const glowColor = probs[0] > 0.5 ? 'var(--accent-cyan)'
    : probs[1] > 0.5 ? 'var(--accent-magenta)'
    : probs[2] > 0.5 ? 'var(--accent-yellow)'
    : 'rgba(255, 255, 255, 0.1)'

  useEffect(() => {
    if (challengeSuccess) {
      const particles = Array.from({ length: 20 }, (_, i) => ({
        x: CENTER_X + (Math.random() - 0.5) * 120,
        y: CENTER_Y + (Math.random() - 0.5) * 80,
        color: ['var(--accent-cyan)', 'var(--accent-magenta)', 'var(--accent-yellow)'][Math.floor(Math.random() * 3)],
        id: Date.now() + i
      }))
      setConfetti(particles)
      setSuccessRing(true)
      const t = setTimeout(() => {
        setConfetti([])
        setSuccessRing(false)
      }, 2500)
      return () => clearTimeout(t)
    }
  }, [challengeSuccess])

  // Handle lock button click
  const handleLockClick = useCallback(() => {
    setLockBtnPressed(true)
    setTimeout(() => setLockBtnPressed(false), 150)

    setAttemptLocked(true)
    triggerPulse('feedback')
    triggerPulse('plot')

    // Check if it will fail (we need to check the current state)
    const willSucceed =
      probs[1] < 0.05 &&
      probs[0] > 0.2 &&
      probs[2] > 0.2 &&
      ratioEI >= 0.7 &&
      ratioEI <= 1.3

    if (!willSucceed) {
      setChallengeFailed(true)
      setTimeout(() => setChallengeFailed(false), 500)
    }
  }, [probs, ratioEI])

  // Handle reset button click
  const handleResetClick = useCallback(() => {
    setResetSpinning(true)
    setTimeout(() => setResetSpinning(false), 500)

    setAttemptLocked(false)
    setChallengeFailed(false)
    setLogitA(1.5)
    setLogitB(0.5)
    setLogitC(-0.5)
    setTemperature(1.0)
    setTrail([point])
    triggerPulse('plot')
  }, [point])

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

  useEffect(() => {
    if (!pulseTarget) return
    const t = window.setTimeout(() => setPulseTarget(null), 950)
    return () => window.clearTimeout(t)
  }, [pulseId, pulseTarget])

  // Clear click ripple after animation
  useEffect(() => {
    if (!clickRipple) return
    const t = window.setTimeout(() => setClickRipple(null), 400)
    return () => window.clearTimeout(t)
  }, [clickRipple])

  const triggerPulse = (target: 'plot' | 'feedback') => {
    setPulseTarget(target)
    setPulseId((v) => v + 1)
  }

  const spawnClickRipple = (clientX: number, clientY: number) => {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    if (!rect.width || !rect.height) return

    const x = ((clientX - rect.left) / rect.width) * WIDTH
    const y = ((clientY - rect.top) / rect.height) * HEIGHT
    rippleIdRef.current += 1
    setClickRipple({ x, y, id: rippleIdRef.current })
  }

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
      figNum="Fig. 2.5b"
    >
      <div className={styles.content}>
        {/* Challenge bar - inline header spanning full width */}
        <div className={`${styles.challengeBar} ${challengeFailed ? styles.challengeShake : ''} ${challengeSuccess ? styles.challengeSuccessGlow : ''}`}>
          <div className={styles.challengeBarText}>
            <strong>Challenge:</strong> Kill <span className={styles.mono}>'a'</span>, keep <span className={styles.mono}>'e'</span> and <span className={styles.mono}>'i'</span> competing
            {attemptLocked && (
              <span className={`${styles.challengeBarFeedback} ${challengeSuccess ? styles.good : styles.bad}`}>
                {challengeSuccess ? ' — Nice!' : ' — Not quite'}
              </span>
            )}
          </div>
          <div className={styles.challengeBarActions}>
            <button
              type="button"
              className={`${styles.lockBtn} ${lockBtnPressed ? styles.lockBtnPressed : ''} ${attemptLocked ? styles.lockBtnLocked : ''}`}
              onClick={handleLockClick}
              disabled={attemptLocked}
            >
              {attemptLocked ? '🔒 Locked' : 'Lock'}
            </button>
            <button
              type="button"
              className={`${styles.resetBtn} ${resetSpinning ? styles.resetBtnSpin : ''}`}
              onClick={handleResetClick}
            >
              <span className={styles.resetIcon}>{'\u21BB'}</span>
            </button>
          </div>
        </div>

        {/* LEFT COLUMN: Triangle (HERO) + Probabilities */}
        <div
          ref={vizPanelRef}
          className={`${styles.vizPanel} focus-pulse ${pulseTarget === 'plot' ? 'focus-pulse--active' : ''} ${challengeSuccess ? styles.vizPanelSuccess : ''}`}
          style={{
            ['--focus-pulse-color' as any]: challengeSuccess ? 'rgba(76, 217, 153, 0.25)' : 'rgba(0, 217, 255, 0.18)',
            ['--glow-x' as any]: `${glowX}%`,
            ['--glow-y' as any]: `${glowY}%`,
            ['--glow-color' as any]: glowColor,
          }}
        >
          <svg
            ref={svgRef}
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className={`${styles.svg} ${isDragging ? styles.dragging : ''}`}
            role="img"
            aria-label="Probability simplex visualization showing distribution across three characters"
            onPointerDown={(e) => {
              isDraggingRef.current = true
              setIsDragging(true)
              spawnClickRipple(e.clientX, e.clientY)
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
            <defs>
              {/* Triangle gradient fill - 3-way blend from vertices */}
              <radialGradient id="triangleFillGradient" cx="50%" cy="50%" r="70%">
                <stop offset="0%" stopColor="rgba(255, 255, 255, 0.08)" />
                <stop offset="100%" stopColor="rgba(0, 0, 0, 0.25)" />
              </radialGradient>

              {/* Vertex color gradients for corner tinting */}
              <radialGradient id="vertexGlowA" cx={VERTICES.A.x / WIDTH} cy={VERTICES.A.y / HEIGHT} r="0.5">
                <stop offset="0%" stopColor="rgba(0, 217, 255, 0.15)" />
                <stop offset="100%" stopColor="rgba(0, 217, 255, 0)" />
              </radialGradient>
              <radialGradient id="vertexGlowB" cx={VERTICES.B.x / WIDTH} cy={VERTICES.B.y / HEIGHT} r="0.5">
                <stop offset="0%" stopColor="rgba(255, 0, 110, 0.15)" />
                <stop offset="100%" stopColor="rgba(255, 0, 110, 0)" />
              </radialGradient>
              <radialGradient id="vertexGlowC" cx={VERTICES.C.x / WIDTH} cy={VERTICES.C.y / HEIGHT} r="0.5">
                <stop offset="0%" stopColor="rgba(255, 201, 71, 0.15)" />
                <stop offset="100%" stopColor="rgba(255, 201, 71, 0)" />
              </radialGradient>

              {/* Edge gradients for triangle outline */}
              <linearGradient id="edgeAB" x1={VERTICES.A.x} y1={VERTICES.A.y} x2={VERTICES.B.x} y2={VERTICES.B.y} gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="rgba(0, 217, 255, 0.6)" />
                <stop offset="100%" stopColor="rgba(255, 0, 110, 0.6)" />
              </linearGradient>
              <linearGradient id="edgeAC" x1={VERTICES.A.x} y1={VERTICES.A.y} x2={VERTICES.C.x} y2={VERTICES.C.y} gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="rgba(0, 217, 255, 0.6)" />
                <stop offset="100%" stopColor="rgba(255, 201, 71, 0.6)" />
              </linearGradient>
              <linearGradient id="edgeBC" x1={VERTICES.B.x} y1={VERTICES.B.y} x2={VERTICES.C.x} y2={VERTICES.C.y} gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="rgba(255, 0, 110, 0.6)" />
                <stop offset="100%" stopColor="rgba(255, 201, 71, 0.6)" />
              </linearGradient>

              {/* Vertex glow filter */}
              <filter id="vertexGlowFilter" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="8" />
              </filter>

              {/* Center glow filter */}
              <filter id="centerGlowFilter" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="6" />
              </filter>

              {/* Grid line glow filter */}
              <filter id="gridGlowFilter" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" />
              </filter>

              {/* Inner shadow filter for depth */}
              <filter id="innerShadow" x="-50%" y="-50%" width="200%" height="200%">
                <feComponentTransfer in="SourceAlpha">
                  <feFuncA type="table" tableValues="1 0" />
                </feComponentTransfer>
                <feGaussianBlur stdDeviation="4" />
                <feOffset dx="0" dy="2" result="offsetblur" />
                <feFlood floodColor="rgba(0, 0, 0, 0.4)" result="color" />
                <feComposite in2="offsetblur" operator="in" />
                <feComposite in2="SourceAlpha" operator="in" />
                <feMerge>
                  <feMergeNode in="SourceGraphic" />
                  <feMergeNode />
                </feMerge>
              </filter>

              {/* Trail glow filter */}
              <filter id="trailGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              {/* Snap indicator filter */}
              <filter id="snapRingGlow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="4" />
              </filter>
            </defs>

            {/* Target zone on BC edge - the "success zone" for the challenge */}
            {!attemptLocked && (
              <g className={styles.targetZone}>
                {/* Semi-transparent region along the BC edge where success is possible */}
                {/* This is the bottom edge - where P(a) is low but e and i compete */}
                <path
                  d={`M ${VERTICES.B.x + (VERTICES.C.x - VERTICES.B.x) * 0.3} ${VERTICES.B.y}
                      L ${VERTICES.B.x + (VERTICES.C.x - VERTICES.B.x) * 0.7} ${VERTICES.C.y}
                      L ${CENTER_X} ${CENTER_Y + TRIANGLE_SIZE * 0.15}
                      Z`}
                  className={`${styles.targetZonePath} ${progressMetrics.allMet ? styles.targetZoneReady : ''}`}
                />
                <line
                  x1={VERTICES.B.x + (VERTICES.C.x - VERTICES.B.x) * 0.3}
                  y1={VERTICES.B.y}
                  x2={VERTICES.B.x + (VERTICES.C.x - VERTICES.B.x) * 0.7}
                  y2={VERTICES.C.y}
                  className={styles.targetZoneEdge}
                />
              </g>
            )}

            {/* Triangle base fill with gradient */}
            <path d={trianglePath} fill="url(#triangleFillGradient)" filter="url(#innerShadow)" />

            {/* Vertex color overlays for 3-way blend effect */}
            <path d={trianglePath} fill="url(#vertexGlowA)" className={styles.vertexOverlay} />
            <path d={trianglePath} fill="url(#vertexGlowB)" className={styles.vertexOverlay} />
            <path d={trianglePath} fill="url(#vertexGlowC)" className={styles.vertexOverlay} />

            {/* Vertex glow circles */}
            <circle
              cx={VERTICES.A.x}
              cy={VERTICES.A.y}
              r="25"
              fill="rgba(0, 217, 255, 0.35)"
              filter="url(#vertexGlowFilter)"
              className={styles.vertexGlow}
            />
            <circle
              cx={VERTICES.B.x}
              cy={VERTICES.B.y}
              r="25"
              fill="rgba(255, 0, 110, 0.35)"
              filter="url(#vertexGlowFilter)"
              className={styles.vertexGlow}
              style={{ animationDelay: '0.3s' }}
            />
            <circle
              cx={VERTICES.C.x}
              cy={VERTICES.C.y}
              r="25"
              fill="rgba(255, 201, 71, 0.35)"
              filter="url(#vertexGlowFilter)"
              className={styles.vertexGlow}
              style={{ animationDelay: '0.6s' }}
            />

            {/* Grid lines with glow */}
            <g className={styles.gridGroup}>
              {gridLines}
            </g>

            {/* Triangle outline with gradient edges */}
            {/* Edge AB (opposite C) - highlights when 'i' slider active */}
            <line
              x1={VERTICES.A.x} y1={VERTICES.A.y}
              x2={VERTICES.B.x} y2={VERTICES.B.y}
              stroke="url(#edgeAB)"
              strokeWidth="3"
              strokeLinecap="round"
              className={`${styles.triangleEdge} ${isEntering ? styles.triangleEdgeEnter : ''} ${activeSlider === 'C' ? styles.triangleEdgeHighlightC : ''}`}
            />
            {/* Edge AC (opposite B) - highlights when 'a' slider active */}
            <line
              x1={VERTICES.A.x} y1={VERTICES.A.y}
              x2={VERTICES.C.x} y2={VERTICES.C.y}
              stroke="url(#edgeAC)"
              strokeWidth="3"
              strokeLinecap="round"
              className={`${styles.triangleEdge} ${isEntering ? styles.triangleEdgeEnter : ''} ${activeSlider === 'B' ? styles.triangleEdgeHighlightB : ''}`}
            />
            {/* Edge BC (opposite A) - highlights when 'e' slider active */}
            <line
              x1={VERTICES.B.x} y1={VERTICES.B.y}
              x2={VERTICES.C.x} y2={VERTICES.C.y}
              stroke="url(#edgeBC)"
              strokeWidth="3"
              strokeLinecap="round"
              className={`${styles.triangleEdge} ${isEntering ? styles.triangleEdgeEnter : ''} ${activeSlider === 'A' ? styles.triangleEdgeHighlightA : ''}`}
            />

            {/* Vertex labels */}
            <text
              x={VERTICES.A.x}
              y={VERTICES.A.y - 18}
              className={styles.vertexLabel}
              style={{ fill: 'var(--accent-cyan)' }}
            >
              '{CHARS[0]}'
            </text>
            <text
              x={VERTICES.B.x - 42}
              y={VERTICES.B.y + 22}
              className={styles.vertexLabel}
              style={{ fill: 'var(--accent-magenta)' }}
            >
              '{CHARS[1]}'
            </text>
            <text
              x={VERTICES.C.x + 42}
              y={VERTICES.C.y + 22}
              className={styles.vertexLabel}
              style={{ fill: 'var(--accent-yellow)' }}
            >
              '{CHARS[2]}'
            </text>

            {/* Center glow */}
            <circle
              cx={CENTER_X}
              cy={CENTER_Y}
              r="18"
              fill="rgba(255, 255, 255, 0.15)"
              filter="url(#centerGlowFilter)"
              className={styles.centerGlow}
            />

            {/* Center dot */}
            <circle cx={CENTER_X} cy={CENTER_Y} r="7" className={styles.centerDot} />
            <text x={CENTER_X} y={CENTER_Y + 24} className={styles.centerLabel}>
              uniform
            </text>

            {/* Connection lines to edges - show perpendicular distances (barycentric education) */}
            {isDragging && (
              <g className={styles.connectionLines}>
                {/* Line to edge BC (opposite vertex A) - shows pA */}
                <line
                  x1={point.x}
                  y1={point.y}
                  x2={perpendicularFoot(point, VERTICES.B, VERTICES.C).x}
                  y2={perpendicularFoot(point, VERTICES.B, VERTICES.C).y}
                  stroke="var(--accent-cyan)"
                  strokeWidth="1.5"
                  strokeOpacity="0.25"
                  strokeDasharray="4 3"
                />
                {/* Line to edge AC (opposite vertex B) - shows pB */}
                <line
                  x1={point.x}
                  y1={point.y}
                  x2={perpendicularFoot(point, VERTICES.A, VERTICES.C).x}
                  y2={perpendicularFoot(point, VERTICES.A, VERTICES.C).y}
                  stroke="var(--accent-magenta)"
                  strokeWidth="1.5"
                  strokeOpacity="0.25"
                  strokeDasharray="4 3"
                />
                {/* Line to edge AB (opposite vertex C) - shows pC */}
                <line
                  x1={point.x}
                  y1={point.y}
                  x2={perpendicularFoot(point, VERTICES.A, VERTICES.B).x}
                  y2={perpendicularFoot(point, VERTICES.A, VERTICES.B).y}
                  stroke="var(--accent-yellow)"
                  strokeWidth="1.5"
                  strokeOpacity="0.25"
                  strokeDasharray="4 3"
                />
              </g>
            )}

            {/* Trail - gradient faded segments */}
            {trail.length > 1 && (
              <g filter="url(#trailGlow)">
                {trail.slice(0, -1).map((p, i) => {
                  const next = trail[i + 1]
                  const opacity = ((i + 1) / trail.length) * 0.6
                  return (
                    <line
                      key={i}
                      x1={p.x}
                      y1={p.y}
                      x2={next.x}
                      y2={next.y}
                      stroke="var(--accent-magenta)"
                      strokeWidth={2.5}
                      strokeOpacity={opacity}
                      strokeLinecap="round"
                    />
                  )
                })}
              </g>
            )}

            {/* Click ripple effect */}
            {clickRipple && (
              <circle
                key={clickRipple.id}
                cx={clickRipple.x}
                cy={clickRipple.y}
                r="0"
                className={styles.clickRipple}
              />
            )}

            {/* Snap indicator ring around nearby vertex */}
            {nearVertex && (
              <>
                <circle
                  cx={VERTICES[nearVertex].x}
                  cy={VERTICES[nearVertex].y}
                  r="20"
                  className={styles.snapRingGlow}
                  filter="url(#snapRingGlow)"
                />
                <circle
                  cx={VERTICES[nearVertex].x}
                  cy={VERTICES[nearVertex].y}
                  r="20"
                  className={styles.snapRing}
                />
              </>
            )}

            {/* Current point glow */}
            <circle
              cx={point.x}
              cy={point.y}
              r="15"
              className={`${styles.pointGlow} ${isEntering ? styles.pointGlowEnter : ''} ${isDragging ? styles.pointGlowDragging : styles.pointGlowIdle}`}
            />

            {/* Current point */}
            <circle
              cx={point.x}
              cy={point.y}
              r="8"
              className={`${styles.point} ${isEntering ? styles.pointEnter : ''} ${isDragging ? styles.pointDragging : styles.pointIdle} ${challengeSuccess ? styles.pointSuccess : ''}`}
            />

            {/* Success ring animation */}
            {successRing && (
              <circle
                cx={point.x}
                cy={point.y}
                r="10"
                className={styles.successRing}
              />
            )}

            {/* Confetti particles */}
            {confetti.map((p) => (
              <circle
                key={p.id}
                cx={p.x}
                cy={p.y}
                r={4}
                fill={p.color}
                className={styles.confettiParticle}
                style={{ ['--delay' as string]: `${(p.id % 20) * 40}ms` }}
              />
            ))}

            {/* Target zone success glow when locked and successful */}
            {challengeSuccess && (
              <path
                d={`M ${VERTICES.B.x + (VERTICES.C.x - VERTICES.B.x) * 0.3} ${VERTICES.B.y}
                    L ${VERTICES.B.x + (VERTICES.C.x - VERTICES.B.x) * 0.7} ${VERTICES.C.y}
                    L ${CENTER_X} ${CENTER_Y + TRIANGLE_SIZE * 0.15}
                    Z`}
                className={styles.targetZoneSuccess}
              />
            )}
          </svg>

          {/* Probabilities - tucked under triangle */}
          <div className={`${styles.probDisplay} inset-box`}>
            <div className={`${styles.probRow} ${flashingRows.has(0) ? styles.probRowFlash : ''} ${dominantIndex === 0 ? styles.probRowDominant : ''}`}>
              <span className={styles.probKey} style={{ color: 'var(--accent-cyan)' }}>
                '{CHARS[0]}'
              </span>
              <div className={styles.probBarTrack}>
                <div className={styles.probBarA} style={{ width: `${Math.min(100, probs[0] * 100)}%` }} />
              </div>
              <span className={`${styles.probVal} ${flashingRows.has(0) ? styles.probValFlash : ''}`}>
                {(animatedProbs[0] * 100).toFixed(1)}%
              </span>
            </div>
            <div className={`${styles.probRow} ${flashingRows.has(1) ? styles.probRowFlash : ''} ${dominantIndex === 1 ? styles.probRowDominant : ''}`}>
              <span className={styles.probKey} style={{ color: 'var(--accent-magenta)' }}>
                '{CHARS[1]}'
              </span>
              <div className={styles.probBarTrack}>
                <div className={styles.probBarB} style={{ width: `${Math.min(100, probs[1] * 100)}%` }} />
              </div>
              <span className={`${styles.probVal} ${flashingRows.has(1) ? styles.probValFlash : ''}`}>
                {(animatedProbs[1] * 100).toFixed(1)}%
              </span>
            </div>
            <div className={`${styles.probRow} ${flashingRows.has(2) ? styles.probRowFlash : ''} ${dominantIndex === 2 ? styles.probRowDominant : ''}`}>
              <span className={styles.probKey} style={{ color: 'var(--accent-yellow)' }}>
                '{CHARS[2]}'
              </span>
              <div className={styles.probBarTrack}>
                <div className={styles.probBarC} style={{ width: `${Math.min(100, probs[2] * 100)}%` }} />
              </div>
              <span className={`${styles.probVal} ${flashingRows.has(2) ? styles.probValFlash : ''}`}>
                {(animatedProbs[2] * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Controls - consolidated logits + temperature */}
        <div className={`${styles.sliderPanel} panel-dark inset-box`}>
          <div className={styles.controlsHeader}>
            <div className={styles.scenario}>
              <span className={styles.scenarioLabel}>Context</span>
              <span className={styles.scenarioValue}>after <strong>"th"</strong></span>
            </div>
            <div className={`${styles.tempControl} ${attemptLocked ? styles.disabled : ''}`}>
              <label className={styles.tempLabel} htmlFor="temperature">
                <span className={styles.tempName}>T</span>
                <span
                  key={valuePulseId.T}
                  className={`${styles.tempValue} ${valuePulseId.T > 0 ? styles.logitValuePulse : ''}`}
                >
                  {temperature.toFixed(1)}
                </span>
              </label>
              <input
                id="temperature"
                type="range"
                className={styles.tempSlider}
                min={0.1}
                max={5}
                step={0.1}
                value={temperature}
                onChange={(e) => {
                  setTemperature(parseFloat(e.target.value))
                  setValuePulseId(prev => ({ ...prev, T: prev.T + 1 }))
                }}
                onPointerDown={() => setActiveSlider('T')}
                onPointerUp={() => setActiveSlider(null)}
                onPointerLeave={() => setActiveSlider(null)}
                disabled={attemptLocked}
                aria-label="Temperature parameter"
              />
            </div>
          </div>

          <div className={styles.logitsSection}>
            <div className={styles.sectionTitle}>Logits</div>

            <div className={`${styles.sliderGroup} ${attemptLocked ? styles.disabled : ''}`}>
              <label className={styles.sliderLabel} htmlFor="logitA">
                <span className={styles.logitName} style={{ color: 'var(--accent-cyan)' }}>'{CHARS[0]}'</span>
                <span
                  key={valuePulseId.A}
                  className={`${styles.logitValue} ${valuePulseId.A > 0 ? styles.logitValuePulse : ''}`}
                >
                  {logitA.toFixed(1)}
                </span>
              </label>
              <input
                id="logitA"
                type="range"
                className={styles.logitSlider}
                min={-10}
                max={10}
                step={0.1}
                value={logitA}
                onChange={(e) => {
                  setLogitA(parseFloat(e.target.value))
                  setValuePulseId(prev => ({ ...prev, A: prev.A + 1 }))
                }}
                onPointerDown={() => setActiveSlider('A')}
                onPointerUp={() => setActiveSlider(null)}
                onPointerLeave={() => setActiveSlider(null)}
                disabled={attemptLocked}
                aria-label={`Score for character ${CHARS[0]}`}
                style={{
                  '--slider-color': 'rgba(0, 217, 255, 0.5)',
                  '--slider-rgb': '0, 217, 255',
                  '--slider-progress': `${((logitA + 10) / 20) * 100}%`,
                } as React.CSSProperties}
              />
              {attemptLocked && <span className={styles.lockIcon}>&#128274;</span>}
            </div>

            <div className={`${styles.sliderGroup} ${attemptLocked ? styles.disabled : ''}`}>
              <label className={styles.sliderLabel} htmlFor="logitB">
                <span className={styles.logitName} style={{ color: 'var(--accent-magenta)' }}>'{CHARS[1]}'</span>
                <span
                  key={valuePulseId.B}
                  className={`${styles.logitValue} ${valuePulseId.B > 0 ? styles.logitValuePulse : ''}`}
                >
                  {logitB.toFixed(1)}
                </span>
              </label>
              <input
                id="logitB"
                type="range"
                className={styles.logitSlider}
                min={-10}
                max={10}
                step={0.1}
                value={logitB}
                onChange={(e) => {
                  setLogitB(parseFloat(e.target.value))
                  setValuePulseId(prev => ({ ...prev, B: prev.B + 1 }))
                }}
                onPointerDown={() => setActiveSlider('B')}
                onPointerUp={() => setActiveSlider(null)}
                onPointerLeave={() => setActiveSlider(null)}
                disabled={attemptLocked}
                aria-label={`Score for character ${CHARS[1]}`}
                style={{
                  '--slider-color': 'rgba(255, 0, 110, 0.5)',
                  '--slider-rgb': '255, 0, 110',
                  '--slider-progress': `${((logitB + 10) / 20) * 100}%`,
                } as React.CSSProperties}
              />
              {attemptLocked && <span className={styles.lockIcon}>&#128274;</span>}
            </div>

            <div className={`${styles.sliderGroup} ${attemptLocked ? styles.disabled : ''}`}>
              <label className={styles.sliderLabel} htmlFor="logitC">
                <span className={styles.logitName} style={{ color: 'var(--accent-yellow)' }}>'{CHARS[2]}'</span>
                <span
                  key={valuePulseId.C}
                  className={`${styles.logitValue} ${valuePulseId.C > 0 ? styles.logitValuePulse : ''}`}
                >
                  {logitC.toFixed(1)}
                </span>
              </label>
              <input
                id="logitC"
                type="range"
                className={styles.logitSlider}
                min={-10}
                max={10}
                step={0.1}
                value={logitC}
                onChange={(e) => {
                  setLogitC(parseFloat(e.target.value))
                  setValuePulseId(prev => ({ ...prev, C: prev.C + 1 }))
                }}
                onPointerDown={() => setActiveSlider('C')}
                onPointerUp={() => setActiveSlider(null)}
                onPointerLeave={() => setActiveSlider(null)}
                disabled={attemptLocked}
                aria-label={`Score for character ${CHARS[2]}`}
                style={{
                  '--slider-color': 'rgba(255, 201, 71, 0.5)',
                  '--slider-rgb': '255, 201, 71',
                  '--slider-progress': `${((logitC + 10) / 20) * 100}%`,
                } as React.CSSProperties}
              />
              {attemptLocked && <span className={styles.lockIcon}>&#128274;</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Footer - consolidated action row + explanation */}
      <div className={styles.footer}>
        <button className={styles.clearBtn} type="button" onClick={() => setTrail([point])} aria-label="Clear trail">
          Clear trail
        </button>
        <span className={styles.footerExplanation} key={explanationKey}>
          {temperature < 0.5 && (
            <>
              <strong>Cold (T={temperature.toFixed(1)}):</strong> almost all probability piles onto the winner.
            </>
          )}
          {temperature >= 0.5 && temperature <= 2 && (
            <>
              <strong>Medium (T={temperature.toFixed(1)}):</strong> probabilities track score gaps.
            </>
          )}
          {temperature > 2 && (
            <>
              <strong>Hot (T={temperature.toFixed(1)}):</strong> the distribution relaxes toward uniform.
            </>
          )}
        </span>
      </div>
    </VizCard>
  )
}
