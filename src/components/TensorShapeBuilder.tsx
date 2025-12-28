import { useMemo, useState, useRef, useLayoutEffect, useCallback, useId, useEffect } from 'react'
import { Slider } from './Slider'
import styles from './TensorShapeBuilder.module.css'

/** Generate a smooth SVG path through points using Catmull-Rom to Bezier conversion */
function generateSmoothPath(
  values: number[],
  width: number,
  height: number,
  tension: number = 0.3
): { linePath: string; areaPathPositive: string; areaPathNegative: string } {
  if (values.length < 2) {
    return { linePath: '', areaPathPositive: '', areaPathNegative: '' }
  }

  const midY = height / 2
  const scaleY = height * 0.4 // 40% in each direction from center

  // Map values to points
  const points = values.map((v, i) => ({
    x: (i / (values.length - 1)) * width,
    y: midY - v * scaleY,
  }))

  // Generate smooth bezier path using Catmull-Rom spline conversion
  let linePath = `M ${points[0].x} ${points[0].y}`

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[Math.min(points.length - 1, i + 2)]

    // Calculate control points
    const cp1x = p1.x + (p2.x - p0.x) * tension
    const cp1y = p1.y + (p2.y - p0.y) * tension
    const cp2x = p2.x - (p3.x - p1.x) * tension
    const cp2y = p2.y - (p3.y - p1.y) * tension

    linePath += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`
  }

  // Create area paths for positive and negative regions
  // Positive area: from center line up to the wave (where wave is above center)
  // Negative area: from center line down to the wave (where wave is below center)

  // For simplicity, we create a single area path that fills to center
  const areaPathPositive = linePath + ` L ${width} ${midY} L 0 ${midY} Z`
  const areaPathNegative = linePath + ` L ${width} ${midY} L 0 ${midY} Z`

  return { linePath, areaPathPositive, areaPathNegative }
}

interface WaveformProps {
  values: number[]
  width?: number
  height?: number
  className?: string
}

interface AnimatedWaveformProps extends WaveformProps {
  /** If true, skip the draw-in animation (used when morphing) */
  skipDrawAnimation?: boolean
}

function Waveform({ values, width = 200, height = 64, className, skipDrawAnimation }: AnimatedWaveformProps) {
  const id = useId()
  // Don't memoize - we want to re-render every frame during animation
  const { linePath, areaPathPositive } = generateSmoothPath(values, width, height, 0.25)

  const midY = height / 2

  return (
    <svg
      className={`${styles.waveformSvg} ${className ?? ''}`}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        {/* Gradient for the stroke based on Y position */}
        <linearGradient id={`${id}-strokeGrad`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255, 0, 110, 0.95)" />
          <stop offset="50%" stopColor="rgba(180, 80, 180, 0.85)" />
          <stop offset="100%" stopColor="rgba(0, 217, 255, 0.95)" />
        </linearGradient>

        {/* Gradient fill for area under curve - positive region */}
        <linearGradient id={`${id}-areaGrad`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255, 0, 110, 0.18)" />
          <stop offset="50%" stopColor="rgba(128, 128, 192, 0.05)" />
          <stop offset="100%" stopColor="rgba(0, 217, 255, 0.18)" />
        </linearGradient>

        {/* Glow filter */}
        <filter id={`${id}-glow`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Center baseline */}
      <line
        x1="0"
        y1={midY}
        x2={width}
        y2={midY}
        className={styles.waveformBaseline}
      />

      {/* Area fill */}
      <path
        d={areaPathPositive}
        fill={`url(#${id}-areaGrad)`}
        className={skipDrawAnimation ? styles.waveformAreaMorphing : styles.waveformArea}
      />

      {/* Main waveform line */}
      <path
        d={linePath}
        stroke={`url(#${id}-strokeGrad)`}
        className={skipDrawAnimation ? styles.waveformLineMorphing : styles.waveformLine}
        filter={`url(#${id}-glow)`}
      />
    </svg>
  )
}

