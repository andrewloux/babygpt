import { useEffect, useMemo, useState } from 'react'

import styles from './MatrixRowSelectViz.module.css'
import { VizCard } from './VizCard'

type ExpansionTerm = { char: string; coeff: 0 | 1 }

export function MatrixRowSelectViz() {
  const vocab = ['h', 'e', 'l', 'o', '␣']
  const [targetIndex, setTargetIndex] = useState(2)
  const [pulse, setPulse] = useState(false)

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

  const activeChar = vocab[targetIndex] ?? ''

  const result = useMemo(() => W[targetIndex]?.map((x) => x.toFixed(1)).join(', ') ?? '', [targetIndex])
  const vocabPreview = useMemo(() => vocab.join(' '), [vocab])

  const expansion = useMemo(() => {
    const terms: ExpansionTerm[] = vocab.map((char, i) => ({
      char,
      coeff: (i === targetIndex ? 1 : 0) as 0 | 1,
    }))
    const left = terms.map((t) => `${t.coeff}·W[${t.char}]`).join(' + ')
    return { left }
  }, [targetIndex])

  return (
    <VizCard
      title="Row Selection (You Can See It)"
      subtitle="One-hot selects a row"
      figNum="Fig. 2.4"
      footer={
        <div className={styles.footerHint}>
          <span className={styles.footerLabel}>Vocabulary order:</span>{' '}
          <span className={styles.footerVocab} aria-label="Vocabulary order used by this demo">
            [{vocabPreview}]
          </span>
          <span className={styles.footerNote}>
            {' '}
            — the <span className={styles.mono}>1</span> goes at the selected token’s index in this order.
          </span>
        </div>
      }
    >
      <div className={`${styles.stageWrap} ${pulse ? styles.pulse : ''}`}>
        <div className={styles.toolbar} aria-label="Select token">
          <div className={styles.toolbarLabel}>Select token</div>
          <div className={styles.controls}>
            {vocab.map((char, i) => (
              <button
                key={char}
                type="button"
                className={`${styles.btn} ${i === targetIndex ? styles.btnSelected : ''}`}
                onClick={() => setTargetIndex(i)}
              >
                {char}
              </button>
            ))}
          </div>
        </div>

        <div className={`panel-dark ${styles.stage}`}>
          <div className={styles.layout}>
            <div className={styles.vectorWrap}>
              <div className={styles.caption}>x (one-hot)</div>
              <div className={`inset-box ${styles.vectorFrame}`}>
                {vocab.map((char, i) => (
                  <div
                    key={char}
                    className={`${styles.vectorCell} ${i === targetIndex ? styles.vectorCellActive : ''}`}
                  >
                    {i === targetIndex ? 1 : 0}
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.times} aria-hidden="true">
              ×
            </div>

            <div className={styles.matrixWrap}>
              <div className={styles.caption}>W (embedding table)</div>
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
                            <td key={`${i}-${j}`} className={`${styles.cell} ${isActive ? styles.cellActive : ''}`}>
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
          </div>
        </div>

        <div className={`inset-box ${styles.mathCard}`}>
          <div className={styles.mathTop}>
            <div className={styles.mathTitle}>Row selection as math</div>
            <details className="collapsible">
              <summary>Show expansion</summary>
              <div className={styles.expansion}>
                <div className={styles.expansionLine}>
                  <span className={styles.mono}>xᵀW</span>
                  <span className={styles.equationEquals}>=</span>
                  <span className={styles.expansionText}>{expansion.left}</span>
                </div>
                <div className={styles.expansionNote}>
                  Only one coefficient is <span className={styles.mono}>1</span>, so only one row survives.
                </div>
              </div>
            </details>
          </div>

          <div className={styles.equationLine}>
            <span className={styles.mono}>xᵀW</span>
            <span className={styles.equationEquals}>=</span>
            <span className={styles.resultMono}>W[{activeChar}]</span>
          </div>
        </div>

        <div className={`inset-box ${styles.resultCard}`}>
          <div className={styles.resultLabel}>Result</div>
          <div className={styles.resultValue}>
            <span className={styles.resultMono}>W[{activeChar}]</span>
            <span className={styles.resultArrow} aria-hidden="true">
              →
            </span>
            <span className={styles.resultVector}>[{result}]</span>
          </div>
        </div>
      </div>
    </VizCard>
  )
}
