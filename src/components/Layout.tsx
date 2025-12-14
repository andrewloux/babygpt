import { ReactNode } from 'react'
import styles from './Layout.module.css'

interface ContainerProps {
  children: ReactNode
}

export function Container({ children }: ContainerProps) {
  return <div className={styles.container}>{children}</div>
}

interface ChapterHeaderProps {
  number: string
  title: string
  subtitle: string
}

export function ChapterHeader({ number, title, subtitle }: ChapterHeaderProps) {
  return (
    <header className={styles.chapterHeader}>
      <div className={styles.chapterNumber}>Chapter {number}</div>
      <h1 className={styles.chapterTitle}>{title}</h1>
      <p className={styles.chapterSubtitle}>{subtitle}</p>
    </header>
  )
}

interface SectionProps {
  number: string
  title: string
  children: ReactNode
}

export function Section({ number, title, children }: SectionProps) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <span className={styles.sectionNumber}>{number}</span>
        <h2 className={styles.sectionTitle}>{title}</h2>
      </div>
      {children}
    </section>
  )
}
