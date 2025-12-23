import { ReactNode } from 'react'
import styles from './DataRow.module.css'

type Tone = 'default' | 'cyan' | 'magenta' | 'yellow' | 'green' | 'red'
type Size = 'sm' | 'md'

interface DataRowProps {
  label: ReactNode
  value: ReactNode
  tone?: Tone
  size?: Size
  className?: string
}

export function DataRow({ label, value, tone = 'cyan', size = 'md', className }: DataRowProps) {
  return (
    <div className={[styles.row, styles[size], styles[tone], className].filter(Boolean).join(' ')}>
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>{value}</span>
    </div>
  )
}

