import { useCallback, useMemo, useRef, useState } from 'react'
import { VizCard } from './VizCard'
import styles from './ExplosionDemo.module.css'

export function ExplosionDemo() {
  const [T, setT] = useState(3)
  const barRef = useRef<HTMLDivElement | null>(null)
  const vocabSize = 27 // a-z + space
  const trainingDataSize = 1_000_000 // 1 million examples

  const computeBarPosition = useCallback((contextLength: number) => {
    const possibilities = Math.pow(vocabSize, contextLength)
    const ratio = trainingDataSize / possibilities
    const logRatio = Math.log10(ratio)
    return Math.max(0, Math.min(100, 50 + logRatio * 8))
  }, [trainingDataSize, vocabSize])

  const snapTFromPercent = useCallback((percent: number) => {
    const x = Math.max(0, Math.min(1, percent))
    const pos = x * 100
    let bestT = 1
    let bestDist = Infinity
    for (let candidateT = 1; candidateT <= 10; candidateT++) {
      const candidatePos = computeBarPosition(candidateT)
      const dist = Math.abs(candidatePos - pos)
      if (dist < bestDist) {
        bestDist = dist
        bestT = candidateT
      }
    }
    return bestT
  }, [computeBarPosition])

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

  const formatRatio = (ratio: number) => {
    if (ratio === 0) return '0'
    if (ratio >= 1000) return ratio.toFixed(0)
    if (ratio >= 10) return ratio.toFixed(1)
    if (ratio >= 1) return ratio.toFixed(2)
    if (ratio >= 0.01) return ratio.toFixed(3)
    return ratio.toExponential(1)
  }

  const getState = (ratio: number) => {
    if (ratio >= 10) return { state: 'oversaturated', label: 'OVERSATURATED', desc: 'More data than possibilities' }
    if (ratio >= 1) return { state: 'covered', label: 'FULL COVERAGE', desc: 'Data covers all possibilities' }
    if (ratio >= 0.1) return { state: 'sparse', label: 'GETTING SPARSE', desc: 'Starting to miss sequences' }
    if (ratio >= 0.001) return { state: 'critical', label: 'SPARSE', desc: 'Most sequences unseen' }
    return { state: 'void', label: 'THE VOID', desc: 'Virtually nothing covered' }
  }

  const { state, label, desc } = getState(data.ratio)

  const exponentChain = useMemo(() => Array(T).fill('27').join(' × '), [T])
  const markerAlign = data.barPosition < 12 ? 'markerLeft' : data.barPosition > 88 ? 'markerRight' : 'markerCenter'

  const handleBarPointer = useCallback((clientX: number) => {
    const el = barRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    if (rect.width <= 0) return
    const percent = (clientX - rect.left) / rect.width
    setT(snapTFromPercent(percent))
  }, [snapTFromPercent])

  const handleBarPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    e.preventDefault()
    handleBarPointer(e.clientX)
    e.currentTarget.setPointerCapture(e.pointerId)
  }, [handleBarPointer])

  const handleBarPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return
    handleBarPointer(e.clientX)
  }, [handleBarPointer])

  const handleBarKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault()
      setT((prev) => Math.max(1, prev - 1))
    }
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault()
      setT((prev) => Math.min(10, prev + 1))
    }
    if (e.key === 'Home') {
      e.preventDefault()
      setT(1)
    }
    if (e.key === 'End') {
      e.preventDefault()
      setT(10)
    }
  }, [])

  const footer =
    T >= 6 ? (
      <div className={styles.footer}>
        <strong>The problem:</strong> At T={T}, there are {formatPossibilities(data.possibilities)} possible sequences. Your 1M training
        examples cover {formatCoverage(data.ratio)} of them.
        {data.ratio < 0.01 ? ' Most sequences the model encounters will be ones it’s never seen before.' : null}
      </div>
    ) : null

  return (
    <VizCard title="The Generalization Wall" subtitle="Why counting doesn't scale" footer={footer}>
      <div className={styles.grid}>
        <div className={styles.left}>
          <div className={styles.numbers}>
            <div className={styles.numberRow}>
              <div className={styles.numberLabel}>Possibilities</div>
              <div className={styles.numberValue}>
                27<sup>{T}</sup> <span className={styles.dim}>≈</span>{' '}
                <span className={styles.emph}>{formatPossibilities(data.possibilities)}</span>
              </div>
            </div>

            <div className={styles.numberRow}>
              <div className={styles.numberLabel}>Your data</div>
              <div className={styles.numberValue}>
                <span className={styles.emph}>1,000,000</span> <span className={styles.dim}>(fixed)</span>
              </div>
            </div>
          </div>

          <details className={styles.details}>
            <summary className={styles.summary}>Show expansion</summary>
            <div className={styles.expansion}>
              27<sup>{T}</sup> = {exponentChain}
            </div>
          </details>
        </div>

        <div className={styles.right}>
          <div className={styles.controlHeader}>
            <span className={styles.sliderLabel}>Context length (T)</span>
            <span className={styles.lengthValue}>T = {T}</span>
          </div>
          <div className={styles.barLabels}>
            <span>Oversaturated</span>
            <span className={styles.crossover}>
              <span className={styles.crossoverLabel}>Crossover</span>
              <span className={styles.crossoverHint}>ratio = 1</span>
            </span>
            <span>Sparse</span>
          </div>
          <div className={styles.barWrap}>
            <div
              ref={barRef}
              className={styles.barTrack}
              role="slider"
              tabIndex={0}
              aria-label="Context length (T)"
              aria-valuemin={1}
              aria-valuemax={10}
              aria-valuenow={T}
              aria-valuetext={`T = ${T}`}
              onPointerDown={handleBarPointerDown}
              onPointerMove={handleBarPointerMove}
              onKeyDown={handleBarKeyDown}
            >
              <div className={`${styles.barFill} ${styles[state]}`} style={{ width: `${data.barPosition}%` }} />
              <div className={styles.crossoverLine} />
            </div>
            <div className={`${styles.marker} ${styles[state]} ${styles[markerAlign]}`} style={{ left: `${data.barPosition}%` }}>
              <div className={styles.markerDot} />
              <div className={styles.markerLabel}>
                <div className={styles.markerLabelTitle}>Current</div>
                <div className={styles.markerLabelLine}>ratio = {formatRatio(data.ratio)}</div>
                <div className={styles.markerLabelLine}>coverage = {formatCoverage(data.ratio)}</div>
              </div>
            </div>
          </div>
          <div className={styles.barScale}>
            <span>1000×</span>
            <span>100×</span>
            <span>10×</span>
            <span>1×</span>
            <span>0.1%</span>
            <span>0.001%</span>
          </div>

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
        </div>
      </div>
    </VizCard>
  )
}
