import { ReactNode } from 'react'
import styles from './Callout.module.css'

type CalloutVariant = 'info' | 'warning' | 'insight'

interface CalloutProps {
  variant?: CalloutVariant
  title: string
  children: ReactNode
}

export function Callout({ variant = 'info', title, children }: CalloutProps) {
  return (
    <div className={`${styles.callout} ${styles[variant]}`}>
      <div className={styles.title}>{title}</div>
      <div className={styles.content}>{children}</div>
    </div>
  )
}
