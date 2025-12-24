import { ReactNode } from 'react'
import styles from './VizCard.module.css'

interface VizCardProps {
  title: string
  figNum?: string
  subtitle?: string
  footer?: ReactNode
  children: ReactNode
}

export function VizCard({ title, figNum, subtitle, footer, children }: VizCardProps) {
  return (
    <div className={styles.container}>
      <div className={`card-glass ${styles.card}`}>
        <div className={`ambient-glow ${styles.ambientGlow}`} />

        <div className={styles.header}>
          <div className={styles.headerText}>
            <h3 className={styles.title}>{title}</h3>
            {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
          </div>

          {figNum ? <span className={styles.figNum}>{figNum}</span> : null}
        </div>

        <div className={styles.content}>{children}</div>

        {footer ? <div className={styles.footer}>{footer}</div> : null}
      </div>
    </div>
  )
}
