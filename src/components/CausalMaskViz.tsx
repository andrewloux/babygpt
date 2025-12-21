import { useMemo, useState } from 'react'

import { VizCard } from './VizCard'
import styles from './CausalMaskViz.module.css'

export function CausalMaskViz() {
  const size = 5
  const [selectedRow, setSelectedRow] = useState<number>(Math.min(3, size - 1))
  const [hoveredRow, setHoveredRow] = useState<number | null>(null)

  const activeRow = hoveredRow ?? selectedRow

  const canAttend = (row: number, col: number) => col <= row

  const readout = useMemo(() => {
    const token = `T${activeRow + 1}`
    const canSee = `T1–T${activeRow + 1}`
    const cantSee =
      activeRow + 1 < size ? `T${activeRow + 2}–T${size}` : null

    return { token, canSee, cantSee }
  }, [activeRow, size])

  return (
    <VizCard
      title="The Causal Mask"
      subtitle="No peeking to the right"
      footer={
        <div className={styles.footer} aria-live="polite">
          <div className={styles.footerTitle}>
            <span className={styles.footerToken}>{readout.token}</span>{' '}
            can attend to <span className={styles.footerGood}>{readout.canSee}</span>
          </div>
          {readout.cantSee ? (
            <div className={styles.footerLine}>
              and cannot attend to <span className={styles.footerBad}>{readout.cantSee}</span>.
            </div>
          ) : (
            <div className={styles.footerLine}>and it can see everything so far.</div>
          )}
        </div>
      }
    >
      <div className={styles.layout}>
        <div className={styles.legend}>
          <div className={styles.legendRow}>
            <span className={`${styles.swatch} ${styles.swatchAllowed}`} aria-hidden="true" />
            <span>allowed</span>
          </div>
          <div className={styles.legendRow}>
            <span className={`${styles.swatch} ${styles.swatchBlocked}`} aria-hidden="true" />
            <span>blocked (future)</span>
          </div>
          <div className={styles.legendHint}>Rows are the token doing the looking. Columns are what it can look at.</div>
        </div>

        <div className={styles.controls}>
          <div className={styles.controlsLabel}>Select a row token:</div>
          <div className={styles.pills}>
            {Array.from({ length: size }).map((_, row) => (
              <button
                key={`pick-${row}`}
                type="button"
                className={`${styles.pill} ${row === selectedRow ? styles.pillActive : ''}`}
                onClick={() => setSelectedRow(row)}
                onMouseEnter={() => setHoveredRow(row)}
                onMouseLeave={() => setHoveredRow(null)}
                aria-pressed={row === selectedRow}
                aria-label={`Select row token T${row + 1}`}
              >
                T{row + 1}
              </button>
            ))}
          </div>
        </div>

        <div className={`panel-dark ${styles.gridWrap}`}>
          <div className={styles.timeArrow} aria-hidden="true">
            <span>past</span>
            <span className={styles.arrowLine} />
            <span>future</span>
          </div>

          <div className={styles.matrix} role="grid" aria-label="Causal attention mask grid">
            <div className={styles.headerRow} role="row">
              <div className={styles.cornerCell} aria-hidden="true">
                row\col
              </div>
              {Array.from({ length: size }).map((_, col) => (
                <div
                  key={`header-${col}`}
                  className={`${styles.headerCell} ${col <= activeRow ? styles.headerHot : ''}`}
                >
                  T{col + 1}
                </div>
              ))}
            </div>

            {Array.from({ length: size }).map((_, row) => (
              <div key={`row-${row}`} className={styles.row} role="row">
                <button
                  type="button"
                  className={`${styles.rowLabel} ${row === activeRow ? styles.rowLabelActive : ''}`}
                  onClick={() => setSelectedRow(row)}
                  onMouseEnter={() => setHoveredRow(row)}
                  onMouseLeave={() => setHoveredRow(null)}
                  aria-pressed={row === selectedRow}
                  aria-label={`Row token T${row + 1}`}
                >
                  T{row + 1}
                </button>

                {Array.from({ length: size }).map((_, col) => {
                  const allowed = canAttend(row, col)
                  const isFocusRow = row === activeRow
                  const isFocusCell = isFocusRow && allowed
                  const isBlockedCell = isFocusRow && !allowed

                  return (
                    <div
                      key={`cell-${row}-${col}`}
                      className={[
                        styles.cell,
                        allowed ? styles.allowed : styles.blocked,
                        isFocusCell ? styles.cellFocus : '',
                        isBlockedCell ? styles.cellBlocked : '',
                        !isFocusRow ? styles.cellDim : '',
                      ].join(' ')}
                      aria-hidden="true"
                    >
                      {allowed ? '1' : '0'}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </VizCard>
  )
}
