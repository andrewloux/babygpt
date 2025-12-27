import { useMemo, useState } from 'react'

import { Slider } from './Slider'
import { VizCard } from './VizCard'
import styles from './SamplingConvergenceViz.module.css'

const TOKENS = ['e', 'a', 'i'] as const

function softmaxWithTemp(logits: number[], temperature: number) {
  const t = Math.max(1e-6, temperature)
  const scaled = logits.map((z) => z / t)
  const m = Math.max(...scaled)
  const exps = scaled.map((z) => Math.exp(z - m))
  const sum = exps.reduce((a, b) => a + b, 0)
  return exps.map((e) => e / sum)
}

function sampleIndex(probs: number[]) {
  const r = Math.random()
  let acc = 0
  for (let i = 0; i < probs.length; i++) {
    acc += probs[i] ?? 0
    if (r <= acc) return i
  }
  return probs.length - 1
}

export function SamplingConvergenceViz() {
  const [logitE, setLogitE] = useState(1.5)
  const [logitA, setLogitA] = useState(0.5)
  const [logitI, setLogitI] = useState(-0.5)
  const [temperature, setTemperature] = useState(1.0)

  const [counts, setCounts] = useState<number[]>(() => TOKENS.map(() => 0))
  const total = counts.reduce((a, b) => a + b, 0)

  const logits = useMemo(() => [logitE, logitA, logitI], [logitE, logitA, logitI])
  const probs = useMemo(() => softmaxWithTemp(logits, temperature), [logits, temperature])

  const empirical = useMemo(() => {
    if (total <= 0) return TOKENS.map(() => 0)
    return counts.map((c) => c / total)
  }, [counts, total])

  const maxDev = useMemo(() => {
    return Math.max(...probs.map((p, i) => Math.abs(p - (empirical[i] ?? 0))))
  }, [probs, empirical])

  function reset() {
    setCounts(TOKENS.map(() => 0))
  }

  function drawMany(n: number) {
    const next = counts.slice()
    for (let k = 0; k < n; k++) {
      const idx = sampleIndex(probs)
      next[idx] = (next[idx] ?? 0) + 1
    }
    setCounts(next)
  }

  return (
    <VizCard
      title="Sampling Convergence"
      subtitle="Probability mass becomes frequencies"
      figNum="Fig. 2.7c"
      footer={
        <div className={styles.footer}>
          Softmax gives us a distribution. Sampling is how we turn that distribution into an actual next token. With enough draws, the
          histogram starts to look like the probabilities — that’s the “mass” showing up in the real world.
        </div>
      }
    >
      <div className={styles.content}>
        <div className={`${styles.panel} panel-dark inset-box`}>
          <div className={styles.sectionTitle}>Set the distribution</div>

          <div className={styles.sliderGroup}>
            <label className={styles.sliderLabel} htmlFor="scLogitE">
              <span className={styles.name} style={{ color: 'var(--accent-cyan)' }}>
                logit(e)
              </span>
              <span className={styles.value}>{logitE.toFixed(1)}</span>
            </label>
            <Slider id="scLogitE" wrap={false} min={-10} max={10} step={0.1} value={logitE} onValueChange={setLogitE} ariaLabel="logit e" />
          </div>
          <div className={styles.sliderGroup}>
            <label className={styles.sliderLabel} htmlFor="scLogitA">
              <span className={styles.name} style={{ color: 'var(--accent-magenta)' }}>
                logit(a)
              </span>
              <span className={styles.value}>{logitA.toFixed(1)}</span>
            </label>
            <Slider id="scLogitA" wrap={false} min={-10} max={10} step={0.1} value={logitA} onValueChange={setLogitA} ariaLabel="logit a" />
          </div>
          <div className={styles.sliderGroup}>
            <label className={styles.sliderLabel} htmlFor="scLogitI">
              <span className={styles.name} style={{ color: 'var(--accent-yellow)' }}>
                logit(i)
              </span>
              <span className={styles.value}>{logitI.toFixed(1)}</span>
            </label>
            <Slider id="scLogitI" wrap={false} min={-10} max={10} step={0.1} value={logitI} onValueChange={setLogitI} ariaLabel="logit i" />
          </div>

          <div className={styles.sectionTitle}>Temperature</div>
          <div className={styles.sliderGroup}>
            <label className={styles.sliderLabel} htmlFor="scTemp">
              <span className={styles.name}>T</span>
              <span className={styles.value}>{temperature.toFixed(2)}</span>
            </label>
            <Slider id="scTemp" wrap={false} min={0.2} max={3} step={0.05} value={temperature} onValueChange={setTemperature} ariaLabel="temperature" />
          </div>

          <div className={styles.sectionTitle}>True probabilities</div>
          <div className={styles.bars}>
            {TOKENS.map((t, i) => {
              const p = probs[i] ?? 0
              const w = Math.max(0, Math.min(100, p * 100))
              const barClass = t === 'e' ? styles.barE : t === 'a' ? styles.barA : styles.barI
              return (
                <div key={t} className={styles.barRow}>
                  <div className={styles.barKey}>{t}</div>
                  <div className={styles.track}>
                    <div className={`${styles.bar} ${barClass}`} style={{ width: `${w}%` }} />
                  </div>
                  <div className={styles.barVal}>{(p * 100).toFixed(1)}%</div>
                </div>
              )
            })}
          </div>
        </div>

        <div className={`${styles.panel} panel-dark inset-box`}>
          <div className={styles.sectionTitle}>Draw samples</div>
          <div className={styles.actions}>
            <button type="button" className={styles.drawBtn} onClick={() => drawMany(1)}>
              Draw 1
            </button>
            <button type="button" className={styles.drawBtn} onClick={() => drawMany(100)}>
              Draw 100
            </button>
            <button type="button" className={styles.resetBtn} onClick={reset} disabled={total === 0}>
              Reset
            </button>
          </div>

          <div className={styles.metrics}>
            <div className={styles.metricRow}>
              <span className={styles.metricKey}>total draws</span>
              <span className={styles.metricVal}>{total}</span>
            </div>
            <div className={styles.metricRow}>
              <span className={styles.metricKey}>max deviation</span>
              <span className={styles.metricVal}>{(maxDev * 100).toFixed(2)}%</span>
            </div>
          </div>

          <div className={styles.sectionTitle}>Empirical frequencies</div>
          <div className={styles.bars}>
            {TOKENS.map((t, i) => {
              const p = empirical[i] ?? 0
              const w = Math.max(0, Math.min(100, p * 100))
              const barClass = t === 'e' ? styles.barE : t === 'a' ? styles.barA : styles.barI
              return (
                <div key={t} className={styles.barRow}>
                  <div className={styles.barKey}>{t}</div>
                  <div className={styles.track}>
                    <div className={`${styles.bar} ${barClass}`} style={{ width: `${w}%` }} />
                  </div>
                  <div className={styles.barVal}>
                    {total > 0 ? `${counts[i] ?? 0} (${(p * 100).toFixed(1)}%)` : '—'}
                  </div>
                </div>
              )
            })}
          </div>

          <div className={styles.note}>
            If this feels slow at first, that’s the point: <em>sampling is noisy</em>. The distribution is what the model believes; the samples
            are the little coin flips that turn belief into a concrete next token.
          </div>
        </div>
      </div>
    </VizCard>
  )
}
