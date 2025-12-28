import { useEffect, useMemo, useState } from 'react'

import { VizCard } from './VizCard'
import styles from './ChainOfBlameViz.module.css'

const INPUT_VOCAB = ['h', 'e', 'l', 'o', '␣'] as const
type InputTok = (typeof INPUT_VOCAB)[number]

const OUT_VOCAB = ['e', 'a', 'i'] as const
type OutTok = (typeof OUT_VOCAB)[number]

const D = 5

function softmax(logits: number[]) {
  const maxL = Math.max(...logits)
  const exps = logits.map((l) => Math.exp(l - maxL))
  const sum = exps.reduce((a, b) => a + b, 0)
  return exps.map((e) => e / sum)
}

function lossNll(probs: number[], yIndex: number) {
  const p = Math.max(1e-12, probs[yIndex] ?? 0)
  return -Math.log(p)
}

function dot(a: number[], b: number[]) {
  let s = 0
  for (let i = 0; i < a.length; i++) s += (a[i] ?? 0) * (b[i] ?? 0)
  return s
}

function matVec(W: number[][], v: number[]) {
  return W.map((row) => dot(row, v))
}

function vecMat(v: number[], W: number[][]) {
  const V = W[0]?.length ?? 0
  const out = new Array(V).fill(0)
  for (let j = 0; j < V; j++) {
    let s = 0
    for (let k = 0; k < v.length; k++) {
      s += (v[k] ?? 0) * (W[k]?.[j] ?? 0)
    }
    out[j] = s
  }
  return out
}

