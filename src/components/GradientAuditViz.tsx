import { useMemo, useState } from 'react'

import { Slider } from './Slider'
import { VizCard } from './VizCard'
import styles from './GradientAuditViz.module.css'

const CHARS = ['e', 'a', 'i'] as const
type Char = (typeof CHARS)[number]

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

function centralDiff(f: (xs: number[]) => number, xs: number[], j: number, eps: number) {
  const plus = xs.slice()
  const minus = xs.slice()
  plus[j] = (plus[j] ?? 0) + eps
  minus[j] = (minus[j] ?? 0) - eps
  return (f(plus) - f(minus)) / (2 * eps)
}

export function GradientAuditViz() {
  const [logitE, setLogitE] = useState(1.5)
  const [logitA, setLogitA] = useState(0.5)
  const [logitI, setLogitI] = useState(-0.5)
  const [trueChar, setTrueChar] = useState<Char>('e')

  // Slider is linear; map t in [-4, 0] to eps = 10^t (0.0001 → 1.0)
  const [log10eps, setLog10eps] = useState(-1.0)
  const eps = Math.pow(10, log10eps)

  const logits = useMemo(() => [logitE, logitA, logitI], [logitE, logitA, logitI])
  const yIndex = CHARS.indexOf(trueChar)

  const probs = useMemo(() => softmax(logits), [logits])
  const loss = useMemo(() => lossNll(probs, yIndex), [probs, yIndex])

  const analytic = useMemo(() => {
    return probs.map((p, i) => p - (i === yIndex ? 1 : 0))
  }, [probs, yIndex])

  const numeric = useMemo(() => {
    const f = (zs: number[]) => lossNll(softmax(zs), yIndex)
    return logits.map((_, j) => centralDiff(f, logits, j, eps))
  }, [eps, logits, yIndex])

  const rows = useMemo(() => {
    return CHARS.map((c, j) => {
      const a = analytic[j] ?? 0
      const n = numeric[j] ?? 0
      const err = Math.abs(a - n)
      return { c, a, n, err }
    })
  }, [analytic, numeric])

  const maxErr = useMemo(() => Math.max(...rows.map((r) => r.err)), [rows])

  return (
    <VizCard
      title="Gradient Audit"
      subtitle="Finite differences vs p − y"
      figNum="Fig. 2.10d"
      footer={
        <div className={styles.footer}>
          This is a sanity check engineers actually use: compute the gradient two different ways and make sure they agree.
        </div>
      }
    >
      <div className={styles.content}>
        <div className={`${styles.panel} panel-dark inset-box`}>
          <div className={styles.sectionTitle}>Pick a tiny example</div>

          <div className={styles.row}>
            <div className={styles.key}>True token</div>
            <div className={styles.pills} role="radiogroup" aria-label="True token for gradient audit">
              {CHARS.map((c) => (
                <button key={c} type="button" className={`${styles.pill} ${trueChar === c ? styles.pillActive : ''}`} onClick={() => setTrueChar(c)}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.sectionTitle}>Logits</div>
          <div className={styles.sliderGroup}>
            <label className={styles.sliderLabel} htmlFor="auditE">
              <span className={styles.name} style={{ color: 'var(--accent-cyan)' }}>
                z_e
              </span>
              <span className={styles.value}>{logitE.toFixed(1)}</span>
            </label>
            <Slider id="auditE" wrap={false} min={-10} max={10} step={0.1} value={logitE} onValueChange={setLogitE} ariaLabel="logit e" />
          </div>
          <div className={styles.sliderGroup}>
            <label className={styles.sliderLabel} htmlFor="auditA">
              <span className={styles.name} style={{ color: 'var(--accent-magenta)' }}>
                z_a
              </span>
              <span className={styles.value}>{logitA.toFixed(1)}</span>
            </label>
            <Slider id="auditA" wrap={false} min={-10} max={10} step={0.1} value={logitA} onValueChange={setLogitA} ariaLabel="logit a" />
          </div>
          <div className={styles.sliderGroup}>
            <label className={styles.sliderLabel} htmlFor="auditI">
              <span className={styles.name} style={{ color: 'var(--accent-yellow)' }}>
                z_i
              </span>
              <span className={styles.value}>{logitI.toFixed(1)}</span>
            </label>
            <Slider id="auditI" wrap={false} min={-10} max={10} step={0.1} value={logitI} onValueChange={setLogitI} ariaLabel="logit i" />
          </div>

          <div className={styles.sectionTitle}>Finite difference size</div>
          <div className={styles.row}>
            <div className={styles.key}>ε</div>
            <div className={styles.val}>{eps.toFixed(6)}</div>
          </div>
          <Slider wrap={false} min={-4} max={0} step={0.01} value={log10eps} onValueChange={setLog10eps} ariaLabel="log10 epsilon" />
          <div className={styles.hint}>
            Too big: the curve isn’t “local”. Too small: floating-point noise. Somewhere in the middle is the sweet spot.
          </div>

          <div className={styles.metrics}>
            <div className={styles.metricRow}>
              <span className={styles.metricKey}>loss</span>
              <span className={styles.metricVal}>{loss.toFixed(4)}</span>
            </div>
            <div className={styles.metricRow}>
              <span className={styles.metricKey}>max error</span>
              <span className={styles.metricVal}>{maxErr.toExponential(2)}</span>
            </div>
          </div>
        </div>

        <div className={`${styles.panel} panel-dark inset-box`}>
          <div className={styles.sectionTitle}>Compare gradients</div>
          <div className={styles.table} role="table" aria-label="Gradient audit table">
            <div className={`${styles.tr} ${styles.header}`} role="row">
              <div className={styles.th} role="columnheader">
                logit
              </div>
              <div className={styles.th} role="columnheader">
                p − y
              </div>
              <div className={styles.th} role="columnheader">
                finite diff
              </div>
              <div className={styles.th} role="columnheader">
                |Δ|
              </div>
            </div>

            {rows.map((r) => (
              <div key={r.c} className={styles.tr} role="row">
                <div className={styles.td} role="cell">
                  {`z_${r.c}`}
                </div>
                <div className={`${styles.td} ${r.a >= 0 ? styles.pos : styles.neg}`} role="cell">
                  {r.a.toFixed(4)}
                </div>
                <div className={`${styles.td} ${r.n >= 0 ? styles.pos : styles.neg}`} role="cell">
                  {r.n.toFixed(4)}
                </div>
                <div className={styles.td} role="cell">
                  {r.err.toExponential(2)}
                </div>
              </div>
            ))}
          </div>

          <div className={styles.note}>
            The important part is the shape: the analytic gradient is <span className={styles.mono}>p−y</span>, and the finite-difference
            gradient converges to the same numbers as <span className={styles.mono}>ε</span> gets small (but not <em>too</em> small).
          </div>
        </div>
      </div>
    </VizCard>
  )
}