/** Mini waveform for grid cells */
function MiniWaveform({ values, width = 60, height = 28 }: WaveformProps) {
  const id = useId()
  const { linePath } = useMemo(
    () => generateSmoothPath(values, width, height, 0.2),
    [values, width, height]
  )

  return (
    <svg
      className={styles.miniWaveformSvg}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`${id}-miniStroke`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255, 0, 110, 0.85)" />
          <stop offset="50%" stopColor="rgba(180, 80, 180, 0.7)" />
          <stop offset="100%" stopColor="rgba(0, 217, 255, 0.85)" />
        </linearGradient>
      </defs>
      <path
        d={linePath}
        stroke={`url(#${id}-miniStroke)`}
        className={styles.miniWaveformLine}
      />
    </svg>
  )
}

const VOCAB = [
  ' ',
  'a',
  'b',
  'c',
  'd',
  'e',
  'f',
  'g',
  'h',
  'i',
  'j',
  'k',
  'l',
  'm',
  'n',
  'o',
  'p',
  'q',
  'r',
  's',
  't',
  'u',
  'v',
  'w',
  'x',
  'y',
  'z',
]

const SAMPLE_TEXT = normalizeToVocab(`the cat sat on the mat
the quick brown fox jumps over the lazy dog
it is a truth universally acknowledged`)

function prettyChar(c: string): string {
  return c === ' ' ? '␣' : c
}

function makeVocabIndex(vocab: string[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (let i = 0; i < vocab.length; i++) out[vocab[i]] = i
  return out
}

function normalizeToVocab(text: string): string {
  const lower = text.toLowerCase()
  let out = ''
  let lastWasSpace = true

  for (const ch of lower) {
    const isLetter = ch >= 'a' && ch <= 'z'
    if (isLetter) {
      out += ch
      lastWasSpace = false
      continue
    }

    if (!lastWasSpace) {
      out += ' '
      lastWasSpace = true
    }
  }

  return out.trim()
}

function mulberry32(seed: number) {
  return function random() {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n))
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

/** Hook to animate between arrays of numbers */
function useAnimatedValues(targetValues: number[], duration: number = 300): number[] {
  const [animatedValues, setAnimatedValues] = useState<number[]>(targetValues)
  const prevValuesRef = useRef<number[]>(targetValues)
  const animationRef = useRef<number | null>(null)
  const startTimeRef = useRef<number | null>(null)

  useEffect(() => {
    const prevValues = prevValuesRef.current
    const newValues = targetValues

    // Cancel any ongoing animation
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current)
    }

    // If lengths differ, we need special handling
    const maxLen = Math.max(prevValues.length, newValues.length)
    const paddedPrev = [...prevValues]
    const paddedNew = [...newValues]

    // Pad shorter array with zeros (for fade in/out effect)
    while (paddedPrev.length < maxLen) paddedPrev.push(0)
    while (paddedNew.length < maxLen) paddedNew.push(0)

    startTimeRef.current = null

    const animate = (timestamp: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp
      }

      const elapsed = timestamp - startTimeRef.current
      const progress = Math.min(elapsed / duration, 1)
      const easedProgress = easeOutCubic(progress)

      const interpolated = paddedNew.map((newVal, i) =>
        lerp(paddedPrev[i], newVal, easedProgress)
      )

      // Trim to target length once animation is complete
      if (progress >= 1) {
        setAnimatedValues(newValues)
        prevValuesRef.current = newValues
      } else {
        setAnimatedValues(interpolated.slice(0, newValues.length))
        animationRef.current = requestAnimationFrame(animate)
      }
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [targetValues, duration])

  // Update ref when target changes (for next animation start point)
  useEffect(() => {
    return () => {
      prevValuesRef.current = animatedValues
    }
  }, [animatedValues])

  return animatedValues
}

function embedValue(tokenId: number, dim: number) {
  // Deterministic “fake embedding”: stable per (tokenId, dim).
  // Range is roughly [-1, 1].
  const a = Math.sin((tokenId + 1) * 1337 + (dim + 1) * 97)
  const b = Math.sin((tokenId + 1) * 31 + (dim + 1) * 211)
  return clamp((a + b) * 0.5, -1, 1)
}

interface PathCoords {
  startX: number
  startY: number
  endX: number
  endY: number
}

