import styles from './TrainingTimeViz.module.css'
import { VizCard } from './VizCard'

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
    <VizCard title={title} subtitle={subtitle} footer={<span>Same work. Different strategy.</span>}>
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
    </VizCard>
  )
}
