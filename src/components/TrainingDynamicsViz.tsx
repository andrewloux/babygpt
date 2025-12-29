import { useMemo, useState, useCallback, useEffect, useRef } from 'react'
import { Slider } from './Slider'
import styles from './TrainingDynamicsViz.module.css'
import { VOCAB, prettyChar } from '../data/characterData'
import { VizCard } from './VizCard'

type Vec2 = { x: number; y: number }

type TrainingSnapshot = {
  epoch: number
  lossBits: number
  perplexity: number
  positions: Vec2[]
}

type TrainingRun = {
  dim: number
  epochs: number
  pairsUsed: number
  pairsTotal: number
  snapshots: TrainingSnapshot[]
  embeddings: Float32Array[][]  // Raw embeddings at each epoch for text generation
}

type TrainingDynamicsVizProps = {
  corpus: string
}

const VOWELS = new Set(['a', 'e', 'i', 'o', 'u'])
const RARE = new Set(['j', 'k', 'q', 'x', 'z'])
const COMMON = new Set(['t', 'n', 's', 'r', 'l', 'h', 'd'])

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function seededRng(seed: number) {
  // Mulberry32
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let x = t
    x = Math.imul(x ^ (x >>> 15), x | 1)
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61)
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
}

function randn(rng: () => number) {
  // Box–Muller
  const u1 = Math.max(1e-12, rng())
  const u2 = rng()
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
}

function cleanToCharVocab(text: string): string {
  return text.toLowerCase().replace(/[^a-z ]/g, ' ')
}

function buildPairs(cleaned: string): [number, number][] {
  const charToIndex = new Map<string, number>()
  for (let i = 0; i < VOCAB.length; i++) charToIndex.set(VOCAB[i], i)

  const padded = ` ${cleaned}`
  const pairs: [number, number][] = []
  for (let i = 1; i < padded.length; i++) {
    const a = charToIndex.get(padded[i - 1])
    const b = charToIndex.get(padded[i])
    if (a === undefined || b === undefined) continue
    pairs.push([a, b])
  }
  return pairs
}

function dot(a: Float32Array, b: Float32Array): number {
  let s = 0
  for (let i = 0; i < a.length; i++) s += a[i] * b[i]
  return s
}

function normalize(v: number[]): number[] {
  let n2 = 0
  for (let i = 0; i < v.length; i++) n2 += v[i] * v[i]
  const n = Math.sqrt(n2) || 1
  const out = new Array(v.length).fill(0)
  for (let i = 0; i < v.length; i++) out[i] = v[i] / n
  return out
}

function powerIteration(cov: number[][], iters: number, seed: number): { vec: number[]; value: number } {
  const D = cov.length
  const rng = seededRng(seed)
  let v = new Array(D).fill(0).map(() => (rng() - 0.5) * 2)
  v = normalize(v)

  const tmp = new Array(D).fill(0)
  for (let iter = 0; iter < iters; iter++) {
    for (let i = 0; i < D; i++) {
      let s = 0
      const row = cov[i]
      for (let j = 0; j < D; j++) s += row[j] * v[j]
      tmp[i] = s
    }
    v = normalize(tmp)
  }

  // Rayleigh quotient for eigenvalue estimate
  const cv = new Array(D).fill(0)
  for (let i = 0; i < D; i++) {
    let s = 0
    const row = cov[i]
    for (let j = 0; j < D; j++) s += row[j] * v[j]
    cv[i] = s
  }
  let lambda = 0
  for (let i = 0; i < D; i++) lambda += v[i] * cv[i]
  return { vec: v, value: lambda }
}

function computePcaBasis(embeddings: Float32Array[]): {
  mean: number[]
  pc1: number[]
  pc2: number[]
} {
  const V = embeddings.length
  const D = embeddings[0]?.length ?? 0

  const mean = new Array(D).fill(0)
  for (const row of embeddings) {
    for (let d = 0; d < D; d++) mean[d] += row[d]
  }
  for (let d = 0; d < D; d++) mean[d] /= Math.max(1, V)

  const cov: number[][] = Array.from({ length: D }, () => new Array(D).fill(0))
  for (const row of embeddings) {
    for (let i = 0; i < D; i++) {
      const xi = row[i] - mean[i]
      for (let j = 0; j < D; j++) {
        cov[i][j] += xi * (row[j] - mean[j])
      }
    }
  }
  const denom = Math.max(1, V)
  for (let i = 0; i < D; i++) for (let j = 0; j < D; j++) cov[i][j] /= denom

  const first = powerIteration(cov, 60, 7)
  const pc1 = first.vec

  // Deflate: C2 = C - λ v v^T
  const cov2: number[][] = Array.from({ length: D }, (_, i) =>
    cov[i].map((x, j) => x - first.value * pc1[i] * pc1[j]),
  )
  const second = powerIteration(cov2, 60, 19)
  const pc2 = second.vec

  return { mean, pc1, pc2 }
}

