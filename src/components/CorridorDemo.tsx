import { useState, useCallback } from 'react'
import styles from './CorridorDemo.module.css'

// Simulated conditional probabilities (illustrative)
const PROBS: Record<string, Record<string, number>> = {
  '': { c: 0.08, a: 0.08, t: 0.09, s: 0.06, h: 0.06, e: 0.13, default: 0.04 },
  c: { a: 0.35, o: 0.25, h: 0.15, default: 0.05 },
  ca: { t: 0.45, n: 0.2, r: 0.15, default: 0.05 },
  cat: { ' ': 0.6, s: 0.15, default: 0.05 },
  h: { e: 0.4, a: 0.2, i: 0.15, default: 0.05 },
  he: { l: 0.25, r: 0.2, a: 0.15, default: 0.08 },
  hel: { l: 0.5, p: 0.25, default: 0.05 },
  hell: { o: 0.55, ' ': 0.2, default: 0.05 },
}

function getConditionalProb(context: string, nextChar: string): number {
  const contextProbs = PROBS[context] || PROBS['']
  return contextProbs[nextChar] || contextProbs.default || 0.04
}

interface CorridorRow {
  text: string
  probability: number
}

export function CorridorDemo() {
  const [input, setInput] = useState('')

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setInput(e.target.value.toLowerCase().slice(0, 6))
    },
    []
  )

  // Calculate corridor rows
  const rows: CorridorRow[] = [{ text: '', probability: 1.0 }]
  let cumulativeProb = 1.0
  const formulaParts: string[] = []

  for (let i = 0; i < input.length; i++) {
    const context = input.slice(0, i)
    const char = input[i]
    const condProb = getConditionalProb(context, char)
    cumulativeProb *= condProb
    formulaParts.push(`${(condProb * 100).toFixed(0)}%`)
    rows.push({ text: input.slice(0, i + 1), probability: cumulativeProb })
  }

  return (
    <div className={styles.demo}>
      <div className={styles.header}>
        <div className={styles.dots}>
          <div className={`${styles.dot} ${styles.red}`} />
          <div className={`${styles.dot} ${styles.yellow}`} />
          <div className={`${styles.dot} ${styles.green}`} />
        </div>
        <span className={styles.title}>narrowing_corridor.js — Live Demo</span>
      </div>
      <div className={styles.body}>
        <label className={styles.label}>Type a sequence (try "cat")</label>
        <input
          type="text"
          className={styles.input}
          value={input}
          onChange={handleChange}
          maxLength={6}
          placeholder="Start typing..."
        />

        <div className={styles.viz}>
          {rows.map((row, index) => (
            <div key={index} className={styles.row}>
              <div className={styles.barContainer}>
                <div
                  className={styles.bar}
                  style={{
                    width: `${Math.max(row.probability * 100, 0.5)}%`,
                  }}
                />
              </div>
              <div className={styles.labelRow}>
                <span className={styles.text}>
                  {row.text
                    ? `Texts starting with "${row.text}"`
                    : 'All possible texts'}
                </span>
                <span className={styles.prob}>
                  {(row.probability * 100).toFixed(2)}%
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.formula}>
          {input.length === 0 ? (
            <span className={styles.formulaResult}>
              Type to see the corridor narrow...
            </span>
          ) : (
            <span className={styles.formulaResult}>
              {formulaParts.map((part, i) => (
                <span key={i}>
                  <span className={styles.probTerm}>{part}</span>
                  {i < formulaParts.length - 1 && ' × '}
                </span>
              ))}
              <span className={styles.equals}>=</span>
              <span className={styles.final}>
                {(cumulativeProb * 100).toFixed(2)}% of all texts
              </span>
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
