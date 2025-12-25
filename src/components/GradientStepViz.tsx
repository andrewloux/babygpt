import { useEffect, useMemo, useState } from 'react'

import { Slider } from './Slider'
import { VizCard } from './VizCard'
import styles from './GradientStepViz.module.css'

function softmax2(zTrue: number, zOther: number) {
  const m = Math.max(zTrue, zOther)
  const eTrue = Math.exp(zTrue - m)
  const eOther = Math.exp(zOther - m)
  const s = eTrue + eOther
  return { pTrue: eTrue / s, pOther: eOther / s }
}

function safeLog(x: number) {
  return Math.log(Math.max(1e-12, x))
}

export function GradientStepViz() {
  const [guess, setGuess] = useState<'up' | 'down' | null>(null)
  const [guessLocked, setGuessLocked] = useState(false)
  const [revealed, setRevealed] = useState(false)

  const [zTrue, setZTrue] = useState(-1.0)
  const zOther = 0.0

  useEffect(() => {
    setGuess(null)
    setGuessLocked(false)
    setRevealed(false)
  }, [zTrue])

  const { pTrue } = useMemo(() => softmax2(zTrue, zOther), [zTrue])
  const loss = -safeLog(pTrue)
  const pMinusY = pTrue - 1

  const correct = 'up'
  const guessCorrect = revealed && guess === correct

  const view = useMemo(() => {
    const W = 520
    const H = 240
    const padL = 44
    const padR = 16
    const padT = 18
    const padB = 34

    const minX = -6
    const maxX = 6
    const minY = 0
    const maxY = 6.5

    const sx = (vx: number) => padL + ((vx - minX) / (maxX - minX)) * (W - padL - padR)
    const sy = (vy: number) => padT + (1 - (vy - minY) / (maxY - minY)) * (H - padT - padB)

    const pts: [number, number][] = []
    const N = 90
    for (let i = 0; i <= N; i++) {
      const vx = minX + (i / N) * (maxX - minX)
      const { pTrue: p } = softmax2(vx, zOther)
      const ly = -safeLog(p)
      pts.push([sx(vx), sy(ly)])
    }

    const curve = pts.map((p) => p.join(',')).join(' ')
    const px = sx(zTrue)
    const py = sy(loss)

    // derivative of NLL wrt zTrue for 2-class softmax is (pTrue - 1)
    const slope = pMinusY
    const tx1 = sx(minX)
    const ty1 = sy(loss + slope * (minX - zTrue))
    const tx2 = sx(maxX)
    const ty2 = sy(loss + slope * (maxX - zTrue))

    return { W, H, curve, px, py, tx1, ty1, tx2, ty2, xAxisY: sy(0), yAxisX: sx(0) }
  }, [loss, pMinusY, zTrue])

  return (
    <VizCard
      title="One Step You Can Feel"
      subtitle="A single logit, a single direction"
      figNum="Fig. 2.10a"
      footer={
        <div className={styles.footer}>
          Here we hold everything fixed except one score. That’s the whole point: you can see the loss respond, and you can see which direction is “downhill”.
        </div>
      }
    >
      <div className={styles.layout}>
        <div className={`${styles.panel} panel-dark inset-box`}>
          <div className={styles.promptTitle}>Before you reveal</div>
          <div className={styles.promptText}>
            If the model is under‑predicting the true token, should the <em>true token’s</em> score go <strong>up</strong> or <strong>down</strong>?
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
                <span className={styles.good}>Yep. The true score should go up.</span>
              ) : (
                <span className={styles.bad}>Close — the true score should go up.</span>
              )
            ) : guessLocked ? (
              <span className={styles.neutral}>Okay. Now reveal the sign.</span>
            ) : (
              <span className={styles.neutral}>Pick a guess, lock it, then reveal.</span>
            )}
          </div>
        </div>

        <div className={`${styles.panel} panel-dark inset-box`}>
          <div className={styles.sectionTitle}>Control</div>
          <div className={styles.row}>
            <div className={styles.key}>z_true</div>
            <div className={styles.val}>{zTrue.toFixed(2)}</div>
          </div>
          <Slider wrap={false} min={-6} max={6} step={0.01} value={zTrue} onValueChange={setZTrue} ariaLabel="true token logit" />

          <div className={styles.sectionTitle}>State</div>
          <div className={styles.row}>
            <div className={styles.key}>p(true)</div>
            <div className={styles.valEmph}>{(pTrue * 100).toFixed(1)}%</div>
          </div>
          <div className={styles.row}>
            <div className={styles.key}>loss</div>
            <div className={styles.val}>{loss.toFixed(3)}</div>
          </div>
          <div className={styles.row}>
            <div className={styles.key}>p − y</div>
            <div className={`${styles.val} ${revealed ? styles.valReveal : styles.valHidden}`}>{pMinusY.toFixed(3)}</div>
          </div>
          <div className={styles.hint}>
            <span className={styles.mono}>y=1</span> for the true token. When <span className={styles.mono}>p</span> is too small, <span className={styles.mono}>p−y</span> is negative.
          </div>
        </div>

        <div className={`${styles.chart} panel-dark inset-box`}>
          <div className={styles.sectionTitle}>Loss vs true score</div>
          <svg
            className={styles.svg}
            viewBox={`0 0 ${view.W} ${view.H}`}
            role="img"
            aria-label="Loss curve versus the true token logit, with a tangent line"
          >
            <line className={styles.axis} x1={44} y1={view.xAxisY} x2={504} y2={view.xAxisY} />
            <line className={styles.axis} x1={view.yAxisX} y1={206} x2={view.yAxisX} y2={18} />

            <polyline className={styles.curve} points={view.curve} />
            <line className={`${styles.tangent} ${revealed ? '' : styles.tangentHidden}`} x1={view.tx1} y1={view.ty1} x2={view.tx2} y2={view.ty2} />
            <circle className={styles.point} cx={view.px} cy={view.py} r={6} />
          </svg>
        </div>
      </div>
    </VizCard>
  )
}

