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

function oneHot(n: number, idx: number) {
  return Array.from({ length: n }, (_, i) => (i === idx ? 1 : 0))
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
  // v^T W, where W is D x V. Return V.
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
  const y = useMemo(() => oneHot(OUT_VOCAB.length, yIndex), [yIndex])
  const loss = useMemo(() => lossNll(probs, yIndex), [probs, yIndex])

  // Core blame signal at logits
  const dL_dz = useMemo(() => probs.map((p, i) => p - (y[i] ?? 0)), [probs, y])

  // Backprop into embedding vector: dL/dx = Wout * dL/dz
  // Here Wout is D x V, dL/dz is V, so result is D.
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
        <div className={styles.footer}>
          Training is just moving numbers. The question is: <em>which</em> numbers, and in <em>which</em> direction?
        </div>
      }
    >
      <div className={styles.content}>
        <div className={`${styles.panel} panel-dark inset-box`}>
          <div className={styles.sectionTitle}>Pick a single example</div>

          <div className={styles.row}>
            <div className={styles.key}>Input token x</div>
            <div className={styles.pills} role="radiogroup" aria-label="Input token">
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

          <div className={styles.row}>
            <div className={styles.key}>True next token y</div>
            <div className={styles.pills} role="radiogroup" aria-label="True token">
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

          <div className={styles.sectionTitle}>Before you reveal</div>
          <div className={styles.promptText}>
            When we train on this one example, do we update <strong>one embedding row</strong> (the row for <span className={styles.mono}>{xTok}</span>),
            or do we update <strong>all</strong> rows?
          </div>
          <div className={styles.promptRow}>
            <div className={styles.choiceRow}>
              <button
                type="button"
                className={`${styles.choiceBtn} ${guess === 'one' ? styles.choiceBtnSelected : ''}`}
                onClick={() => setGuess('one')}
                aria-pressed={guess === 'one'}
                disabled={guessLocked}
              >
                One row
              </button>
              <button
                type="button"
                className={`${styles.choiceBtn} ${guess === 'all' ? styles.choiceBtnSelected : ''}`}
                onClick={() => setGuess('all')}
                aria-pressed={guess === 'all'}
                disabled={guessLocked}
              >
                All rows
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
              <button type="button" className={styles.revealBtn} onClick={() => guessLocked && setRevealed(true)} disabled={!guessLocked}>
                Reveal
              </button>
            </div>
          </div>
          <div className={styles.feedback} aria-live="polite">
            {revealed ? (
              guessCorrect ? (
                <span className={styles.good}>Yep. Only the row you looked up can receive a gradient.</span>
              ) : (
                <span className={styles.bad}>Close — only the selected row gets updated for this example.</span>
              )
            ) : guessLocked ? (
              <span className={styles.neutral}>Okay. Now reveal the blame chain.</span>
            ) : (
              <span className={styles.neutral}>Pick a guess, lock it, then reveal.</span>
            )}
          </div>

          <div className={styles.metrics}>
            <div className={styles.metricRow}>
              <span className={styles.metricKey}>p(true)</span>
              <span className={styles.metricVal}>{(probs[yIndex] ?? 0).toFixed(3)}</span>
            </div>
            <div className={styles.metricRow}>
              <span className={styles.metricKey}>loss</span>
              <span className={styles.metricVal}>{loss.toFixed(3)}</span>
            </div>
          </div>
        </div>

        <div className={`${styles.panel} panel-dark inset-box`}>
          <div className={styles.sectionTitle}>Forward pass (what the model does)</div>

          <div className={styles.block}>
            <div className={styles.blockTitle}>1) Embedding lookup</div>
            <div className={styles.smallNote}>
              <span className={styles.mono}>x = {xTok}</span> selects one row: <span className={styles.mono}>e_x = E[x]</span>
            </div>
            <div className={styles.vec}>
              {xVec.map((v, i) => (
                <span key={i} className={`${styles.cell} ${styles.cellCyan}`}>
                  {v.toFixed(1)}
                </span>
              ))}
            </div>
          </div>

          <div className={styles.block}>
            <div className={styles.blockTitle}>2) Logits</div>
            <div className={styles.smallNote}>
              <span className={styles.mono}>z = e_xᵀ W_out</span>
            </div>
            <div className={styles.row3}>
              {OUT_VOCAB.map((c, j) => (
                <div key={c} className={styles.kv}>
                  <div className={styles.k}>{c}</div>
                  <div className={styles.v}>{(logits[j] ?? 0).toFixed(2)}</div>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.block}>
            <div className={styles.blockTitle}>3) Probabilities</div>
            {OUT_VOCAB.map((c, j) => (
              <div key={c} className={styles.probRow}>
                <span className={styles.probKey}>{c}</span>
                <div className={styles.track}>
                  <div className={styles.bar} style={{ width: `${Math.min(100, (probs[j] ?? 0) * 100)}%` }} />
                </div>
                <span className={styles.probVal}>{(probs[j] ?? 0).toFixed(3)}</span>
              </div>
            ))}
          </div>

          <div className={styles.block}>
            <div className={styles.blockTitle}>4) Loss</div>
            <div className={styles.smallNote}>
              <span className={styles.mono}>L = −log p(true)</span> for <span className={styles.mono}>y={yTok}</span>
            </div>
            <div className={styles.lossVal}>{loss.toFixed(3)}</div>
          </div>
        </div>

        <div className={`${styles.panel} panel-dark inset-box`}>
          <div className={styles.sectionTitle}>Backward pass (the blame)</div>

          <div className={styles.block}>
            <div className={styles.blockTitle}>A) Logit blame: p − y</div>
            <div className={styles.smallNote}>
              Positive means “push that logit down”. Negative means “push that logit up”.
            </div>
            <div className={styles.row3}>
              {OUT_VOCAB.map((c, j) => {
                const g = dL_dz[j] ?? 0
                const cls = g >= 0 ? styles.cellMagenta : styles.cellCyan
                return (
                  <div key={c} className={styles.kv}>
                    <div className={styles.k}>{c}</div>
                    <div className={`${styles.v} ${revealed ? cls : styles.hidden}`}>{g.toFixed(3)}</div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className={styles.block}>
            <div className={styles.blockTitle}>B) Embedding blame: dL/de_x</div>
            <div className={styles.smallNote}>
              This is the gradient that will update the selected row <span className={styles.mono}>E[{xTok}]</span>.
            </div>
            <div className={styles.vec}>
              {dL_dx.map((v, i) => (
                <span key={i} className={`${styles.cell} ${revealed ? (v >= 0 ? styles.cellMagenta : styles.cellCyan) : styles.hidden}`}>
                  {v.toFixed(3)}
                </span>
              ))}
            </div>
          </div>

          <div className={styles.block}>
            <div className={styles.blockTitle}>C) Which rows get touched?</div>
            <div className={styles.table}>
              {INPUT_VOCAB.map((t, i) => (
                <div key={t} className={`${styles.tableRow} ${i === xIndex ? styles.tableRowActive : styles.tableRowInactive}`}>
                  <span className={styles.tableKey}>{t}</span>
                  <span className={`${styles.tableNote} ${revealed ? '' : styles.hidden}`}>
                    {i === xIndex ? 'updated' : 'untouched'}
                  </span>
                </div>
              ))}
            </div>
            <div className={styles.note}>
              This is why the one‑hot “selector switch” mattered: the forward pass only used one row, so only one row can receive blame.
            </div>
          </div>
        </div>
      </div>
    </VizCard>
  )
}

