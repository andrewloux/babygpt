import { useMemo, useState } from 'react'
import { Slider } from './Slider'
import styles from './EmbeddingInspector.module.css'
import { VOCAB, prettyChar } from '../data/characterData'
import { VizCard } from './VizCard'

type TrainedTable = {
  dim: number
  epochs: number
  pairsUsed: number
  pairsTotal: number
  lossBits: number
  perplexity: number
  E: Float32Array[]
}

type EmbeddingInspectorProps = {
  corpus: string
}

type Mode = 'probe' | 'axis'
type ProbeId = 'vowels' | 'space' | 'qu'

type ProbeSpec = {
  id: ProbeId
  name: string
  hint: string
  groupA: number[]
  groupB: number[]
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
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

function normalize(v: Float32Array): Float32Array {
  let n2 = 0
  for (let i = 0; i < v.length; i++) n2 += v[i] * v[i]
  const n = Math.sqrt(n2) || 1
  const out = new Float32Array(v.length)
  for (let i = 0; i < v.length; i++) out[i] = v[i] / n
  return out
}

function mixCyanMagenta(t: number) {
  const tt = clamp(t, 0, 1)
  // #00d9ff → #ff006e
  const r = Math.round(lerp(0, 255, tt))
  const g = Math.round(lerp(217, 0, tt))
  const b = Math.round(lerp(255, 110, tt))
  return { r, g, b }
}

const GROUPS = (() => {
  const vowelSet = new Set(['a', 'e', 'i', 'o', 'u'])
  const vowels: number[] = []
  const consonants: number[] = []
  const letters: number[] = []
  const qu: number[] = []
  const nonQuLetters: number[] = []

  for (let i = 1; i < VOCAB.length; i++) {
    const ch = VOCAB[i]
    letters.push(i)
    if (ch === 'q' || ch === 'u') qu.push(i)
    if (vowelSet.has(ch)) vowels.push(i)
    else consonants.push(i)
  }
  for (const i of letters) {
    const ch = VOCAB[i]
    if (ch !== 'q' && ch !== 'u') nonQuLetters.push(i)
  }

  return { vowels, consonants, letters, qu, nonQuLetters }
})()

const PROBES: ProbeSpec[] = [
  {
    id: 'vowels',
    name: 'Vowels vs consonants',
    hint: 'direction = mean(vowels) − mean(consonants)',
    groupA: GROUPS.vowels,
    groupB: GROUPS.consonants,
  },
  {
    id: 'space',
    name: 'Space vs letters',
    hint: 'direction = E[␣] − mean(letters)',
    groupA: [0],
    groupB: GROUPS.letters,
  },
  {
    id: 'qu',
    name: 'q/u neighborhood',
    hint: 'direction = mean({q,u}) − mean(other letters)',
    groupA: GROUPS.qu,
    groupB: GROUPS.nonQuLetters,
  },
]

function trainEmbeddingTable(corpus: string): TrainedTable {
  const cleaned = cleanToCharVocab(corpus)
  const allPairs = buildPairs(cleaned)

  const V = VOCAB.length
  const dim = 64
  const epochs = 260
  const lr = 0.08
  const initScale = 0.35
  const maxPairs = 600

  const rng = seededRng(1337)
  const E: Float32Array[] = Array.from({ length: V }, () => {
    const row = new Float32Array(dim)
    for (let d = 0; d < dim; d++) row[d] = randn(rng) * initScale
    return row
  })

  if (allPairs.length === 0) {
    const lossBits = Math.log2(V)
    return { dim, epochs: 0, pairsUsed: 0, pairsTotal: 0, lossBits, perplexity: Math.pow(2, lossBits), E }
  }

  const pairs: [number, number][] =
    allPairs.length <= maxPairs
      ? allPairs
      : Array.from({ length: maxPairs }, (_, i) => allPairs[Math.floor((i * allPairs.length) / maxPairs)]).filter(
          (x): x is [number, number] => x !== undefined,
        )

  const scores = new Float32Array(V)
  const probs = new Float32Array(V)
  const centroid = new Float32Array(dim)
  const ctxBefore = new Float32Array(dim)

  let lastLossBits = Math.log2(V)

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

    lastLossBits = (totalLossNat / Math.max(1, pairs.length)) / Math.LN2
  }

  const perplexity = Math.pow(2, lastLossBits)
  return { dim, epochs, pairsUsed: pairs.length, pairsTotal: allPairs.length, lossBits: lastLossBits, perplexity, E }
}

