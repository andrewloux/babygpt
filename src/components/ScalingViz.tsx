import styles from './ScalingViz.module.css'

interface ScalingBar {
  tokens: string
  size: string
  widthPercent: number
}

interface ScalingMethodProps {
  title: string
  bars: ScalingBar[]
  variant: 'counts' | 'neural'
}

function ScalingMethod({ title, bars, variant }: ScalingMethodProps) {
  return (
    <div className={styles.method}>
      <div className={styles.title}>{title}</div>
      <div className={styles.bars}>
        {bars.map((bar, index) => (
          <div key={index} className={styles.barRow}>
            <span>{bar.tokens}</span>
            <div
              className={`${styles.bar} ${styles[variant]}`}
              style={{ width: `${bar.widthPercent}%` }}
            />
            <span>{bar.size}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

interface ScalingVizProps {
  countBased?: ScalingBar[]
  neural?: ScalingBar[]
}

const defaultCountBased: ScalingBar[] = [
  { tokens: '1M tokens', size: '50MB', widthPercent: 20 },
  { tokens: '10M tokens', size: '400MB', widthPercent: 45 },
  { tokens: '100M tokens', size: '3GB', widthPercent: 80 },
  { tokens: '1B tokens', size: '25GB+', widthPercent: 100 },
]

const defaultNeural: ScalingBar[] = [
  { tokens: '1M tokens', size: '10MB', widthPercent: 30 },
  { tokens: '10M tokens', size: '10MB', widthPercent: 30 },
  { tokens: '100M tokens', size: '10MB', widthPercent: 30 },
  { tokens: '1B tokens', size: '10MB', widthPercent: 30 },
]

export function ScalingViz({
  countBased = defaultCountBased,
  neural = defaultNeural,
}: ScalingVizProps) {
  return (
    <div className={styles.container}>
      <div className={styles.comparison}>
        <ScalingMethod title="Count-Based" bars={countBased} variant="counts" />
        <ScalingMethod title="Neural (fixed size)" bars={neural} variant="neural" />
      </div>
    </div>
  )
}
