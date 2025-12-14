import styles from './MathBlock.module.css'

interface MathBlockProps {
  equation: string
  explanation: string
}

export function MathBlock({ equation, explanation }: MathBlockProps) {
  return (
    <div className={styles.mathBlock}>
      <div className={styles.equation}>{equation}</div>
      <div className={styles.explanation}>{explanation}</div>
    </div>
  )
}
