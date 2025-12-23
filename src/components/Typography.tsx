import { ReactNode } from 'react'
import styles from './Typography.module.css'

interface TextProps {
  children: ReactNode
}

export function Highlight({ children }: TextProps) {
  return <span className={styles.highlight}>{children}</span>
}

export function Term({ children }: TextProps) {
  return <code className={styles.term}>{children}</code>
}

export function Paragraph({ children }: TextProps) {
  return <p className={styles.paragraph}>{children}</p>
}
