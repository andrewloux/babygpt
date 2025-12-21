import { useMemo, useState } from 'react'
import { Slider } from './Slider'
import styles from './ExplosionDemo.module.css'

export function ExplosionDemo() {
  const [T, setT] = useState(3)
  const vocabSize = 27 // a-z + space
  const trainingDataSize = 1_000_000 // 1 million examples

  const data = useMemo(() => {
    const possibilities = Math.pow(vocabSize, T)
    const ratio = trainingDataSize / possibilities
    const coverage = ratio * 100

    // Log scale position for the bar (0-100)
    // At ratio=1, we want ~50%. Use log scale.
    const logRatio = Math.log10(ratio)
    // logRatio ranges from ~6 (at T=1) to ~-8 (at T=10)
    // Map this to 0-100 where 50 = crossover
    const barPosition = Math.max(0, Math.min(100, 50 + logRatio * 8))

    return { possibilities, ratio, coverage, barPosition }
  }, [T])

  const formatPossibilities = (num: number) => {
    if (num >= 1e15) return `${(num / 1e15).toFixed(1)}×10¹⁵`
    if (num >= 1e12) return `${(num / 1e12).toFixed(1)}×10¹²`
    if (num >= 1e9) return `${(num / 1e9).toFixed(1)}×10⁹`
    if (num >= 1e6) return `${(num / 1e6).toFixed(1)}×10⁶`
    if (num >= 1e3) return num.toLocaleString()
    return num.toString()
  }

  const formatCoverage = (ratio: number) => {
    if (ratio >= 100) return `${ratio.toFixed(0)}×`
    if (ratio >= 10) return `${ratio.toFixed(0)}×`
    if (ratio >= 1) return `${ratio.toFixed(1)}×`
    if (ratio >= 0.01) return `${(ratio * 100).toFixed(1)}%`
    if (ratio >= 0.0001) return `${(ratio * 100).toFixed(3)}%`
    if (ratio >= 0.000001) return `${(ratio * 100).toExponential(1)}`
    return `${(ratio * 100).toExponential(1)}`
  }

  const getState = (ratio: number) => {
    if (ratio >= 10) return { state: 'oversaturated', label: 'OVERSATURATED', desc: 'More data than possibilities' }
    if (ratio >= 1) return { state: 'covered', label: 'FULL COVERAGE', desc: 'Data covers all possibilities' }
    if (ratio >= 0.1) return { state: 'sparse', label: 'GETTING SPARSE', desc: 'Starting to miss sequences' }
    if (ratio >= 0.001) return { state: 'critical', label: 'SPARSE', desc: 'Most sequences unseen' }
    return { state: 'void', label: 'THE VOID', desc: 'Virtually nothing covered' }
  }

  const { state, label, desc } = getState(data.ratio)

  // Generate the exponent chain: 27 × 27 × 27 × ...
  const exponentChain = Array(T).fill('27').join(' × ')

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <span className={styles.title}>The Generalization Wall</span>
        <span className={styles.subtitle}>Why counting doesn&apos;t scale</span>
      </div>

      {/* Slider */}
      <div className={styles.sliderSection}>
        <label className={styles.sliderLabel}>Context length (T)</label>
        <div className={styles.sliderRow}>
          <Slider
            wrap={false}
            min={1}
            max={10}
            step={1}
            value={T}
            onValueChange={(v) => setT(Math.round(v))}
            ariaLabel="Context length (T)"
          />
          <span className={styles.lengthValue}>T = {T}</span>
        </div>
      </div>

      {/* The Equation */}
      <div className={styles.equation}>
        <div className={styles.equationLine}>
          <span className={styles.equationLabel}>Possibilities</span>
          <span className={styles.equationMath}>
            27<sup>{T}</sup> = {exponentChain} = <strong>{formatPossibilities(data.possibilities)}</strong>
          </span>
        </div>
        <div className={styles.equationLine}>
          <span className={styles.equationLabel}>Your Data</span>
          <span className={styles.equationMath}>
            <strong>1,000,000</strong> <span className={styles.dim}>(fixed)</span>
          </span>
        </div>
      </div>

      {/* Visual Comparison */}
      <div className={styles.comparison}>
        <div className={styles.barContainer}>
          <div className={styles.barLabels}>
            <span>Oversaturated</span>
            <span className={styles.crossover}>← Crossover →</span>
            <span>Sparse</span>
          </div>
          <div className={styles.barTrack}>
            <div
              className={`${styles.barFill} ${styles[state]}`}
              style={{ width: `${data.barPosition}%` }}
            />
            <div className={styles.crossoverLine} />
          </div>
          <div className={styles.barScale}>
            <span>1000×</span>
            <span>100×</span>
            <span>10×</span>
            <span>1×</span>
            <span>0.1%</span>
            <span>0.001%</span>
          </div>
        </div>
      </div>

      {/* Coverage Result */}
      <div className={`${styles.result} ${styles[state]}`}>
        <div className={styles.resultMain}>
          <span className={styles.coverageValue}>{formatCoverage(data.ratio)}</span>
          <span className={styles.coverageLabel}>coverage</span>
        </div>
        <div className={styles.resultState}>
          <span className={styles.stateLabel}>{label}</span>
          <span className={styles.stateDesc}>{desc}</span>
        </div>
      </div>

      {/* The Insight */}
      {T >= 6 && (
        <div className={styles.insight}>
          <strong>The problem:</strong> At T={T}, there are {formatPossibilities(data.possibilities)} possible sequences.
          Your 1M training examples cover {formatCoverage(data.ratio)} of them.
          {data.ratio < 0.01 && " Most sequences the model encounters will be ones it’s never seen before."}
        </div>
      )}
    </div>
  )
}
