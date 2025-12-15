import styles from './TrainingTimeViz.module.css'

interface Bar {
  label: string
  time: string
  detail: string
  percent: number
  color: 'slow' | 'medium' | 'fast'
}

interface TrainingTimeVizProps {
  title: string
  subtitle: string
  bars: Bar[]
}

export function TrainingTimeViz({ title, subtitle, bars }: TrainingTimeVizProps) {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.title}>{title}</div>
        <div className={styles.subtitle}>{subtitle}</div>
      </div>

      <div className={styles.bars}>
        {bars.map((bar, i) => (
          <div key={i} className={styles.barRow}>
            <div className={styles.barLabel}>{bar.label}</div>
            <div className={styles.barTrack}>
              <div
                className={`${styles.barFill} ${styles[bar.color]}`}
                style={{ width: `${Math.max(bar.percent, 2)}%` }}
              />
            </div>
            <div className={styles.barTime}>
              <span className={styles.timeValue}>{bar.time}</span>
              <span className={styles.timeDetail}>{bar.detail}</span>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.footer}>
        Same work. Different strategy.
      </div>
    </div>
  )
}
