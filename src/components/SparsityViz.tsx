import styles from './SparsityViz.module.css'

interface SparsityRow {
  context: string
  count: string
  widthPercent: number
}

interface SparsityVizProps {
  rows: SparsityRow[]
}

export function SparsityViz({ rows }: SparsityVizProps) {
  return (
    <div className={styles.sparsityViz}>
      {rows.map((row, index) => (
        <div key={index} className={styles.row}>
          <span className={styles.context}>"{row.context}"</span>
          <div className={styles.barContainer}>
            <div
              className={styles.bar}
              style={{ width: `${row.widthPercent}%` }}
            />
          </div>
          <span className={styles.count}>{row.count}</span>
        </div>
      ))}
    </div>
  )
}

// Default data for the standard sparsity example.
// Counts measured on a book-length English corpus (Project Gutenberg: Pride and Prejudice).
// Bars are roughly log-scaled so the tiny counts are still visible.
export const defaultSparsityData: SparsityRow[] = [
  { context: 'the next morning', count: '9 times', widthPercent: 24 },
  { context: 'next morning', count: '14 times', widthPercent: 29 },
  { context: ' morning', count: '72 times', widthPercent: 46 },
  { context: 'rning', count: '113 times', widthPercent: 51 },
  { context: 'ing', count: '3,960 times', widthPercent: 90 },
  { context: 'g', count: '10,239 times', widthPercent: 100 },
]
