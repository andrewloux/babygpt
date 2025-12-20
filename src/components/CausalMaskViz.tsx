import React, { useState } from 'react'
import styles from './CausalMaskViz.module.css'

export const CausalMaskViz: React.FC = () => {
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null)
  const size = 5

  const getCellStatus = (row: number, col: number) => {
    // Row = Position looking (Viewer)
    // Col = Position being looked at (Target)
    // Rule: Viewer can only see targets at indices <= viewer's index
    return col <= row ? 'visible' : 'hidden'
  }

  return (
    <div className={styles.container}>
      <div className={styles.grid}>
        {/* Header Row */}
        <div className={styles.cornerCell}></div>
        {Array.from({ length: size }).map((_, col) => (
          <div key={`header-${col}`} className={styles.headerCell}>
            T{col + 1}
          </div>
        ))}

        {/* Grid Rows */}
        {Array.from({ length: size }).map((_, row) => (
          <React.Fragment key={`row-${row}`}>
            {/* Row Label */}
            <div className={styles.rowLabel}>T{row + 1}</div>
            
            {/* Cells */}
            {Array.from({ length: size }).map((_, col) => {
              const status = getCellStatus(row, col)
              const isHovered = hoveredCell?.row === row && hoveredCell?.col === col
              
              return (
                <div
                  key={`${row}-${col}`}
                  className={`${styles.cell} ${styles[status]} ${isHovered ? styles.hovered : ''}`}
                  onMouseEnter={() => setHoveredCell({ row, col })}
                  onMouseLeave={() => setHoveredCell(null)}
                >
                  {status === 'visible' ? '1' : '0'}
                </div>
              )
            })}
          </React.Fragment>
        ))}
      </div>

      <div className={styles.caption}>
        {hoveredCell ? (
          <div className={styles.explanation}>
            <strong>Position {hoveredCell.row + 1}</strong> looking at <strong>Position {hoveredCell.col + 1}</strong>:
            <span className={getCellStatus(hoveredCell.row, hoveredCell.col) === 'visible' ? styles.visibleText : styles.hiddenText}>
              {getCellStatus(hoveredCell.row, hoveredCell.col) === 'visible' 
                ? ' ALLOWED (Past/Present)' 
                : ' BLOCKED (Future)'}
            </span>
          </div>
        ) : (
          <div className={styles.placeholder}>Hover over the grid to check visibility</div>
        )}
      </div>
    </div>
  )
}