export function ChainOfBlameViz() {
  const [xTok, setXTok] = useState<InputTok>('l')
  const [yTok, setYTok] = useState<OutTok>('e')

  const [guess, setGuess] = useState<'one' | 'all' | null>(null)
  const [guessLocked, setGuessLocked] = useState(false)
  const [revealed, setRevealed] = useState(false)

  const xIndex = INPUT_VOCAB.indexOf(xTok)
  const yIndex = OUT_VOCAB.indexOf(yTok)

  // Tiny embedding table (5 tokens × D=5 dims)
  const E = useMemo(
    () => [
      [0.2, -0.1, 0.0, 0.4, -0.2], // h
      [0.0, 0.3, -0.2, 0.1, 0.2], // e
      [-0.3, 0.6, 0.1, -0.4, 0.0], // l
      [0.1, -0.2, 0.4, 0.0, 0.1], // o
      [0.0, 0.0, 0.0, 0.0, 0.0], // space
    ],
    []
  )

  // Output weight matrix (D × V=3)
  const Wout = useMemo(
    () => [
      [0.6, -0.2, 0.1],
      [0.2, 0.4, -0.1],
      [-0.3, 0.1, 0.5],
      [0.1, -0.4, 0.2],
      [0.2, 0.0, -0.2],
    ],
    []
  )

  const xVec = E[xIndex] ?? new Array(D).fill(0)
  const logits = useMemo(() => vecMat(xVec, Wout), [Wout, xVec])
  const probs = useMemo(() => softmax(logits), [logits])
  const y = useMemo(() => Array.from({ length: OUT_VOCAB.length }, (_, i) => (i === yIndex ? 1 : 0)), [yIndex])
  const loss = useMemo(() => lossNll(probs, yIndex), [probs, yIndex])

  // Gradient at logits: p - y
  const dL_dz = useMemo(() => probs.map((p, i) => p - (y[i] ?? 0)), [probs, y])

  // Backprop into embedding: dL/de_x = Wout * dL/dz
  const dL_dx = useMemo(() => matVec(Wout, dL_dz), [Wout, dL_dz])

  useEffect(() => {
    setGuess(null)
    setGuessLocked(false)
    setRevealed(false)
  }, [xTok, yTok])

  const correct = 'one'
  const guessCorrect = revealed && guess === correct

  return (
    <VizCard
      title="Chain of Blame"
      subtitle="Who gets pushed when the model is wrong?"
      figNum="Fig. 2.10c"
      footer={
        <div className={styles.footerText}>
          Forward pass used one row → only one row receives gradient.
        </div>
      }
    >
      <div className={styles.content}>
        {/* Controls row */}
        <div className={styles.controls}>
          <div className={styles.controlSection}>
            <div className={styles.sectionTitle}>1. Pick Training Example</div>
            <div className={styles.tokenSelectors}>
              <div className={styles.tokenGroup}>
                <span className={styles.tokenLabel}>Input x</span>
                <div className={styles.pills}>
                  {INPUT_VOCAB.map((t) => (
                    <button
                      key={t}
                      type="button"
                      className={`${styles.pill} ${xTok === t ? styles.pillActive : ''}`}
                      onClick={() => setXTok(t)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className={styles.tokenGroup}>
                <span className={styles.tokenLabel}>True y</span>
                <div className={styles.pills}>
                  {OUT_VOCAB.map((t) => (
                    <button
                      key={t}
                      type="button"
                      className={`${styles.pill} ${yTok === t ? styles.pillActive : ''}`}
                      onClick={() => setYTok(t)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className={styles.stats}>
              <span className={styles.statItem}>
                <span className={styles.statLabel}>p(true)</span>
                <span className={styles.statValue}>{(probs[yIndex] ?? 0).toFixed(3)}</span>
              </span>
              <span className={styles.statItem}>
                <span className={styles.statLabel}>loss</span>
                <span className={styles.statValue}>{loss.toFixed(3)}</span>
              </span>
            </div>
          </div>

          <div className={styles.controlSection}>
            <div className={styles.sectionTitle}>2. Predict the Update</div>
            <div className={styles.challengePrompt}>
              Training on <span className={styles.mono}>x={xTok}</span>, <span className={styles.mono}>y={yTok}</span>.
              How many embedding rows get updated?
            </div>
            <div className={styles.pills} role="radiogroup" aria-label="Guess">
              <button
                type="button"
                className={`${styles.pill} ${guess === 'one' ? styles.pillActive : ''}`}
                onClick={() => setGuess('one')}
                disabled={guessLocked}
              >
                One row
              </button>
              <button
                type="button"
                className={`${styles.pill} ${guess === 'all' ? styles.pillActive : ''}`}
                onClick={() => setGuess('all')}
                disabled={guessLocked}
              >
                All rows
              </button>
            </div>
            <div className={styles.actionRow}>
              <button
                type="button"
                className={styles.actionBtn}
                onClick={() => guess !== null && setGuessLocked(true)}
                disabled={guessLocked || guess === null}
              >
                {guessLocked ? 'Locked' : 'Lock'}
              </button>
              <button
                type="button"
                className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
                onClick={() => guessLocked && setRevealed(true)}
                disabled={!guessLocked}
              >
                Reveal
              </button>
              <span className={styles.feedback}>
                {revealed ? (
                  guessCorrect ? (
                    <span className={styles.good}>Correct!</span>
                  ) : (
                    <span className={styles.bad}>Only one row</span>
                  )
                ) : guessLocked ? (
                  <span className={styles.neutral}>→</span>
                ) : null}
              </span>
            </div>
          </div>
        </div>

        {/* Hero: Embedding gradient table */}
        <div className={styles.tableContainer}>
          <div className={styles.tableHeader}>
            <div className={styles.sectionTitle}>3. Which Embedding Rows Receive Gradient?</div>
            <div className={styles.tableNote}>
              Only the row that was looked up in the forward pass can receive blame.
            </div>
          </div>
          <table className={styles.embeddingTable}>
            <thead>
              <tr>
                <th>Token</th>
                <th>d<sub>0</sub></th>
                <th>d<sub>1</sub></th>
                <th>d<sub>2</sub></th>
                <th>d<sub>3</sub></th>
                <th>d<sub>4</sub></th>
                <th>Gradient</th>
              </tr>
            </thead>
            <tbody>
              {INPUT_VOCAB.map((tok, i) => {
                const isActive = i === xIndex
                const rowGrad = isActive ? dL_dx : null
                return (
                  <tr key={tok} className={isActive ? styles.rowActive : styles.rowInactive}>
                    <td>{tok}</td>
                    {Array.from({ length: D }, (_, j) => {
                      const val = rowGrad?.[j]
                      const showVal = revealed && isActive && val !== undefined
                      return (
                        <td key={j} className={showVal ? (val >= 0 ? styles.cellPos : styles.cellNeg) : ''}>
                          {showVal ? val.toFixed(2) : '–'}
                        </td>
                      )
                    })}
                    <td className={styles.gradientStatus}>
                      {revealed ? (isActive ? '← updated' : 'untouched') : '?'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Collapsible flow details */}
        <details className="collapsible">
          <summary>Show forward/backward flow</summary>
          <div className={styles.flowGrid}>
            <div className={styles.flowStep}>
              <span className={styles.flowLabel}>1. Lookup</span>
              <span className={styles.flowValue}>
                E[{xTok}] = [{xVec.map(v => v.toFixed(1)).join(', ')}]
              </span>
            </div>
            <div className={styles.flowStep}>
              <span className={styles.flowLabel}>2. Logits</span>
              <span className={styles.flowValue}>
                z = [{logits.map(v => v.toFixed(2)).join(', ')}]
              </span>
            </div>
            <div className={styles.flowStep}>
              <span className={styles.flowLabel}>3. Probs</span>
              <span className={styles.flowValue}>
                p = [{probs.map(v => v.toFixed(3)).join(', ')}]
              </span>
            </div>
            <div className={styles.flowStep}>
              <span className={styles.flowLabel}>4. Grad p−y</span>
              <span className={`${styles.flowValue} ${revealed ? '' : styles.flowValueHidden}`}>
                [{dL_dz.map(v => v.toFixed(3)).join(', ')}]
              </span>
            </div>
          </div>
        </details>
      </div>
    </VizCard>
  )
}
