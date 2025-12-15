import katex from 'katex'
import 'katex/dist/katex.min.css'
import styles from './MathBlock.module.css'

interface MathBlockProps {
  equation: string
  explanation?: string
}

export function MathBlock({ equation, explanation }: MathBlockProps) {
  const html = katex.renderToString(equation, {
    throwOnError: false,
    displayMode: true,
  })

  return (
    <div className={styles.mathBlock}>
      <div
        className={styles.equation}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {explanation && <div className={styles.explanation}>{explanation}</div>}
    </div>
  )
}
