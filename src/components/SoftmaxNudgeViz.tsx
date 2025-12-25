import { useEffect, useMemo, useState } from 'react'

import { Slider } from './Slider'
import { VizCard } from './VizCard'
import styles from './SoftmaxNudgeViz.module.css'

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

function oneHot(n: number, idx: number) {
  return Array.from({ length: n }, (_, i) => (i === idx ? 1 : 0))
}

function centralDiff(f: (xs: number[]) => number, xs: number[], j: number, eps: number) {
  const plus = xs.slice()
  const minus = xs.slice()
  plus[j] = (plus[j] ?? 0) + eps
  minus[j] = (minus[j] ?? 0) - eps
  return (f(plus) - f(minus)) / (2 * eps)
}

export function SoftmaxNudgeViz() {
  const [logitE, setLogitE] = useState(1.5)
  const [logitA, setLogitA] = useState(0.5)
  const [logitI, setLogitI] = useState(-0.5)

  const [trueChar, setTrueChar] = useState<Char>('e')
  const [inspectChar, setInspectChar] = useState<Char>('e')
  const [eps, setEps] = useState(0.25)

  const [guess, setGuess] = useState<'up' | 'down' | null>(null)
  const [guessLocked, setGuessLocked] = useState(false)
  const [revealed, setRevealed] = useState(false)

  const logits = useMemo(() => [logitE, logitA, logitI], [logitE, logitA, logitI])
  const yIndex = CHARS.indexOf(trueChar)
  const inspectIndex = CHARS.indexOf(inspectChar)

  const probs = useMemo(() => softmax(logits), [logits])
  const y = useMemo(() => oneHot(3, yIndex), [yIndex])
  const grad = useMemo(() => probs.map((p, i) => p - (y[i] ?? 0)), [probs, y])

  const loss = useMemo(() => lossNll(probs, yIndex), [probs, yIndex])

  const finite = useMemo(() => {
    const f = (zs: number[]) => lossNll(softmax(zs), yIndex)
    return centralDiff(f, logits, inspectIndex, eps)
  }, [eps, inspectIndex, logits, yIndex])

  const gradAnalytic = grad[inspectIndex] ?? 0
  const suggestedDirection: 'up' | 'down' = gradAnalytic > 0 ? 'down' : 'up'
  const guessCorrect = revealed && guess === suggestedDirection

  useEffect(() => {
    setGuess(null)
    setGuessLocked(false)
    setRevealed(false)
  }, [inspectChar, trueChar, logitE, logitA, logitI, eps])

  const pTrue = probs[yIndex] ?? 0

  return (
    <VizCard
      title="The Physics of the Nudge"
      subtitle="Why the logit gradient is p − y"
      figNum="Fig. 2.10b"
      footer={
        <div className={styles.footer}>
          We’re not doing calculus here. We’ll “measure the slope” by nudging one score a tiny amount and watching how the loss changes.
        </div>
      }
    >
      <div className={styles.content}>
        <div className={`${styles.panel} panel-dark inset-box`}>
          <div className={styles.sectionTitle}>Setup</div>

          <div className={styles.row}>
            <div className={styles.key}>True token</div>
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
          </div>

          <div className={styles.sectionTitle}>Scores (logits)</div>
          <div className={styles.sliderGroup}>
            <label className={styles.sliderLabel} htmlFor="nudgeE">
              <span className={styles.name} style={{ color: 'var(--accent-cyan)' }}>
                '{CHARS[0]}' score
              </span>
              <span className={styles.value}>{logitE.toFixed(1)}</span>
            </label>
            <Slider id="nudgeE" wrap={false} min={-10} max={10} step={0.1} value={logitE} onValueChange={setLogitE} ariaLabel="logit for e" />
          </div>
          <div className={styles.sliderGroup}>
            <label className={styles.sliderLabel} htmlFor="nudgeA">
              <span className={styles.name} style={{ color: 'var(--accent-magenta)' }}>
                '{CHARS[1]}' score
              </span>
              <span className={styles.value}>{logitA.toFixed(1)}</span>
            </label>
            <Slider id="nudgeA" wrap={false} min={-10} max={10} step={0.1} value={logitA} onValueChange={setLogitA} ariaLabel="logit for a" />
          </div>
          <div className={styles.sliderGroup}>
            <label className={styles.sliderLabel} htmlFor="nudgeI">
              <span className={styles.name} style={{ color: 'var(--accent-yellow)' }}>
                '{CHARS[2]}' score
              </span>
              <span className={styles.value}>{logitI.toFixed(1)}</span>
            </label>
            <Slider id="nudgeI" wrap={false} min={-10} max={10} step={0.1} value={logitI} onValueChange={setLogitI} ariaLabel="logit for i" />
          </div>

          <div className={styles.sectionTitle}>Pick a knob</div>
          <div className={styles.row}>
            <div className={styles.key}>Inspect</div>
            <div className={styles.pills} role="radiogroup" aria-label="Inspect logit">
              {CHARS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`${styles.pill} ${inspectChar === c ? styles.pillActive : ''}`}
                  onClick={() => setInspectChar(c)}
                >
                  z_{c}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.sectionTitle}>Before you reveal</div>
          <div className={styles.promptText}>
            If you want the loss to go <em>down</em>, should <span className={styles.mono}>z_{inspectChar}</span> go <strong>up</strong> or <strong>down</strong>?
          </div>
          <div className={styles.promptRow}>
            <div className={styles.choiceRow}>
              <button
                type="button"
                className={`${styles.choiceBtn} ${guess === 'up' ? styles.choiceBtnSelected : ''}`}
                onClick={() => setGuess('up')}
                aria-pressed={guess === 'up'}
                disabled={guessLocked}
              >
                Up
              </button>
              <button
                type="button"
                className={`${styles.choiceBtn} ${guess === 'down' ? styles.choiceBtnSelected : ''}`}
                onClick={() => setGuess('down')}
                aria-pressed={guess === 'down'}
                disabled={guessLocked}
              >
                Down
              </button>
            </div>
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.lockBtn}
                onClick={() => guess !== null && setGuessLocked(true)}
                disabled={guessLocked || guess === null}
              >
                {guessLocked ? 'Guess locked' : 'Lock guess'}
              </button>
              <button
                type="button"
                className={styles.revealBtn}
                onClick={() => guessLocked && setRevealed(true)}
                disabled={!guessLocked}
              >
                Reveal
              </button>
            </div>
          </div>
          <div className={styles.feedback} aria-live="polite">
            {revealed ? (
              guessCorrect ? (
                <span className={styles.good}>Yep. That’s the downhill direction.</span>
              ) : (
                <span className={styles.bad}>Close — the downhill direction is the other way.</span>
              )
            ) : guessLocked ? (
              <span className={styles.neutral}>Okay. Now reveal the slope.</span>
            ) : (
              <span className={styles.neutral}>Pick a guess, lock it, then reveal.</span>
            )}
          </div>

          <div className={styles.sectionTitle}>Nudge size</div>
          <div className={styles.row}>
            <div className={styles.key}>ε</div>
            <div className={styles.val}>{eps.toFixed(2)}</div>
          </div>
          <Slider wrap={false} min={0.05} max={1.0} step={0.01} value={eps} onValueChange={setEps} ariaLabel="epsilon" />
        </div>

        <div className={`${styles.panel} panel-dark inset-box`}>
          <div className={styles.sectionTitle}>State</div>

          <div className={styles.stateRow}>
            <div className={styles.stateKey}>p(true)</div>
            <div className={styles.stateVal}>
              <strong>{(pTrue * 100).toFixed(1)}%</strong>
            </div>
          </div>
          <div className={styles.stateRow}>
            <div className={styles.stateKey}>loss</div>
            <div className={styles.stateVal}>{loss.toFixed(3)}</div>
          </div>

          <div className={styles.block}>
            <div className={styles.blockTitle}>Softmax output p</div>
            {CHARS.map((c, i) => (
              <div key={c} className={styles.vecRow}>
                <span className={styles.vecKey}>{c}</span>
                <div className={styles.track}>
                  <div className={styles.bar} style={{ width: `${Math.min(100, (probs[i] ?? 0) * 100)}%` }} />
                </div>
                <span className={styles.vecVal}>{(probs[i] ?? 0).toFixed(3)}</span>
              </div>
            ))}
          </div>

          <div className={styles.block}>
            <div className={styles.blockTitle}>Target y (one-hot)</div>
            {CHARS.map((c, i) => (
              <div key={c} className={styles.vecRow}>
                <span className={styles.vecKey}>{c}</span>
                <span className={styles.vecVal}>{y[i]}</span>
              </div>
            ))}
          </div>

          <div className={styles.block}>
            <div className={styles.blockTitle}>Gradient wrt logits: p − y</div>
            {CHARS.map((c, i) => (
              <div key={c} className={styles.vecRow}>
                <span className={styles.vecKey}>{c}</span>
                <span className={`${styles.vecVal} ${revealed ? styles.reveal : styles.hidden}`}>
                  {(grad[i] ?? 0).toFixed(3)}
                </span>
              </div>
            ))}
            <div className={styles.note}>
              For the true token, <span className={styles.mono}>y=1</span>, so that entry is <span className={styles.mono}>p−1</span> (negative when you under‑predict).
              For the others, <span className={styles.mono}>y=0</span>, so they’re just <span className={styles.mono}>+p</span>.
            </div>
          </div>

          <div className={styles.block}>
            <div className={styles.blockTitle}>Finite difference check (same knob)</div>
            <div className={styles.fdRow}>
              <span className={styles.fdKey}>measured slope</span>
              <span className={styles.fdVal}>{finite.toFixed(3)}</span>
            </div>
            <div className={styles.fdRow}>
              <span className={styles.fdKey}>p − y</span>
              <span className={`${styles.fdVal} ${revealed ? styles.reveal : styles.hidden}`}>{gradAnalytic.toFixed(3)}</span>
            </div>
            <div className={styles.note}>
              They line up because we’re measuring the same thing two ways: “wiggle the score” vs “use the closed‑form gradient”.
            </div>
          </div>
        </div>
      </div>
    </VizCard>
  )
}

