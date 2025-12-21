import { ReactNode } from 'react'
import styles from './FormalRigor.module.css'

interface FormalRigorProps {
  title: string
  audienceNote?: string
  children: ReactNode
}

export function FormalRigor({ title, audienceNote, children }: FormalRigorProps) {
  return (
    <details className={styles.formalRigor}>
      <summary className={styles.summary}>
        <span className={styles.badge}>Formal</span>
        <span className={styles.title}>{title}</span>
        {audienceNote && <span className={styles.audienceNote}>{audienceNote}</span>}
      </summary>
      <div className={styles.body}>{children}</div>
    </details>
  )
}

interface SubSectionProps {
  title: string
  children: ReactNode
}

export function FormalSubSection({ title, children }: SubSectionProps) {
  return (
    <div className={styles.subSection}>
      <h4 className={styles.subSectionTitle}>{title}</h4>
      {children}
    </div>
  )
}
