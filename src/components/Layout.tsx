import { ReactNode } from 'react'
import styles from './Layout.module.css'

function sectionId(number: string) {
  const cleaned = number
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^0-9a-z.-]/g, '')
  return `section-${cleaned.replace(/\./g, '-')}`
}

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
  const id = sectionId(number)
  return (
    <section className={styles.section} id={id}>
      <div className={styles.sectionHeader}>
        <a className={styles.sectionNumber} href={`#${id}`} aria-label={`Link to section ${number}`}>
          {number}
        </a>
        <h2 className={styles.sectionTitle}>{title}</h2>
      </div>
      {children}
    </section>
  )
}

interface SectionLinkProps {
  to: string
  children?: ReactNode
}

export function SectionLink({ to, children }: SectionLinkProps) {
  const id = sectionId(to)
  return (
    <a className={styles.sectionLink} href={`#${id}`} aria-label={`Jump to section ${to}`}>
      {children ?? `Section ${to}`}
    </a>
  )
}
