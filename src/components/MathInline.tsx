import katex from 'katex'
import 'katex/dist/katex.min.css'
import styles from './MathInline.module.css'

interface MathInlineProps {
  equation: string
  ariaLabel?: string
  className?: string
}

export function MathInline({ equation, ariaLabel, className }: MathInlineProps) {
  const html = katex.renderToString(equation, {
    throwOnError: false,
    displayMode: false,
  })

  return (
    <span
      className={[styles.mathInline, className].filter(Boolean).join(' ')}
      aria-label={ariaLabel}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