export function TensorShapeBuilder() {
  const [batchSize, setBatchSize] = useState(3)
  const [timeSteps, setTimeSteps] = useState(6)
  const [embedDim, setEmbedDim] = useState(8)
  const [seed, setSeed] = useState(1)
  const [focus, setFocus] = useState({ b: 0, t: 0 })
  const [pathCoords, setPathCoords] = useState<PathCoords | null>(null)
  const [pathKey, setPathKey] = useState(0)
  const [glowPulse, setGlowPulse] = useState(false)

  const stageRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const selectionRef = useRef<HTMLDivElement>(null)

  const vocabIndex = useMemo(() => makeVocabIndex(VOCAB), [])

  const { chars, ids } = useMemo(() => {
    const rng = mulberry32(seed)
    const text = SAMPLE_TEXT
    const B = batchSize
    const T = timeSteps
    const outChars: string[][] = []
    const outIds: number[][] = []

    for (let b = 0; b < B; b++) {
      const start = Math.floor(rng() * Math.max(1, text.length - T))
      const slice = text.slice(start, start + T).padEnd(T, ' ')
      const rowChars = [...slice]
      const rowIds = rowChars.map(ch => vocabIndex[ch] ?? 0)
      outChars.push(rowChars)
      outIds.push(rowIds)
    }

    return { chars: outChars, ids: outIds }
  }, [batchSize, timeSteps, seed, vocabIndex])

  const focusB = clamp(focus.b, 0, batchSize - 1)
  const focusT = clamp(focus.t, 0, timeSteps - 1)
  const focusId = ids[focusB]?.[focusT] ?? 0
  const focusChar = VOCAB[focusId] ?? ' '
  const focusVec = useMemo(
    () => Array.from({ length: embedDim }, (_, i) => embedValue(focusId, i)),
    [focusId, embedDim],
  )

  // Animate the waveform values for smooth morphing
  const animatedVec = useAnimatedValues(focusVec, 300)

  // Calculate glow position and color based on selection
  const glowXOffset = timeSteps > 1 ? (focusT / (timeSteps - 1)) * 100 - 50 : 0 // -50 to +50 range
  const glowYOffset = batchSize > 1 ? (focusB / (batchSize - 1)) * 40 - 20 : 0 // -20 to +20 range

  // Calculate color balance from embedding values
  const colorBalance = focusVec.reduce((sum, v) => sum + v, 0) / focusVec.length
  // balance > 0 = more magenta, balance < 0 = more cyan
  const cyanOpacity = colorBalance < 0 ? 0.25 : 0.15
  const magentaOpacity = colorBalance > 0 ? 0.22 : 0.10

  // Trigger pulse effect when selection changes
  useEffect(() => {
    setGlowPulse(true)
    const timer = setTimeout(() => setGlowPulse(false), 400)
    return () => clearTimeout(timer)
  }, [focusB, focusT])

  // Track whether we've completed the initial draw animation
  // After initial draw, we skip draw animation and just morph
  const [hasInitiallyDrawn, setHasInitiallyDrawn] = useState(false)

  // After initial render, mark as drawn so subsequent changes morph instead of redrawing
  useEffect(() => {
    const timer = setTimeout(() => {
      setHasInitiallyDrawn(true)
    }, 600) // Wait for draw animation to complete
    return () => clearTimeout(timer)
  }, [])

  const sameTokenCount = useMemo(() => {
    let n = 0
    for (const row of ids) {
      for (const id of row) if (id === focusId) n++
    }
    return n
  }, [focusId, ids])

  const isSameToken = (b: number, t: number) => ids[b]?.[t] === focusId

  const updatePathCoords = useCallback(() => {
    if (!stageRef.current || !gridRef.current || !selectionRef.current) return

    const stageRect = stageRef.current.getBoundingClientRect()
    const selectionRect = selectionRef.current.getBoundingClientRect()

    // Find the selected cell
    const cellIndex = focusB * timeSteps + focusT
    const cells = gridRef.current.querySelectorAll('button')
    const selectedCell = cells[cellIndex]
    if (!selectedCell) return

    const cellRect = selectedCell.getBoundingClientRect()

    // Calculate positions relative to stage
    const startX = cellRect.right - stageRect.left
    const startY = cellRect.top + cellRect.height / 2 - stageRect.top
    const endX = selectionRect.left - stageRect.left
    const endY = selectionRect.top + selectionRect.height / 2 - stageRect.top

    setPathCoords({ startX, startY, endX, endY })
    setPathKey(k => k + 1)
  }, [focusB, focusT, timeSteps])

  useLayoutEffect(() => {
    updatePathCoords()
  }, [updatePathCoords, batchSize, timeSteps, focus])

  // Also update on window resize
  useLayoutEffect(() => {
    const handleResize = () => updatePathCoords()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [updatePathCoords])

  const renderConnectionPath = () => {
    if (!pathCoords) return null

    const { startX, startY, endX, endY } = pathCoords
    const dx = endX - startX
    const controlOffset = Math.min(dx * 0.4, 80)

    // Cubic bezier with control points that create a smooth S-curve
    const path = `M ${startX} ${startY} C ${startX + controlOffset} ${startY}, ${endX - controlOffset} ${endY}, ${endX} ${endY}`

    return (
      <svg className={styles.connectionSvg} aria-hidden="true">
        <defs>
          <filter id="connectionGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <path
          key={pathKey}
          d={path}
          className={styles.connectionPath}
          filter="url(#connectionGlow)"
        />
        <circle
          key={`dot-${pathKey}`}
          r="4"
          className={styles.connectionDot}
        >
          <animateMotion
            dur="0.6s"
            repeatCount="1"
            path={path}
            begin="0.1s"
          />
        </circle>
      </svg>
    )
  }

  return (
    <div className={styles.container}>
      <div
        className={`${styles.ambientGlow} ${glowPulse ? styles.ambientGlowPulse : ''}`}
        style={{
          transform: `translate(${glowXOffset}px, ${glowYOffset}px)`,
          '--glow-cyan-opacity': cyanOpacity,
          '--glow-magenta-opacity': magentaOpacity,
        } as React.CSSProperties}
      />

      <div className={styles.controls}>
        <div className={styles.shapeMini} aria-label="Shape summary">
          <span className={styles.shapeToken}>X</span>
          <span className={styles.shapeBrackets}>
            [{batchSize}, {timeSteps}]
          </span>
          <span className={styles.shapeArrow} aria-hidden="true">
            →
          </span>
          <span className={styles.shapeToken}>X_emb</span>
          <span className={styles.shapeBrackets}>
            [{batchSize}, {timeSteps}, {embedDim}]
          </span>
        </div>
        <label className={styles.control}>
          <span className={styles.controlLabel}>B (batch)</span>
          <Slider
            wrap={false}
            min={1}
            max={5}
            step={1}
            value={batchSize}
            onValueChange={(v) => {
              const next = Math.round(v)
              setBatchSize(next)
              setFocus((f) => ({ ...f, b: clamp(f.b, 0, next - 1) }))
            }}
            ariaLabel="Batch size"
          />
          <span className={styles.controlValue}>{batchSize}</span>
        </label>

        <label className={styles.control}>
          <span className={styles.controlLabel}>T (positions)</span>
          <Slider
            wrap={false}
            min={2}
            max={8}
            step={1}
            value={timeSteps}
            onValueChange={(v) => {
              const next = Math.round(v)
              setTimeSteps(next)
              setFocus((f) => ({ ...f, t: clamp(f.t, 0, next - 1) }))
            }}
            ariaLabel="Time steps"
          />
          <span className={styles.controlValue}>{timeSteps}</span>
        </label>

        <label className={styles.control}>
          <span className={styles.controlLabel}>D (features)</span>
          <Slider
            wrap={false}
            min={4}
            max={16}
            step={1}
            value={embedDim}
            onValueChange={(v) => setEmbedDim(Math.round(v))}
            ariaLabel="Embedding dimension"
          />
          <span className={styles.controlValue}>{embedDim}</span>
        </label>

        <button
          type="button"
          className={styles.reshuffleBtn}
          onClick={() => setSeed((s) => s + 1)}
        >
          new batch
        </button>
      </div>

      <div className={styles.stage} ref={stageRef}>
        {renderConnectionPath()}
        <div className={styles.card}>
          <div className={styles.cardTitle}>
            <span className={styles.cardKicker}>1</span> IDs <span className={styles.cardShape}>X[b, t]</span>
          </div>
          <div
            ref={gridRef}
            className={styles.grid}
            style={{ gridTemplateColumns: `repeat(${timeSteps}, minmax(0, 1fr))` }}
            aria-label="Input ID grid"
          >
            {ids.map((row, b) =>
              row.map((id, t) => {
                const active = b === focusB && t === focusT
                const same = isSameToken(b, t)
                return (
                  <button
                    key={`${b}-${t}`}
                    type="button"
                    className={`${styles.cell} ${active ? styles.active : ''} ${same ? styles.same : ''}`}
                    onClick={() => setFocus({ b, t })}
                    aria-label={`X[${b}, ${t}] = ${id} (${prettyChar(chars[b][t])})`}
                  >
                    <span className={styles.cellChar}>{prettyChar(chars[b][t])}</span>
                    <span className={styles.cellId}>{id}</span>
                  </button>
                )
              }),
            )}
          </div>
          <div className={styles.axisHint}>
            <span className={styles.axisTag}>B</span> goes down. <span className={styles.axisTag}>T</span> (position) goes right.
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardTitle}>
            <span className={styles.cardKicker}>2</span> lookup → vector <span className={styles.cardShape}>X_emb[b, t, :]</span>
          </div>
          <div className={styles.selection} ref={selectionRef}>
            <div className={styles.selectionRow}>
              <span className={styles.selectionKey}>Selected</span>
              <span className={styles.selectionVal}>
                [b={focusB}, t={focusT}]
              </span>
            </div>
            <div className={styles.selectionRow}>
              <span className={styles.selectionKey}>ID</span>
              <span className={styles.selectionVal}>
                {focusId} <span className={styles.selectionChar}>({prettyChar(focusChar)})</span>
              </span>
            </div>
            <div className={styles.formula} aria-label="Lookup formula">
              X_emb[b, t, :] = E[X[b, t]]
            </div>
          <div className={styles.selectionHint}>Same ID → same row in E.</div>
          </div>

          <div className={styles.vectorInline} aria-label="Selected embedding vector">
            <div className={styles.waveformContainer}>
              <Waveform
                values={animatedVec}
                width={200}
                height={64}
                skipDrawAnimation={hasInitiallyDrawn}
              />
            </div>
            <div className={styles.vectorHint}>
              That cell now holds <span className={styles.axisTag}>D</span> numbers. You usually never read them — you just
              multiply them by things.
            </div>
            <details className={`collapsible ${styles.vectorDetails}`}>
              <summary>Show the numeric values</summary>
              <div className={styles.valueGrid}>
                {animatedVec.map((v, i) => (
                  <div key={i} className={`${styles.valueChip} ${v >= 0 ? styles.valueChipPos : styles.valueChipNeg}`}>
                    d{i}: {v.toFixed(2)}
                  </div>
                ))}
              </div>
            </details>
          </div>

          <div className={styles.detailNote}>
            This ID shows up <strong>{sameTokenCount}</strong> time{sameTokenCount === 1 ? '' : 's'} in the batch. Every one of those cells
            looks up the same row.
          </div>
        </div>
      </div>

      <details className={`collapsible ${styles.fullTensor}`}>
        <summary>Show the full tensor: X_emb[b, t, :]</summary>
        <div
          className={styles.grid}
          style={{ gridTemplateColumns: `repeat(${timeSteps}, minmax(0, 1fr))` }}
          aria-label="Embedding tensor grid"
        >
          {ids.map((row, b) =>
            row.map((id, t) => {
              const active = b === focusB && t === focusT
              const same = isSameToken(b, t)
              const vec = Array.from({ length: embedDim }, (_, i) => embedValue(id, i))
              return (
                <button
                  key={`${b}-${t}`}
                  type="button"
                  className={`${styles.cell} ${styles.embCell} ${active ? styles.active : ''} ${same ? styles.same : ''}`}
                  onClick={() => setFocus({ b, t })}
                  aria-label={`X_emb[${b}, ${t}, :] for token ${id}`}
                >
                  <MiniWaveform values={vec} width={60} height={28} />
                  <div className={styles.embBadge}>{prettyChar(VOCAB[id] ?? ' ')}</div>
                </button>
              )
            }),
          )}
        </div>
        <div className={styles.axisHint}>
          Each cell contains <span className={styles.axisTag}>D</span> numbers. Most of the time, you never look at them directly — you just
          multiply them by things.
        </div>
      </details>
    </div>
  )
}