function trainAndProject(corpus: string): TrainingRun {
  const cleaned = cleanToCharVocab(corpus)
  const allPairs = buildPairs(cleaned)
  const maxPairs = 900
  const pairs: [number, number][] =
    allPairs.length <= maxPairs
      ? allPairs
      : Array.from({ length: maxPairs }, (_, i) => allPairs[Math.floor((i * allPairs.length) / maxPairs)]).filter(
          (x): x is [number, number] => x !== undefined,
        )

  const V = VOCAB.length
  const dim = 16
  const epochs = 260
  const lr = 0.08
  const initScale = 0.35

  const rng = seededRng(1337)
  const E: Float32Array[] = Array.from({ length: V }, () => {
    const row = new Float32Array(dim)
    for (let d = 0; d < dim; d++) row[d] = randn(rng) * initScale
    return row
  })

  const snapshotsE: Float32Array[][] = []
  const lossBitsByEpoch: number[] = []

  const copyE = (src: Float32Array[]) => src.map((r) => r.slice())
  snapshotsE.push(copyE(E))

  const scores = new Float32Array(V)
  const probs = new Float32Array(V)
  const centroid = new Float32Array(dim)
  const ctxBefore = new Float32Array(dim)

  for (let epoch = 0; epoch < epochs; epoch++) {
    let totalLossNat = 0

    for (let p = 0; p < pairs.length; p++) {
      const [ctxIdx, tgtIdx] = pairs[p]
      const ctxRow = E[ctxIdx]
      for (let d = 0; d < dim; d++) ctxBefore[d] = ctxRow[d]

      let max = -Infinity
      for (let j = 0; j < V; j++) {
        const s = dot(ctxBefore, E[j])
        scores[j] = s
        if (s > max) max = s
      }

      let sumExp = 0
      for (let j = 0; j < V; j++) {
        const e = Math.exp(scores[j] - max)
        probs[j] = e
        sumExp += e
      }
      const invSum = sumExp > 0 ? 1 / sumExp : 0
      for (let j = 0; j < V; j++) probs[j] *= invSum

      const pTrue = Math.max(1e-12, probs[tgtIdx])
      totalLossNat += -Math.log(pTrue)

      centroid.fill(0)
      for (let j = 0; j < V; j++) {
        const pj = probs[j]
        if (pj === 0) continue
        const row = E[j]
        for (let d = 0; d < dim; d++) centroid[d] += pj * row[d]
      }

      // Context update: ∂L/∂E[ctx] = predicted_centroid − E[target]
      const tgtRow = E[tgtIdx]
      for (let d = 0; d < dim; d++) {
        ctxRow[d] -= lr * (centroid[d] - tgtRow[d])
      }

      // Target updates for tied embeddings: ∂L/∂E[j] = (p_j − 1{j=tgt}) * E[ctx]
      for (let j = 0; j < V; j++) {
        const coeff = probs[j] - (j === tgtIdx ? 1 : 0)
        if (coeff === 0) continue
        const row = E[j]
        for (let d = 0; d < dim; d++) row[d] -= lr * coeff * ctxBefore[d]
      }
    }

    const avgBits = (totalLossNat / Math.max(1, pairs.length)) / Math.LN2
    lossBitsByEpoch.push(avgBits)
    snapshotsE.push(copyE(E))
  }

  const { mean, pc1, pc2 } = computePcaBasis(snapshotsE[snapshotsE.length - 1] ?? E)

  const rawPositionsByEpoch: Vec2[][] = snapshotsE.map((snapshot) =>
    snapshot.map((row) => {
      let x = 0
      let y = 0
      for (let d = 0; d < dim; d++) {
        const v = row[d] - mean[d]
        x += v * pc1[d]
        y += v * pc2[d]
      }
      return { x, y }
    }),
  )

  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (const epochPos of rawPositionsByEpoch) {
    for (const p of epochPos) {
      minX = Math.min(minX, p.x)
      maxX = Math.max(maxX, p.x)
      minY = Math.min(minY, p.y)
      maxY = Math.max(maxY, p.y)
    }
  }
  const spanX = maxX - minX || 1
  const spanY = maxY - minY || 1
  const pad = 0.09

  const snapshots: TrainingSnapshot[] = rawPositionsByEpoch.map((epochPos, i) => {
    const positions: Vec2[] = epochPos.map((p) => ({
      x: clamp(pad + ((p.x - minX) / spanX) * (1 - 2 * pad), 0, 1),
      y: clamp(pad + ((p.y - minY) / spanY) * (1 - 2 * pad), 0, 1),
    }))

    const lossBits = i === 0 ? Math.log2(V) : lossBitsByEpoch[i - 1] ?? Math.log2(V)
    const perplexity = Math.pow(2, lossBits)
    return { epoch: i, lossBits, perplexity, positions }
  })

  return { dim, epochs, pairsUsed: pairs.length, pairsTotal: allPairs.length, snapshots, embeddings: snapshotsE }
}

