import { useEffect, useMemo, useState } from 'react'

import { Slider } from './Slider'
import { VizCard } from './VizCard'
import styles from './SoftmaxBarsViz.module.css'

const CHARS = ['e', 'a', 'i'] as const

function softmax(logits: number[]): number[] {
  const maxL = Math.max(...logits)
  const exps = logits.map((l) => Math.exp(l - maxL))
  const sum = exps.reduce((a, b) => a + b, 0)
  return exps.map((e) => e / sum)
}

function safeLog2(x: number) {
  return Math.log(Math.max(1e-12, x)) / Math.log(2)
}

export function SoftmaxBarsViz() {
  const [logitE, setLogitE] = useState(1.5)
  const [logitA, setLogitA] = useState(0.5)
  const [logitI, setLogitI] = useState(-0.5)

  const [attemptLocked, setAttemptLocked] = useState(false)
  const [hasCompleted, setHasCompleted] = useState(false)

  const probs = useMemo(() => softmax([logitE, logitA, logitI]), [logitE, logitA, logitI])
  const ratioEA = probs[0] / Math.max(1e-12, probs[1])
  const surpriseE = -safeLog2(probs[0])

  const success = attemptLocked && ratioEA >= 1.8 && ratioEA <= 2.2

  useEffect(() => {
    if (success) setHasCompleted(true)
  }, [success])

  return (
    <VizCard
      title="Softmax: Scores → Probabilities"
      subtitle="Same scores, different mass"
      figNum="Fig. 2.5a"
      footer={
        <div className={styles.footer}>
          Scores can be any real numbers. Softmax turns them into probabilities by making everything positive and then normalizing so it sums to 1.
        </div>
      }
    >
      <div className={styles.content}>
        <div className={`${styles.panel} panel-dark inset-box`}>
          <div className={styles.prompt}>
            <div className={styles.promptTitle}>Challenge</div>
            <div className={styles.promptText}>
              Make <span className={styles.mono}>'e'</span> about <strong>twice as likely</strong> as <span className={styles.mono}>'a'</span>. Don’t touch temperature yet.
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>Scores (logits)</div>

            <div className={styles.sliderGroup}>
              <label className={styles.sliderLabel} htmlFor="barsLogitE">
                <span className={styles.name} style={{ color: 'var(--accent-cyan)' }}>
                  '{CHARS[0]}' score
                </span>
                <span className={styles.value}>{logitE.toFixed(1)}</span>
              </label>
              <Slider id="barsLogitE" wrap={false} min={-10} max={10} step={0.1} value={logitE} onValueChange={setLogitE} ariaLabel="Score for e" />
            </div>

            <div className={styles.sliderGroup}>
              <label className={styles.sliderLabel} htmlFor="barsLogitA">
                <span className={styles.name} style={{ color: 'var(--accent-magenta)' }}>
                  '{CHARS[1]}' score
                </span>
                <span className={styles.value}>{logitA.toFixed(1)}</span>
              </label>
              <Slider id="barsLogitA" wrap={false} min={-10} max={10} step={0.1} value={logitA} onValueChange={setLogitA} ariaLabel="Score for a" />
            </div>

            <div className={styles.sliderGroup}>
              <label className={styles.sliderLabel} htmlFor="barsLogitI">
                <span className={styles.name} style={{ color: 'var(--accent-yellow)' }}>
                  '{CHARS[2]}' score
                </span>
                <span className={styles.value}>{logitI.toFixed(1)}</span>
              </label>
              <Slider id="barsLogitI" wrap={false} min={-10} max={10} step={0.1} value={logitI} onValueChange={setLogitI} ariaLabel="Score for i" />
            </div>
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.lockBtn}
              onClick={() => setAttemptLocked(true)}
              disabled={attemptLocked}
            >
              {attemptLocked ? 'Attempt locked' : 'Lock attempt'}
            </button>
            <button
              type="button"
              className={styles.resetBtn}
              onClick={() => {
                setAttemptLocked(false)
                setLogitE(1.5)
                setLogitA(0.5)
                setLogitI(-0.5)
              }}
            >
              Reset
            </button>
          </div>

          <div className={styles.scorecard} aria-live="polite">
            {attemptLocked ? (
              success ? (
                <span className={styles.good}>Nice — that’s roughly 2×.</span>
              ) : (
                <span className={styles.bad}>Not quite. You’re at {ratioEA.toFixed(2)}×.</span>
              )
            ) : (
              <span className={styles.neutral}>When you’re ready, lock your attempt.</span>
            )}
          </div>
        </div>

        <div className={`${styles.panel} panel-dark inset-box`}>
          <div className={styles.sectionTitle}>Probabilities</div>

          <div className={styles.probRow}>
            <span className={styles.probKey} style={{ color: 'var(--accent-cyan)' }}>
              '{CHARS[0]}'
            </span>
            <div className={styles.track}>
              <div className={styles.barE} style={{ width: `${Math.min(100, probs[0] * 100)}%` }} />
            </div>
            <span className={styles.probVal}>{(probs[0] * 100).toFixed(1)}%</span>
          </div>
          <div className={styles.probRow}>
            <span className={styles.probKey} style={{ color: 'var(--accent-magenta)' }}>
              '{CHARS[1]}'
            </span>
            <div className={styles.track}>
              <div className={styles.barA} style={{ width: `${Math.min(100, probs[1] * 100)}%` }} />
            </div>
            <span className={styles.probVal}>{(probs[1] * 100).toFixed(1)}%</span>
          </div>
          <div className={styles.probRow}>
            <span className={styles.probKey} style={{ color: 'var(--accent-yellow)' }}>
              '{CHARS[2]}'
            </span>
            <div className={styles.track}>
              <div className={styles.barI} style={{ width: `${Math.min(100, probs[2] * 100)}%` }} />
            </div>
            <span className={styles.probVal}>{(probs[2] * 100).toFixed(1)}%</span>
          </div>

          <div className={styles.metrics}>
            <div className={styles.metricRow}>
              <span className={styles.metricKey}>Ratio</span>
              <span className={styles.metricVal}>
                P(e)/P(a) = <strong>{ratioEA.toFixed(2)}</strong>
              </span>
            </div>
            <div className={styles.metricRow}>
              <span className={styles.metricKey}>Surprise</span>
              <span className={styles.metricVal}>
                -log₂ P(e) = <strong>{surpriseE.toFixed(2)}</strong> bits
              </span>
            </div>
          </div>

          {!hasCompleted ? (
            <div className={styles.temperatureLocked}>Temperature shows up next. First, get a feel for score gaps.</div>
          ) : (
            <div className={styles.temperatureUnlocked}>Next up: temperature changes how sharp these gaps feel.</div>
          )}
        </div>
      </div>
    </VizCard>
  )
}
