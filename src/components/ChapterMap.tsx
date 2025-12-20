import { ReactNode } from 'react'

import styles from './ChapterMap.module.css'

function sectionId(number: string) {
  const cleaned = number
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^0-9a-z.-]/g, '')
  return `section-${cleaned.replace(/\./g, '-')}`
}

type ChapterMapStep = {
  to?: string
  title: ReactNode
  description?: ReactNode
}

interface ChapterMapProps {
  title: string
  steps: ChapterMapStep[]
}

export function ChapterMap({ title, steps }: ChapterMapProps) {
  return (
    <div className={styles.map}>
      <div className={styles.header}>
        <div className={styles.title}>{title}</div>
        <div className={styles.legend} aria-hidden="true">
          <span className={styles.legendDot} />
          <span className={styles.legendText}>waypoints</span>
        </div>
      </div>

      <ol className={styles.route}>
        {steps.map((step, i) => {
          const isLast = i === steps.length - 1
          return (
            <li key={i} className={styles.step}>
              <div className={styles.rail} aria-hidden="true">
                <div className={styles.marker}>
                  <span className={styles.markerNumber}>{i + 1}</span>
                </div>
                {!isLast && <div className={styles.connector} />}
              </div>

              <div className={styles.stepBody}>
                {step.to ? (
                  <a className={styles.stepLink} href={`#${sectionId(step.to)}`}>
                    {step.title}
                  </a>
                ) : (
                  <div className={styles.stepTitle}>{step.title}</div>
                )}
                {step.description && (
                  <div className={styles.stepDescription}>{step.description}</div>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