function generateText(
  embeddings: Float32Array[],
  startChar: string,
  length: number,
  temperature: number = 1.0
): string {
  let ctxIdx = VOCAB.indexOf(startChar)
  if (ctxIdx < 0) ctxIdx = 0 // fallback to space

  let text = startChar

  for (let step = 0; step < length; step++) {
    const ctxEmb = embeddings[ctxIdx]

    // Compute logits (dot product with all embeddings)
    const logits: number[] = []
    for (let j = 0; j < VOCAB.length; j++) {
      logits.push(dot(ctxEmb, embeddings[j]))
    }

    // Apply temperature and softmax
    const maxLogit = Math.max(...logits)
    const expScores = logits.map((l) => Math.exp((l - maxLogit) / temperature))
    const sumExp = expScores.reduce((a, b) => a + b, 0)
    const probs = expScores.map((e) => e / sumExp)

    // Sample next character
    const r = Math.random()
    let acc = 0
    let nextIdx = 0
    for (let j = 0; j < probs.length; j++) {
      acc += probs[j]
      if (r <= acc) {
        nextIdx = j
        break
      }
    }

    text += VOCAB[nextIdx]
    ctxIdx = nextIdx
  }

  return text
}

export function TrainingDynamicsViz({ corpus }: TrainingDynamicsVizProps) {
  const [epoch, setEpoch] = useState(260) // Default to trained state
  const [prevEpoch, setPrevEpoch] = useState(260)
  const [generatedText, setGeneratedText] = useState('')
  const [displayedText, setDisplayedText] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isThinking, setIsThinking] = useState(false)
  const [temperature, setTemperature] = useState(1.0)
  const animationRef = useRef<number | null>(null)
  const thinkingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevPositionsRef = useRef<Vec2[] | null>(null)
  const hasMovedRef = useRef(false)

  const run = useMemo(() => trainAndProject(corpus), [corpus])
  const clampedEpoch = clamp(epoch, 0, run.epochs)
  const snap = run.snapshots[clampedEpoch] ?? run.snapshots[0]

  // Track previous positions for trails
  useEffect(() => {
    if (clampedEpoch !== prevEpoch) {
      // Capture previous snapshot's positions before updating
      const prevSnap = run.snapshots[prevEpoch]
      if (prevSnap) {
        prevPositionsRef.current = prevSnap.positions.map(p => ({ x: p.x, y: p.y }))
        hasMovedRef.current = true
      }
      setPrevEpoch(clampedEpoch)
    }
  }, [clampedEpoch, prevEpoch, run.snapshots])

  const lossSeries = useMemo(() => run.snapshots.map((s) => s.lossBits), [run.snapshots])
  const lossMin = useMemo(() => Math.min(...lossSeries), [lossSeries])
  const lossMax = useMemo(() => Math.max(...lossSeries), [lossSeries])

  // Scatter config
  const width = 760
  const height = 380
  const margin = 44
  const toX = (x: number) => margin + x * (width - 2 * margin)
  const toY = (y: number) => height - margin - y * (height - 2 * margin)

  // Loss chart config
  const lossWidth = 360
  const lossHeight = 180
  const lossPad = 16
  const lossX = (t: number) => lossPad + t * (lossWidth - 2 * lossPad)
  const lossY = (bits: number) => {
    const denom = (lossMax - lossMin) || 1
    const u = (bits - lossMin) / denom
    return lossHeight - lossPad - u * (lossHeight - 2 * lossPad)
  }

  const lossPath = useMemo(() => {
    if (lossSeries.length === 0) return ''
    let d = `M ${lossX(0)} ${lossY(lossSeries[0] ?? 0)}`
    for (let i = 1; i < lossSeries.length; i++) {
      const t = i / Math.max(1, lossSeries.length - 1)
      d += ` L ${lossX(t)} ${lossY(lossSeries[i] ?? 0)}`
    }
    return d
  }, [lossSeries, lossMax, lossMin])

  // Area path for gradient fill under curve
  const lossAreaPath = useMemo(() => {
    if (lossSeries.length === 0) return ''
    const bottomY = lossHeight - lossPad
    let d = `M ${lossX(0)} ${bottomY}`
    d += ` L ${lossX(0)} ${lossY(lossSeries[0] ?? 0)}`
    for (let i = 1; i < lossSeries.length; i++) {
      const t = i / Math.max(1, lossSeries.length - 1)
      d += ` L ${lossX(t)} ${lossY(lossSeries[i] ?? 0)}`
    }
    d += ` L ${lossX(1)} ${bottomY} Z`
    return d
  }, [lossSeries, lossMax, lossMin])

  // Milestone epochs for markers
  const milestones = useMemo(() => {
    const total = run.epochs
    return [
      { epoch: 0, label: 'random' },
      { epoch: 50, label: 'learning' },
      { epoch: total, label: 'trained' },
    ]
  }, [run.epochs])

  const currentLossX = lossX(clampedEpoch / Math.max(1, run.epochs))
  const currentLossY = lossY(snap?.lossBits ?? 0)

  // Compute trail data (distances and opacities)
  const trailData = useMemo(() => {
    const prevPositions = prevPositionsRef.current
    if (!prevPositions || !hasMovedRef.current || !snap) return null

    return VOCAB.map((_, i) => {
      const prev = prevPositions[i]
      const curr = snap.positions[i]
      if (!prev || !curr) return { distance: 0, opacity: 0 }

      // Distance in normalized [0,1] space
      const dx = curr.x - prev.x
      const dy = curr.y - prev.y
      const distance = Math.sqrt(dx * dx + dy * dy)

      // Scale opacity: barely moved = 0.02, moved a lot = 0.2
      // Max expected movement per epoch step is roughly 0.1 in normalized space
      const normalizedDist = Math.min(distance / 0.1, 1)
      const opacity = 0.02 + normalizedDist * 0.18

      return { distance, opacity, prev, curr }
    })
  }, [snap, prevPositionsRef.current])

  // Typing animation effect with variable speed and thinking indicator
  useEffect(() => {
    if (!generatedText) {
      setDisplayedText('')
      return
    }

    setDisplayedText('')
    setIsThinking(true)

    // Show thinking dots for 400ms before typing starts
    thinkingTimeoutRef.current = setTimeout(() => {
      setIsThinking(false)
      let idx = 0

      const typeChar = () => {
        if (idx < generatedText.length) {
          setDisplayedText(generatedText.slice(0, idx + 1))
          const currentChar = generatedText[idx]
          idx++

          // Variable typing speed: longer pause after spaces (word boundaries)
          const delay = currentChar === ' ' ? 60 : 35

          animationRef.current = requestAnimationFrame(() => {
            setTimeout(typeChar, delay)
          })
        } else {
          setIsGenerating(false)
        }
      }
      typeChar()
    }, 400)

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current)
      }
      if (thinkingTimeoutRef.current !== null) {
        clearTimeout(thinkingTimeoutRef.current)
      }
    }
  }, [generatedText])

  const handleGenerate = useCallback(() => {
    const embeddings = run.embeddings[clampedEpoch]
    if (!embeddings) return

    setIsGenerating(true)
    // Pick a random start character (weighted towards space for natural starts)
    const startChar = Math.random() < 0.7 ? ' ' : VOCAB[Math.floor(Math.random() * VOCAB.length)]
    const text = generateText(embeddings, startChar, 40, temperature)
    setGeneratedText(text)
  }, [run.embeddings, clampedEpoch, temperature])

  return (
    <VizCard
      title="Training Dynamics"
      subtitle="Noise → neighborhoods (2D PCA projection)"
      footer={
        <div className={styles.footerNote}>
          Drag the epoch slider. Early = random. Later = structure. You’re watching the same update rule applied thousands of times.
        </div>
      }
    >
      <div className={styles.content}>
      <div className={`${styles.controls} panel-dark`}>
        <label className={styles.sliderLabel} htmlFor="training-epochs">
          Epoch: <span className={styles.sliderValue}>{clampedEpoch}</span>
          <span className={styles.sliderMeta}>
            (dim {run.dim}, {run.pairsUsed}/{run.pairsTotal} pairs)
          </span>
        </label>
        <Slider
          id="training-epochs"
          wrap={false}
          min={0}
          max={run.epochs}
          step={1}
          value={clampedEpoch}
          onValueChange={(v) => setEpoch(Math.round(v))}
          ariaLabel="Epoch"
        />
        <div className={styles.readoutRow}>
          <div className={styles.readout}>
            <div className={styles.readoutLabel}>Loss (bits/char)</div>
            <div className={styles.readoutValue}>{snap?.lossBits.toFixed(2)}</div>
          </div>
          <div className={styles.readout}>
            <div className={styles.readoutLabel}>Perplexity</div>
            <div className={styles.readoutValue}>{snap?.perplexity.toFixed(1)}</div>
          </div>
        </div>
      </div>

      <div className={styles.stage}>
        <div className={`${styles.scatterCard} panel-dark`}>
          <svg
            className={styles.scatter}
            viewBox={`0 0 ${width} ${height}`}
            role="img"
            aria-label="2D PCA projection of character embeddings during training"
          >
            <rect x="0" y="0" width={width} height={height} rx="14" className={styles.scatterBg} />

            {[0.25, 0.5, 0.75].map((t) => (
              <g key={`grid-${t}`}>
                <line x1={toX(t)} y1={toY(0)} x2={toX(t)} y2={toY(1)} className={styles.gridLine} />
                <line x1={toX(0)} y1={toY(t)} x2={toX(1)} y2={toY(t)} className={styles.gridLine} />
              </g>
            ))}

            {/* Trail lines connecting previous to current positions */}
            {trailData && trailData.map((trail, i) => {
              if (!trail.prev || !trail.curr || trail.distance < 0.001) return null
              return (
                <line
                  key={`trail-${i}`}
                  x1={toX(trail.prev.x)}
                  y1={toY(trail.prev.y)}
                  x2={toX(trail.curr.x)}
                  y2={toY(trail.curr.y)}
                  className={styles.trailLine}
                  style={{ opacity: trail.opacity * 0.5 }}
                />
              )
            })}

            {/* Ghost points at previous positions */}
            {trailData && trailData.map((trail, i) => {
              if (!trail.prev || trail.distance < 0.001) return null
              return (
                <circle
                  key={`ghost-${i}`}
                  cx={toX(trail.prev.x)}
                  cy={toY(trail.prev.y)}
                  r="5"
                  className={styles.ghostPoint}
                  style={{ opacity: trail.opacity }}
                />
              )
            })}

            {VOCAB.map((ch, i) => {
              const p = snap?.positions[i] ?? { x: 0.5, y: 0.5 }
              const isVowel = VOWELS.has(ch)
              const isSpace = ch === ' '
              const isRare = RARE.has(ch)
              const isCommon = COMMON.has(ch)

              const cx = toX(p.x)
              const cy = toY(p.y)

              let cls = styles.point
              if (isSpace) cls = `${styles.point} ${styles.pointSpace}`
              else if (ch === 'q') cls = `${styles.point} ${styles.pointQ}`
              else if (isVowel) cls = `${styles.point} ${styles.pointVowel}`
              else if (isRare) cls = `${styles.point} ${styles.pointRare}`
              else if (isCommon) cls = `${styles.point} ${styles.pointCommon}`

              return (
                <g
                  key={ch}
                  className={styles.pointGroup}
                  style={{
                    transform: `translate(${cx}px, ${cy}px)`,
                    animationDelay: `${0.2 + i * 0.02}s`,
                  }}
                >
                  <circle cx="0" cy="0" r="8" className={cls} />
                  <text x="0" y="4" textAnchor="middle" className={styles.pointLabel}>
                    {prettyChar(ch)}
                  </text>
                </g>
              )
            })}
          </svg>
        </div>

        <div className={`${styles.lossCard} panel-dark`}>
          <div className={styles.lossHeader}>Loss over time</div>
          <svg className={styles.lossSvg} viewBox={`0 0 ${lossWidth} ${lossHeight}`} role="img" aria-label="Loss curve">
            <defs>
              <linearGradient id="lossAreaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(0, 217, 255, 0.15)" />
                <stop offset="100%" stopColor="rgba(0, 217, 255, 0)" />
              </linearGradient>
            </defs>
            <rect x="0" y="0" width={lossWidth} height={lossHeight} rx="14" className={styles.lossBg} />
            {[lossMin, (lossMin + lossMax) / 2, lossMax].map((b, idx) => (
              <g key={`loss-grid-${idx}`}>
                <line x1={lossPad} y1={lossY(b)} x2={lossWidth - lossPad} y2={lossY(b)} className={styles.lossGrid} />
                <text x={lossPad + 2} y={lossY(b) - 4} className={styles.lossTick}>
                  {b.toFixed(1)}b
                </text>
              </g>
            ))}
            {/* Milestone markers */}
            {milestones.map(({ epoch, label }) => {
              const mx = lossX(epoch / Math.max(1, run.epochs))
              return (
                <g key={`milestone-${epoch}`}>
                  <line
                    x1={mx}
                    y1={lossPad}
                    x2={mx}
                    y2={lossHeight - lossPad}
                    className={styles.milestoneLine}
                  />
                  <text x={mx} y={lossPad - 4} className={styles.milestoneLabel} textAnchor="middle">
                    {label}
                  </text>
                </g>
              )
            })}
            {/* Area fill under curve */}
            <path d={lossAreaPath} className={styles.lossArea} />
            {/* Main loss curve with draw animation */}
            <path d={lossPath} className={styles.lossPath} />
            <line
              x1={currentLossX}
              y1={currentLossY}
              x2={currentLossX}
              y2={lossHeight - lossPad}
              className={styles.lossGuide}
            />
            <circle cx={currentLossX} cy={currentLossY} r="5" className={styles.lossPoint} />
          </svg>
          <div className={styles.lossCaption}>
            Start ≈ <span className={styles.mono}>log₂(27)</span> bits (uniform). Training pushes the average down.
          </div>
        </div>
      </div>

      <div className={`${styles.generateSection} panel-dark`}>
        <div className={styles.generateHeader}>Make it speak</div>
        <div className={styles.generateControls}>
          <label className={styles.tempLabel}>
            Temperature: <span className={styles.tempValue}>{temperature.toFixed(1)}</span>
            <span className={styles.tempHint}>(lower = predictable, higher = creative)</span>
          </label>
          <Slider
            id="generation-temperature"
            wrap={false}
            min={0.5}
            max={2.0}
            step={0.1}
            value={temperature}
            onValueChange={setTemperature}
            ariaLabel="Temperature"
          />
          <button
            className={styles.generateButton}
            onClick={handleGenerate}
            disabled={clampedEpoch === 0 || isGenerating}
          >
            {isGenerating ? 'Generating...' : 'Generate'}
          </button>
        </div>
        {(displayedText || isThinking) && (
          <div className={`${styles.generatedOutput} inset-box`}>
            <span className={styles.generatedText}>
              {displayedText.split('').map((char, i) => (
                <span key={i} className={styles.char}>
                  {char}
                </span>
              ))}
            </span>
            {isThinking && (
              <span className={styles.thinkingDots}>
                <span className={styles.thinkingDot} />
                <span className={styles.thinkingDot} />
                <span className={styles.thinkingDot} />
              </span>
            )}
            {isGenerating && !isThinking && <span className={styles.cursor}>|</span>}
          </div>
        )}
        {clampedEpoch === 0 && (
          <div className={styles.generateHint}>Move epoch slider to train the model first</div>
        )}
        {displayedText && !isGenerating && clampedEpoch > 50 && (
          <div className={styles.generateHint}>
            Drag the slider back to epoch 50 — watch structure dissolve into noise.
          </div>
        )}
      </div>

      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <span className={`${styles.swatch} ${styles.swatchVowel}`} /> vowels
        </div>
        <div className={styles.legendItem}>
          <span className={`${styles.swatch} ${styles.swatchCommon}`} /> common consonants
        </div>
        <div className={styles.legendItem}>
          <span className={`${styles.swatch} ${styles.swatchRare}`} /> rare letters
        </div>
        <div className={styles.legendItem}>
          <span className={`${styles.swatch} ${styles.swatchQ}`} /> q
        </div>
        <div className={styles.legendItem}>
          <span className={`${styles.swatch} ${styles.swatchSpace}`} /> space
        </div>
      </div>
      </div>
    </VizCard>
  )
}
