import { useMemo, useState } from 'react'

import { Slider } from './Slider'
import { VizCard } from './VizCard'
import styles from './SoftmaxNudgeViz.module.css'

const CHARS = ['e', 'a', 'i'] as const
type Char = (typeof CHARS)[number]

// --- Core Math Functions ---
function softmax(logits: number[]) {
  const maxL = Math.max(...logits)
  const exps = logits.map((l) => Math.exp(l - maxL))
  const sum = exps.reduce((a, b) => a + b, 0)
  return exps.map((e) => e / sum)
}

function crossEntropyLoss(probs: number[], trueIndex: number) {
  const p = Math.max(1e-12, probs[trueIndex] ?? 0)
  return -Math.log(p)
}

function oneHot(n: number, idx: number) {
  return Array.from({ length: n }, (_, i) => (i === idx ? 1 : 0))
}

function numericalGradient(
  lossFn: (logits: number[]) => number,
  logits: number[],
  logitIndex: number,
  epsilon: number,
) {
  const logitsPlus = logits.slice()
  logitsPlus[logitIndex] += epsilon
  const lossPlus = lossFn(logitsPlus)

  const logitsMinus = logits.slice()
  logitsMinus[logitIndex] -= epsilon
  const lossMinus = lossFn(logitsMinus)

  return (lossPlus - lossMinus) / (2 * epsilon)
}

// --- Component ---
export function SoftmaxNudgeViz() {
  const [logitE, setLogitE] = useState(1.5)
  const [logitA, setLogitA] = useState(0.5)
  const [logitI, setLogitI] = useState(-0.5)
  const [trueChar, setTrueChar] = useState<Char>('e')

  const EPSILON = 0.01 // Small fixed value for finite difference

  const logits = useMemo(() => [logitE, logitA, logitI], [logitE, logitA, logitI])
  const trueIndex = CHARS.indexOf(trueChar)

  const probs = useMemo(() => softmax(logits), [logits])
  const targetVector = useMemo(() => oneHot(3, trueIndex), [trueIndex])
  const analyticalGrads = useMemo(() => probs.map((p, i) => p - (targetVector[i] ?? 0)), [probs, targetVector])
  const loss = useMemo(() => crossEntropyLoss(probs, trueIndex), [probs, trueIndex])

  const lossFn = (newLogits: number[]) => crossEntropyLoss(softmax(newLogits), trueIndex)

  const numericalGrads = useMemo(
    () => logits.map((_, i) => numericalGradient(lossFn, logits, i, EPSILON)),
    [logits, lossFn, trueIndex], // Added trueIndex dependency
  )

  const renderSlider = (char: Char, logit: number, setLogit: (val: number) => void, color: string) => (
    <div className={styles.sliderGroup}>
      <label className={styles.sliderLabel} htmlFor={`nudge-${char}`}>
        <span className={styles.name} style={{ color }}>
          '{char}' score
        </span>
        <span className={styles.value}>{logit.toFixed(1)}</span>
      </label>
      <Slider
        id={`nudge-${char}`}
        min={-5}
        max={5}
        step={0.1}
        value={logit}
        onValueChange={setLogit}
        ariaLabel={`Logit for ${char}`}
      />
    </div>
  )

  return (
    <VizCard
      title="The Gradient Formula: p − y"
      subtitle="Verifying the analytical gradient by measuring the slope."
      figNum="Fig. 2.12b"
    >
      <div className={styles.content}>
        {/* --- CONTROLS --- */}
        <div className={styles.controls}>
          <div className={styles.controlSection}>
            <div className={styles.sectionTitle}>1. Set Scores (Logits)</div>
            {renderSlider('e', logitE, setLogitE, 'var(--accent-cyan)')}
            {renderSlider('a', logitA, setLogitA, 'var(--accent-magenta)')}
            {renderSlider('i', logitI, setLogitI, 'var(--accent-yellow)')}
          </div>
          <div className={styles.controlSection}>
            <div className={styles.sectionTitle}>2. Set True Token</div>
            <div className={styles.pills} role="radiogroup" aria-label="True token">
              {CHARS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`${styles.pill} ${trueChar === c ? styles.pillActive : ''}`}
                  onClick={() => setTrueChar(c)}
                >
                  {c}
                </button>
              ))}
            </div>
            <div className={styles.lossDisplay}>
              <span className={styles.lossLabel}>Loss:</span>
              <span className={styles.lossValue}>{loss.toFixed(3)}</span>
            </div>
          </div>
        </div>

        {/* --- HERO: COMPARISON TABLE --- */}
        <div className={styles.tableContainer}>
          <div className={styles.tableHeader}>
            <div className={styles.sectionTitle}>3. Compare Gradients</div>
            <div className={styles.tableNote}>
              "Numerical" is measured by wiggling the logit. "Analytical" is computed with the formula{' '}
              <span className={styles.mono}>p − y</span>.
            </div>
          </div>
          <table className={styles.comparisonTable}>
            <thead>
              <tr>
                <th>Token</th>
                <th>
                  Prob <span className={styles.mono}>(p)</span>
                </th>
                <th>
                  Target <span className={styles.mono}>(y)</span>
                </th>
                <th>
                  Analytical <span className={styles.mono}>(p − y)</span>
                </th>
                <th>
                  Numerical <span className={styles.mono}>(slope)</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {CHARS.map((c, i) => (
                <tr key={c}>
                  <td>'{c}'</td>
                  <td>{(probs[i] ?? 0).toFixed(3)}</td>
                  <td>{targetVector[i]}</td>
                  <td>{(analyticalGrads[i] ?? 0).toFixed(3)}</td>
                  <td>{(numericalGrads[i] ?? 0).toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </VizCard>
  )
}

