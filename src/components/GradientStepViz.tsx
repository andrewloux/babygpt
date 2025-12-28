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
          <span className={styles.mono}>y=1</span> for the true token. When <span className={styles.mono}>p{'<'}1</span>, the gradient <span className={styles.mono}>p−y</span> is negative — push <span className={styles.zVar}>z<sub>true</sub></span> <em>up</em>.
        </div>
      }
    >
      <div className={styles.layout}>
        {/* Compact challenge bar */}
        <div className={styles.challengeBar}>
          <div className={styles.challengeLeft}>
            <span className={styles.challengePrompt}>
              Should <span className={styles.zVar}>z<sub>true</sub></span> go ↑ or ↓ to reduce loss?
            </span>
          </div>
          <div className={styles.challengeRight}>
            <div className={styles.choiceChips} role="radiogroup" aria-label="Direction guess">
              <button
                type="button"
                className={`${styles.choiceChip} ${guess === 'up' ? styles.choiceChipSelected : ''} ${guessLocked && guess === 'up' ? styles.choiceChipLocked : ''}`}
                onClick={() => setGuess('up')}
                aria-pressed={guess === 'up'}
                disabled={guessLocked}
              >
                ↑ Up
              </button>
              <button
                type="button"
                className={`${styles.choiceChip} ${guess === 'down' ? styles.choiceChipSelected : ''} ${guessLocked && guess === 'down' ? styles.choiceChipLocked : ''}`}
                onClick={() => setGuess('down')}
                aria-pressed={guess === 'down'}
                disabled={guessLocked}
              >
                ↓ Down
              </button>
            </div>
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
            <div className={styles.feedback} aria-live="polite">
              {revealed ? (
                guessCorrect ? (
                  <span className={styles.good}>Correct!</span>
                ) : (
                  <span className={styles.bad}>Answer: ↑</span>
                )
              ) : guessLocked ? (
                <span className={styles.neutral}>→</span>
              ) : null}
            </div>
          </div>
        </div>

        {/* Chart as HERO with stats overlay */}
        <div className={styles.chartPanel}>
          <div className={styles.chartFrame}>
            {/* Stats HUD overlay */}
            <div className={`${styles.statsHud} ${styles.hudTopRight}`}>
              <div className={styles.statRow}>
                <span className={styles.statKey}>p(true)</span>
                <span className={styles.statVal}>{(pTrue * 100).toFixed(1)}%</span>
              </div>
              <div className={styles.statRow}>
                <span className={styles.statKey}>loss</span>
                <span className={styles.statVal}>{loss.toFixed(3)}</span>
              </div>
              <div className={styles.statRow}>
                <span className={styles.statKey}>p−y</span>
                <span className={`${styles.statVal} ${revealed ? styles.statValReveal : styles.statValHidden}`}>
                  {pMinusY.toFixed(3)}
                </span>
              </div>
            </div>

            <svg
              className={styles.svg}
              viewBox={`0 0 ${view.W} ${view.H}`}
              role="img"
              aria-label="Loss curve versus the true token logit, with a tangent line"
            >
              {/* Axis labels with proper subscript */}
              <text className={styles.axisLabel} x={view.W - 8} y={view.xAxisY - 6} textAnchor="end">
                z<tspan className={styles.axisSubscript} baselineShift="sub">true</tspan>
              </text>
              <text className={styles.axisLabel} x={view.yAxisX + 6} y={24} textAnchor="start">loss</text>

              <line className={styles.axis} x1={44} y1={view.xAxisY} x2={504} y2={view.xAxisY} />
              <line className={styles.axis} x1={view.yAxisX} y1={206} x2={view.yAxisX} y2={18} />

              <polyline className={styles.curve} points={view.curve} />
              <line className={`${styles.tangent} ${revealed ? '' : styles.tangentHidden}`} x1={view.tx1} y1={view.ty1} x2={view.tx2} y2={view.ty2} />
              <circle className={styles.point} cx={view.px} cy={view.py} r={6} />
            </svg>
          </div>

          {/* Slider docked below chart - aligned with x-axis */}
          <div className={styles.sliderDock}>
            <span className={styles.sliderLabel}>z<sub>true</sub></span>
            <div className={styles.sliderTrack}>
              <Slider wrap={false} min={-6} max={6} step={0.01} value={zTrue} onValueChange={setZTrue} ariaLabel="true token logit" />
            </div>
            <span className={styles.sliderValue}>{zTrue.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </VizCard>
  )
}

