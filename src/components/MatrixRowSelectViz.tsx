import { useEffect, useMemo, useState } from 'react'

import styles from './MatrixRowSelectViz.module.css'
import { VizCard } from './VizCard'

export function MatrixRowSelectViz() {
  const vocab = ['h', 'e', 'l', 'o', '␣']
  const [targetIndex, setTargetIndex] = useState(2)
  const [pulse, setPulse] = useState(false)
  const [guessIndex, setGuessIndex] = useState<number | null>(null)
  const [guessLocked, setGuessLocked] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [revealPhase, setRevealPhase] = useState<'idle' | 'vector' | 'row' | 'result'>('idle')

  const W = [
    [0.1, -0.4, 0.8, 0.2, -0.1],
    [0.9, 0.1, -0.2, 0.5, 0.4],
    [-0.5, 0.8, 0.1, -0.9, 0.2],
    [0.3, -0.1, 0.4, 0.1, -0.8],
    [0.0, 0.0, 0.0, 0.0, 0.0],
  ]

  useEffect(() => {
    setPulse(true)
    const t = window.setTimeout(() => setPulse(false), 240)
    return () => window.clearTimeout(t)
  }, [targetIndex])

  useEffect(() => {
    setGuessIndex(null)
    setGuessLocked(false)
    setRevealed(false)
    setRevealPhase('idle')
  }, [targetIndex])

  const activeChar = vocab[targetIndex] ?? ''

  const result = useMemo(() => W[targetIndex]?.map((x) => x.toFixed(1)).join(', ') ?? '', [targetIndex])
  const vocabPreview = useMemo(() => vocab.join(' '), [vocab])

  const guessChoices = useMemo(() => {
    const a = targetIndex
    const b = (targetIndex + 1) % vocab.length
    const c = (targetIndex + 2) % vocab.length
    return [a, b, c]
  }, [targetIndex, vocab.length])

  const promptToken = vocab[guessChoices[0] ?? targetIndex] ?? activeChar

  const lockGuessDisabled = guessIndex === null
  const revealDisabled = !guessLocked

  const onLockGuess = () => {
    if (guessIndex === null) return
    setGuessLocked(true)
  }

  const onReveal = () => {
    if (!guessLocked) return
    setRevealed(true)
    setRevealPhase('vector')
    window.setTimeout(() => setRevealPhase('row'), 240)
    window.setTimeout(() => setRevealPhase('result'), 520)
  }

  const guessIsCorrect = revealed && guessIndex === targetIndex

  return (
    <VizCard
      title="Row Selection (You Can See It)"
      subtitle="One-hot selects a row"
      figNum="Fig. 2.4"
    >
      <div className={`${styles.stageWrap} ${pulse ? styles.pulse : ''}`}>
        {/* Compact challenge bar */}
        <div className={styles.challengeBar} aria-label="Prediction prompt">
          <div className={styles.challengeLeft}>
            <span className={styles.challengePrompt}>
              Which row when <span className={styles.mono}>1</span>→<span className={styles.mono}>{promptToken}</span>?
            </span>
            <div className={styles.guessChips} role="radiogroup" aria-label="Row guess">
              {guessChoices.map((ix) => {
                const ch = vocab[ix] ?? ''
                const selected = guessIndex === ix
                const locked = guessLocked && selected
                return (
                  <button
                    key={ch}
                    type="button"
                    className={`${styles.guessChip} ${selected ? styles.guessChipSelected : ''} ${locked ? styles.guessChipLocked : ''}`}
                    onClick={() => setGuessIndex(ix)}
                    aria-pressed={selected}
                    disabled={guessLocked}
                  >
                    {ch}
                  </button>
                )
              })}
            </div>
          </div>
          <div className={styles.challengeRight}>
            <button type="button" className={styles.actionBtn} onClick={onLockGuess} disabled={guessLocked || lockGuessDisabled}>
              {guessLocked ? 'Locked' : 'Lock'}
            </button>
            <button type="button" className={`${styles.actionBtn} ${styles.actionBtnPrimary}`} onClick={onReveal} disabled={revealDisabled}>
              Reveal
            </button>
          </div>
        </div>

        {/* Feedback + Token selector row */}
        <div className={styles.controlRow}>
          <div className={styles.feedback} aria-live="polite">
            {revealed ? (
              guessIsCorrect ? (
                <span className={styles.good}>Correct! Row {activeChar} selected.</span>
              ) : (
                <span className={styles.bad}>Close — row {activeChar} was selected.</span>
              )
            ) : guessLocked ? (
              <span className={styles.neutral}>Now reveal →</span>
            ) : (
              <span className={styles.neutral}>Pick & lock a guess</span>
            )}
          </div>
          <div className={styles.tokenSelector}>
            <span className={styles.tokenLabel}>Token:</span>
            {vocab.map((char, i) => (
              <button
                key={char}
                type="button"
                className={`${styles.tokenBtn} ${i === targetIndex ? styles.tokenBtnSelected : ''}`}
                onClick={() => setTargetIndex(i)}
              >
                {char}
              </button>
            ))}
          </div>
        </div>

        {/* Main multiplication layout: x × W = result */}
        <div className={`panel-dark ${styles.stage}`}>
          <div className={styles.multiplicationLayout}>
            {/* x vector */}
            <div className={styles.vectorSection}>
              <div className={styles.sectionLabel}>x</div>
              <div className={`inset-box ${styles.vectorFrame}`}>
                {vocab.map((char, i) => (
                  <div
                    key={char}
                    className={`${styles.vectorCell} ${i === targetIndex ? styles.vectorCellActive : ''} ${
                      revealPhase === 'vector' && i === targetIndex ? styles.vectorCellPulse : ''
                    }`}
                  >
                    {i === targetIndex ? 1 : 0}
                  </div>
                ))}
              </div>
            </div>

            {/* × operator */}
            <div className={styles.operator} aria-hidden="true">×</div>

            {/* W matrix */}
            <div className={styles.matrixSection}>
              <div className={styles.sectionLabel}>W</div>
              <div className={`inset-box ${styles.matrixFrame}`}>
                <table className={styles.matrixTable} aria-label="Embedding table rows">
                  <tbody>
                    {W.map((row, i) => {
                      const isActive = i === targetIndex
                      return (
                        <tr
                          key={vocab[i]}
                          className={`${styles.matrixRow} ${isActive ? styles.matrixRowActive : styles.matrixRowInactive}`}
                        >
                          <td className={`${styles.labelCell} ${isActive ? styles.labelCellActive : ''}`}>{vocab[i]}</td>
                          {row.map((val, j) => (
                            <td
                              key={`${i}-${j}`}
                              className={`${styles.cell} ${isActive ? styles.cellActive : ''} ${
                                revealPhase === 'row' && isActive ? styles.cellPulse : ''
                              }`}
                            >
                              {val.toFixed(1)}
                            </td>
                          ))}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* = and result */}
            <div className={styles.resultSection}>
              <div className={styles.equalsSign}>=</div>
              <div
                className={`inset-box ${styles.resultBox} ${!revealed ? styles.blurred : ''} ${
                  revealPhase === 'result' ? styles.resultPulse : ''
                }`}
              >
                <div className={styles.resultName}>W[{activeChar}]</div>
                <div className={styles.resultValues}>[{result}]</div>
              </div>
            </div>
          </div>
        </div>

        {/* Consolidated footer: equation + expansion + vocab */}
        <div className={styles.mathFooter}>
          <div className={styles.equation}>
            <span className={styles.mono}>xᵀW</span>
            <span className={styles.eqSign}>=</span>
            <span className={`${styles.eqResult} ${!revealed ? styles.hidden : ''}`}>W[{activeChar}]</span>
          </div>
          <details className="collapsible">
            <summary className={styles.expandToggle}>Why?</summary>
            <div className={styles.termBreakdown}>
              {vocab.map((char, i) => {
                const isActive = i === targetIndex
                return (
                  <div
                    key={char}
                    className={`${styles.termRow} ${isActive ? styles.termActive : styles.termDimmed}`}
                  >
                    <span className={styles.termCoeff}>{isActive ? '1' : '0'}</span>
                    <span className={styles.termDot}>·</span>
                    <span className={styles.termName}>W[{char}]</span>
                    <span className={styles.termArrow}>=</span>
                    <span className={styles.termResult}>{isActive ? `W[${char}]` : '0'}</span>
                  </div>
                )
              })}
              <div className={styles.termSumRow}>
                <span className={styles.termSumLabel}>sum</span>
                <span className={styles.termSumValue}>W[{activeChar}]</span>
              </div>
            </div>
          </details>
          <div className={styles.vocabHint}>
            [{vocabPreview}]
          </div>
        </div>
      </div>
    </VizCard>
  )
}
