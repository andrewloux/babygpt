import { useMemo, useState } from 'react'
import { Slider } from './Slider'
import styles from './TrainingDynamicsViz.module.css'
import { VOCAB, prettyChar } from '../data/characterData'

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

  return { dim, epochs, pairsUsed: pairs.length, pairsTotal: allPairs.length, snapshots }
}

export function TrainingDynamicsViz({ corpus }: TrainingDynamicsVizProps) {
  const [epoch, setEpoch] = useState(0)

  const run = useMemo(() => trainAndProject(corpus), [corpus])
  const clampedEpoch = clamp(epoch, 0, run.epochs)
  const snap = run.snapshots[clampedEpoch] ?? run.snapshots[0]

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
  const lossWidth = 240
  const lossHeight = 160
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

  const currentLossX = lossX(clampedEpoch / Math.max(1, run.epochs))
  const currentLossY = lossY(snap?.lossBits ?? 0)

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.title}>Training Dynamics (Real Replay)</div>
        <div className={styles.subtitle}>
          Same tiny model, real gradient steps. The picture is a 2D PCA projection.
        </div>
      </div>

      <div className={styles.controls}>
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
        <div className={styles.scatterCard}>
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
                <g key={ch} className={styles.pointGroup}>
                  <circle cx={cx} cy={cy} r="8" className={cls} />
                  <text x={cx} y={cy + 4} textAnchor="middle" className={styles.pointLabel}>
                    {prettyChar(ch)}
                  </text>
                </g>
              )
            })}
          </svg>
        </div>

        <div className={styles.lossCard}>
          <div className={styles.lossHeader}>Loss over time</div>
          <svg className={styles.lossSvg} viewBox={`0 0 ${lossWidth} ${lossHeight}`} role="img" aria-label="Loss curve">
            <rect x="0" y="0" width={lossWidth} height={lossHeight} rx="14" className={styles.lossBg} />
            {[lossMin, (lossMin + lossMax) / 2, lossMax].map((b, idx) => (
              <g key={`loss-grid-${idx}`}>
                <line x1={lossPad} y1={lossY(b)} x2={lossWidth - lossPad} y2={lossY(b)} className={styles.lossGrid} />
                <text x={lossPad + 2} y={lossY(b) - 4} className={styles.lossTick}>
                  {b.toFixed(1)}b
                </text>
              </g>
            ))}
            <path d={lossPath} className={styles.lossPath} />
            <line
              x1={currentLossX}
              y1={currentLossY}
              x2={currentLossX}
              y2={lossHeight - lossPad}
              className={styles.lossGuide}
            />
            <circle cx={currentLossX} cy={currentLossY} r="4.5" className={styles.lossPoint} />
          </svg>
          <div className={styles.lossCaption}>
            Start ≈ <span className={styles.mono}>log₂(27)</span> bits (uniform). Training pushes the average down.
          </div>
        </div>
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
  )
}
