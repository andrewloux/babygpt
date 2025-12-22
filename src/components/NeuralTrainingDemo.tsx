import { Fragment, useState } from 'react'
import { Slider } from './Slider'
import { VizCard } from './VizCard'
import styles from './NeuralTrainingDemo.module.css'

// Simple vocab: h, e, l, o
// Target pattern: h->e, e->l, l->l, l->o ("hello" bigrams)

const INITIAL_WEIGHTS = [
  [0.1, -0.2, 0.1, 0.0], // input h
  [0.1, 0.1, -0.1, 0.0], // input e
  [-0.1, 0.2, 0.0, 0.1], // input l
  [0.0, 0.1, -0.1, 0.2], // input o
]

export function NeuralTrainingDemo() {
  const [weights, setWeights] = useState(INITIAL_WEIGHTS)
  const [step, setStep] = useState(0)
  const [loss, setLoss] = useState(2.5) // arbitrary start (visual only)
  const [learningRate, setLearningRate] = useState(0.5)

  const vocab = ['h', 'e', 'l', 'o']
  const targets = [1, 2, 2, 3] // h->e(1), e->l(2), l->l(2), l->o(3)

  const trainStep = () => {
    const newWeights = weights.map((row, inputIdx) => {
      const targetIdx = targets[inputIdx]
      return row.map((w, colIdx) => {
        if (colIdx === targetIdx) return w + learningRate // boost correct path
        return w - learningRate * 0.4 // suppress wrong path
      })
    })

    setWeights(newWeights)
    setStep(s => s + 1)

    const newLoss = Math.max(0.1, loss * 0.7)
    setLoss(newLoss)
  }

  const reset = () => {
    setWeights(INITIAL_WEIGHTS)
    setStep(0)
    setLoss(2.5)
  }

  const cellColor = (val: number) => {
    const normalized = Math.min(1, Math.abs(val) / 2.5)
    const alpha = 0.08 + normalized * 0.72
    if (val >= 0) return `rgba(0, 217, 255, ${alpha})`
    return `rgba(255, 0, 110, ${alpha})`
  }

  return (
    <VizCard title="A Tiny Weight Matrix" subtitle="Watch training nudge scores">
      <div className={styles.container}>
        <div className={styles.grid} role="grid" aria-label="Weight matrix">
          <div className={`${styles.cell} ${styles.header}`}>In\Out</div>
          {vocab.map(v => (
            <div key={`col-${v}`} className={`${styles.cell} ${styles.header}`}>
              {v}
            </div>
          ))}

          {vocab.map((inputChar, r) => (
            <Fragment key={inputChar}>
              <div className={`${styles.cell} ${styles.header}`}>{inputChar}</div>
              {weights[r].map((w, c) => (
                <div
                  key={`${r}-${c}`}
                  className={`${styles.cell} ${styles.weight}`}
                  style={{ backgroundColor: cellColor(w) }}
                  title={`Weight: ${w.toFixed(2)}`}
                >
                  {w.toFixed(1)}
                </div>
              ))}
            </Fragment>
          ))}
        </div>

        <div className={`inset-box ${styles.sliderControl}`}>
          <label htmlFor="learning-rate" className={styles.sliderLabel}>
            Learning rate: <strong>{learningRate.toFixed(1)}</strong>
          </label>
          <Slider
            id="learning-rate"
            wrap={false}
            min={0.1}
            max={2.0}
            step={0.1}
            value={learningRate}
            onValueChange={setLearningRate}
            ariaLabel="Learning rate"
          />
          <div className={styles.sliderHints}>
            <span className={styles.hint}>Too low: slow convergence</span>
            <span className={styles.hint}>Too high: may overshoot</span>
          </div>
        </div>

        <div className={styles.controls}>
          <button className={`${styles.btn} focus-glow`} onClick={trainStep} type="button">
            Train Step
          </button>
          <button className={`${styles.btn} ${styles.secondaryBtn} focus-glow`} onClick={reset} type="button">
            Reset
          </button>
          <div className={styles.stats}>
            <div>Step: {step}</div>
            <div>Loss: {loss.toFixed(4)}</div>
          </div>
        </div>

        <div className={styles.legend}>
          <div>Goal: learn the bigrams h→e, e→l, l→l, l→o.</div>
          <div>
            <span className={styles.pos}>Cyan</span> = positive score, <span className={styles.neg}>magenta</span> =
            negative score.
          </div>
        </div>
      </div>
    </VizCard>
  )
}
