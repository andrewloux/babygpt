import { useMemo, useState } from 'react'

import { Slider } from '../../components'
import { BabyLearner } from './BabyLearner'

import styles from './TrainingDemo.module.css'

const TOKENS = ['a', 'b', 'c', 'd', 'e'] as const

export function TrainingDemo() {
  const learner = useMemo(() => new BabyLearner(5, 3), [])
  const [lr, setLr] = useState(0.2)
  const [steps, setSteps] = useState(0)
  const [loss, setLoss] = useState<number | null>(null)

  const inputIdx = 0
  const targetIdx = 1

  const { logits, probs } = useMemo(() => {
    learner.forward(inputIdx)
    const l = learner.loss(targetIdx)
    return { logits: learner.cache.logits ?? [], probs: learner.cache.probs ?? [], loss: l }
  }, [learner, steps])

  const handleStep = () => {
    const nextLoss = learner.trainStep(inputIdx, targetIdx, lr)
    setLoss(nextLoss)
    setSteps((s) => s + 1)
  }

  const handleReset = () => {
    const fresh = new BabyLearner(5, 3)
    learner.V = fresh.V
    learner.D = fresh.D
    learner.E = fresh.E
    learner.W = fresh.W
    learner.b = fresh.b
    learner.cache = { inputIdx: null, targetIdx: null, e: null, logits: null, probs: null }
    setSteps(0)
    setLoss(null)
  }

  return (
    <div className={`${styles.frame} panel-dark inset-box`}>
      <div className={styles.header}>
        <div className={styles.title}>Training Loop (Tiny)</div>
        <div className={styles.subtitle}>One example: a → b</div>
      </div>

      <div className={styles.grid}>
        <div className={styles.left}>
          <div className={styles.controlsRow}>
            <div className={styles.controlLabel}>Learning rate</div>
            <div className={styles.controlValue}>{lr.toFixed(2)}</div>
          </div>
          <Slider wrap={false} min={0.01} max={1} step={0.01} value={lr} onValueChange={setLr} ariaLabel="Learning rate" />
          <div className={styles.buttons}>
            <button type="button" className={styles.primary} onClick={handleStep}>
              Step
            </button>
            <button type="button" className={styles.secondary} onClick={handleReset}>
              Reset
            </button>
          </div>
          <div className={styles.meta}>
            <div>step: {steps}</div>
            <div>loss: {loss === null ? '—' : loss.toFixed(4)}</div>
          </div>
        </div>

        <div className={styles.right}>
          <div className={styles.panelTitle}>P(next | a)</div>
          <div className={styles.rows}>
            {TOKENS.map((t, i) => {
              const p = probs[i] ?? 0
              const width = `${Math.round(p * 100)}%`
              return (
                <div key={t} className={styles.row}>
                  <div className={styles.token}>{t}</div>
                  <div className={styles.barTrack}>
                    <div className={styles.barFill} style={{ width }} />
                  </div>
                  <div className={styles.value}>{p.toFixed(3)}</div>
                </div>
              )
            })}
          </div>
          <div className={styles.smallNote}>
            logits: [{logits.map((x) => x.toFixed(2)).join(', ')}]
          </div>
        </div>
      </div>
    </div>
  )
}

