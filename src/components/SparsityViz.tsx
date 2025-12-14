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

// Default data for the standard sparsity example
export const defaultSparsityData: SparsityRow[] = [
  { context: 'the cat sat on', count: '3 times', widthPercent: 0.5 },
  { context: 'the cat sat', count: '12 times', widthPercent: 2 },
  { context: 'cat sat', count: '47 times', widthPercent: 5 },
  { context: 'sat', count: '2,847 times', widthPercent: 25 },
  { context: 'at', count: '18,392 times', widthPercent: 60 },
  { context: 't', count: '91,247 times', widthPercent: 100 },
]