function meanVector(E: Float32Array[], indices: number[], dim: number): Float32Array {
  const out = new Float32Array(dim)
  for (const idx of indices) {
    const row = E[idx]
    if (!row) continue
    for (let d = 0; d < dim; d++) out[d] += row[d]
  }
  const inv = 1 / Math.max(1, indices.length)
  for (let d = 0; d < dim; d++) out[d] *= inv
  return out
}

function probeDirection(E: Float32Array[], dim: number, probe: ProbeSpec): Float32Array {
  const a = meanVector(E, probe.groupA, dim)
  const b = meanVector(E, probe.groupB, dim)
  const dir = new Float32Array(dim)
  for (let d = 0; d < dim; d++) dir[d] = a[d] - b[d]
  return normalize(dir)
}

export function EmbeddingInspector({ corpus }: EmbeddingInspectorProps) {
  const [trainingCorpus, setTrainingCorpus] = useState(corpus)
  const [mode, setMode] = useState<Mode>('probe')
  const [probeId, setProbeId] = useState<ProbeId>('vowels')
  const [axisDim, setAxisDim] = useState(1)
  const [sortByValue, setSortByValue] = useState(true)

  const trained = useMemo(() => trainEmbeddingTable(trainingCorpus), [trainingCorpus])
  const axisIdx = clamp(axisDim, 1, trained.dim) - 1
  const activeProbe = PROBES.find((p) => p.id === probeId) ?? PROBES[0]
  const direction = useMemo(() => probeDirection(trained.E, trained.dim, activeProbe), [trained.E, trained.dim, activeProbe])

  const values = useMemo(() => {
    const out = VOCAB.map((ch, i) => {
      const row = trained.E[i]
      const v =
        mode === 'axis'
          ? (row?.[axisIdx] ?? 0)
          : row
            ? dot(row, direction)
            : 0
      return { ch, value: v }
    })
    if (!sortByValue) return out
    return [...out].sort((a, b) => b.value - a.value)
  }, [axisIdx, direction, mode, sortByValue, trained.E])

  const absMax = useMemo(() => {
    let m = 0.2
    for (const item of values) m = Math.max(m, Math.abs(item.value))
    return m
  }, [values])

  const extremes = useMemo(() => {
    const sorted = [...values].sort((a, b) => b.value - a.value)
    return {
      high: sorted.slice(0, 5),
      low: sorted.slice(-5).reverse(),
    }
  }, [values])

  return (
    <VizCard
      title="Embedding Inspector"
      subtitle="Directions in embedding space"
      footer={
        <div className={styles.footerNote}>
          This is the honest bridge back to the “adjectives” metaphor: not “dimension 12 means vowel‑ness,” but “there exists a direction that
          scores vowels high.”
        </div>
      }
    >
      <div className={styles.content}>
        <div className={styles.metaRow}>
          trained · <span className={styles.mono}>27×{trained.dim}</span> ·{' '}
          <span className={styles.mono}>
            {trained.pairsUsed}/{trained.pairsTotal}
          </span>{' '}
          pairs · final loss ≈ <span className={styles.mono}>{trained.lossBits.toFixed(2)}</span> bits/char · perplexity ≈{' '}
          <span className={styles.mono}>{trained.perplexity.toFixed(1)}</span>
        </div>

      <div className={`${styles.controls} panel-dark inset-box`}>
        <div className={styles.modeRow}>
          <span className={styles.quickLabel}>View:</span>
          <button
            type="button"
            className={`${styles.quickBtn} ${mode === 'probe' ? styles.quickBtnActive : ''}`}
            onClick={() => setMode('probe')}
          >
            probes
          </button>
          <button
            type="button"
            className={`${styles.quickBtn} ${mode === 'axis' ? styles.quickBtnActive : ''}`}
            onClick={() => setMode('axis')}
          >
            axes
          </button>
        </div>

        {mode === 'probe' ? (
          <div className={styles.dimRow}>
            <div className={styles.dimLabel}>Probe</div>
            <div className={styles.probeButtons}>
              {PROBES.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`${styles.quickBtn} ${p.id === probeId ? styles.quickBtnActive : ''}`}
                  onClick={() => setProbeId(p.id)}
                >
                  {p.name}
                </button>
              ))}
            </div>
            <div className={styles.toggleGroup}>
              <button
                type="button"
                className={styles.toggle}
                onClick={() => setSortByValue((s) => !s)}
                title="Sort characters by score"
              >
                {sortByValue ? 'sorted' : 'A→Z'}
              </button>
              <button
                type="button"
                className={styles.toggle}
                onClick={() => setTrainingCorpus(corpus)}
                title="Retrain on the current chapter corpus"
              >
                retrain
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className={styles.dimRow}>
              <label className={styles.dimLabel} htmlFor="embedding-dim">
                Axis <span className={styles.dimValue}>#{axisDim}</span>
              </label>
              <Slider
                id="embedding-dim"
                wrap={false}
                min={1}
                max={trained.dim}
                step={1}
                value={axisDim}
                onValueChange={(v) => setAxisDim(Math.round(v))}
                ariaLabel="Embedding axis"
              />
              <div className={styles.toggleGroup}>
                <button
                  type="button"
                  className={styles.toggle}
                  onClick={() => setSortByValue((s) => !s)}
                  title="Sort characters by this coordinate"
                >
                  {sortByValue ? 'sorted' : 'A→Z'}
                </button>
                <button
                  type="button"
                  className={styles.toggle}
                  onClick={() => setTrainingCorpus(corpus)}
                  title="Retrain on the current chapter corpus"
                >
                  retrain
                </button>
              </div>
            </div>

            <div className={styles.quickRow}>
              <span className={styles.quickLabel}>Try:</span>
              {PROBES.map((p) => (
                <button
                  key={`try-${p.id}`}
                  type="button"
                  className={styles.quickBtn}
                  onClick={() => {
                    setMode('probe')
                    setProbeId(p.id)
                  }}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </>
        )}

        <div className={styles.dimHint}>
          {mode === 'probe' ? (
            <>
              <span className={styles.dimName}>{activeProbe.name}</span>
              <span className={styles.dimNote}>— {activeProbe.hint}</span>
            </>
          ) : (
            <>
              <span className={styles.dimName}>Raw axis</span>
              <span className={styles.dimNote}>— sometimes aligned, often just a rotated mixture.</span>
            </>
          )}
        </div>
      </div>

      <div className={styles.heatmap} role="img" aria-label="Embedding scores by character">
        {values.map(({ ch, value }) => {
          const t = (value / absMax + 1) / 2
          const { r, g, b } = mixCyanMagenta(t)
          const intensity = Math.min(1, Math.abs(value) / absMax)
          const bg = `rgba(${r}, ${g}, ${b}, ${0.14 + 0.34 * intensity})`
          const border = `rgba(${r}, ${g}, ${b}, ${0.18 + 0.45 * intensity})`

          return (
            <div
              key={ch}
              className={styles.cell}
              style={{ backgroundColor: bg, borderColor: border }}
              title={`${prettyChar(ch)}: ${value.toFixed(3)}`}
            >
              <div className={styles.cellChar}>{prettyChar(ch)}</div>
              <div className={styles.cellVal}>{value.toFixed(2)}</div>
            </div>
          )
        })}
      </div>

      <div className={styles.extremes}>
        <div className={styles.extremeBlock}>
          <div className={styles.extremeLabel}>High</div>
          <div className={styles.extremeList}>
            {extremes.high.map((x) => (
              <span key={`hi-${x.ch}`} className={styles.extremeChip}>
                {prettyChar(x.ch)}
              </span>
            ))}
          </div>
        </div>
        <div className={styles.extremeBlock}>
          <div className={styles.extremeLabel}>Low</div>
          <div className={styles.extremeList}>
            {extremes.low.map((x) => (
              <span key={`lo-${x.ch}`} className={styles.extremeChip}>
                {prettyChar(x.ch)}
              </span>
            ))}
          </div>
        </div>
      </div>
      </div>
    </VizCard>
  )
}
