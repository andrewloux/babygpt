import { ReactNode } from 'react'
import styles from './Citations.module.css'

type CiteProps = {
  n: string | number
}

export function Cite({ n }: CiteProps) {
  return (
    <sup className={styles.cite}>
      <a href={`#cite-${n}`}>[{n}]</a>
    </sup>
  )
}

export type CitationItem = {
  n: string | number
  href: string
  label: ReactNode
}

type CitationsProps = {
  items: CitationItem[]
  title?: string
}

export function Citations({ items, title = 'Sources' }: CitationsProps) {
  return (
    <div className={styles.container}>
      <div className={styles.title}>{title}</div>
      <ol className={styles.list}>
        {items.map(item => (
          <li key={item.n} id={`cite-${item.n}`}>
            <a href={item.href} target="_blank" rel="noreferrer">
              {item.label}
            </a>
          </li>
        ))}
      </ol>
    </div>
  )
}

