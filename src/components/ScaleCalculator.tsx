import { useState } from 'react'
import styles from './ScaleCalculator.module.css'

interface ScaleCalculatorProps {
  examples: number
  opsPerExample: number
  parallelFactor?: number
  defaultOpsPerSec?: number
}

export function ScaleCalculator({
  examples,
  opsPerExample,
  parallelFactor = 1000,
  defaultOpsPerSec = 10,
}: ScaleCalculatorProps) {
  const [opsPerSec, setOpsPerSec] = useState(defaultOpsPerSec)

  // Calculations
  const totalOps = examples * opsPerExample
  const sequentialSeconds = totalOps / (opsPerSec * 1_000_000)
  const parallelSeconds = sequentialSeconds / parallelFactor

  // Format helpers
  const formatBigNumber = (n: number): string => {
    if (n >= 1e12) return `${(n / 1e12).toFixed(1)}T`
    if (n >= 1e9) return `${(n / 1e9).toFixed(0)}B`
    if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
    return n.toLocaleString()
  }

  const formatTime = (seconds: number): { value: string; unit: string } => {
    if (seconds >= 3600) {
      const hours = seconds / 3600
      return { value: hours.toFixed(1), unit: hours === 1 ? 'hour' : 'hours' }
    }
    if (seconds >= 60) {
      const mins = seconds / 60
      return { value: mins.toFixed(1), unit: mins === 1 ? 'minute' : 'minutes' }
    }
    return { value: seconds.toFixed(1), unit: seconds === 1 ? 'second' : 'seconds' }
  }

  const seqTime = formatTime(sequentialSeconds)
  const parTime = formatTime(parallelSeconds)

  // Bar percentages (sequential is always 100%, parallel is relative)
  const parallelPercent = Math.max((parallelSeconds / sequentialSeconds) * 100, 0.5)

  return (
    <div className={styles.container}>
      <div className={styles.inputSection}>
        <label className={styles.label}>
          Run the benchmark above. What did you get?
        </label>
        <div className={styles.inputRow}>
          <input
            type="number"
            min="1"
            max="100"
            step="0.1"
            value={opsPerSec}
            onChange={(e) => setOpsPerSec(Math.max(0.1, parseFloat(e.target.value) || 1))}
            className={styles.input}
          />
          <span className={styles.unit}>million ops/sec</span>
        </div>
      </div>

      <div className={styles.mathSection}>
        <div className={styles.mathLine}>
          <span className={styles.mathLabel}>Total operations:</span>
          <span className={styles.mathValue}>
            {formatBigNumber(examples)} examples × {formatBigNumber(opsPerExample)} ops = <strong>{formatBigNumber(totalOps)}</strong> ops
          </span>
        </div>
        <div className={styles.mathLine}>
          <span className={styles.mathLabel}>On your machine:</span>
          <span className={styles.mathValue}>
            {formatBigNumber(totalOps)} ÷ {opsPerSec}M/sec = <strong>{seqTime.value} {seqTime.unit}</strong>
          </span>
        </div>
      </div>

      <div className={styles.comparisonSection}>
        <div className={styles.comparisonHeader}>Training Harry Potter on your machine:</div>

        <div className={styles.barRow}>
          <div className={styles.barLabel}>One at a time</div>
          <div className={styles.barTrack}>
            <div className={`${styles.barFill} ${styles.slow}`} style={{ width: '100%' }} />
          </div>
          <div className={styles.barTime}>
            <span className={styles.timeValue}>{seqTime.value}</span>
            <span className={styles.timeUnit}>{seqTime.unit}</span>
          </div>
        </div>

        <div className={styles.barRow}>
          <div className={styles.barLabel}>{parallelFactor.toLocaleString()} at once</div>
          <div className={styles.barTrack}>
            <div
              className={`${styles.barFill} ${styles.fast}`}
              style={{ width: `${parallelPercent}%` }}
            />
          </div>
          <div className={styles.barTime}>
            <span className={styles.timeValue}>{parTime.value}</span>
            <span className={styles.timeUnit}>{parTime.unit}</span>
          </div>
        </div>
      </div>

      <div className={styles.footer}>
        Same math. Same work. Different strategy.
      </div>
    </div>
  )
}
