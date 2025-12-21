import { useMemo, useState } from 'react'

import { Slider } from './Slider'
import { VizCard } from './VizCard'
import styles from './GeneralizationGapViz.module.css'

type TokenCount = {
  token: string
  count: number
}

const toyCounts: TokenCount[] = [
  { token: 'cat', count: 2 },
  { token: 'bird', count: 1 },
  { token: 'dog', count: 0 },
  { token: 'fish', count: 0 },
]

function probsFromCounts(items: TokenCount[]) {
  const total = items.reduce((sum, item) => sum + item.count, 0)
  return items.map((item) => ({
    token: item.token,
    prob: total === 0 ? 0 : item.count / total,
  }))
}

function addAlphaSmoothing(items: TokenCount[], alpha: number) {
  const total = items.reduce((sum, item) => sum + item.count, 0)
  const V = items.length
  const denom = total + alpha * V
  return items.map((item) => ({
    token: item.token,
    prob: denom === 0 ? 0 : (item.count + alpha) / denom,
  }))
}

type BarRow = {
  token: string
  prob: number
  highlight?: boolean
}

function Bars({ rows }: { rows: BarRow[] }) {
  return (
    <div className={styles.bars} role="list">
      {rows.map((row) => (
        <div key={row.token} className={styles.barRow} role="listitem">
          <span className={styles.token}>{row.token}</span>
          <div className={styles.track} aria-hidden="true">
            <div
              className={`${styles.fill}${row.highlight ? ` ${styles.fillHighlight}` : ''}`}
              style={{ width: `${Math.max(0, Math.min(1, row.prob)) * 100}%` }}
            />
          </div>
          <span className={styles.value}>{row.prob.toFixed(2)}</span>
        </div>
      ))}
    </div>
  )
}

export function GeneralizationGapViz() {
  const [alpha, setAlpha] = useState(0.5)

  const exact = useMemo(() => probsFromCounts(toyCounts), [])
  const smoothed = useMemo(() => addAlphaSmoothing(toyCounts, alpha), [alpha])

  const exactRows: BarRow[] = exact.map((r) => ({
    ...r,
    highlight: r.token === 'dog',
  }))

  const smoothRows: BarRow[] = smoothed.map((r) => ({
    ...r,
    highlight: r.token === 'dog',
  }))

  return (
    <VizCard
      title="The Generalization Gap"
      subtitle="When exact counts say P = 0"
      footer={
        <div className={styles.footer}>
          A counting model can only talk about what it has seen. Smoothing is a crude way to give unseen-but-plausible
          options a non-zero floor. It still isn’t “meaning,” but it shows why <span className={styles.footerMono}>P = 0</span>{' '}
          is such a deal-breaker.
        </div>
      }
    >
      <div className={styles.context}>
        <div className={styles.contextLabel}>Context</div>
        <div className={styles.contextValue}>
          <span className={styles.contextMono}>&quot;the&nbsp;__&quot;</span>
          <span className={styles.contextHint}>(what word tends to come next?)</span>
        </div>
      </div>

      <div className={styles.columns}>
        <div className={styles.column}>
          <div className={styles.columnTitle}>Exact counts</div>
          <div className={styles.columnSubtitle}>brittle lookup behavior</div>
          <Bars rows={exactRows} />
        </div>

        <div className={styles.column}>
          <div className={styles.columnTitle}>With smoothing</div>
          <div className={styles.columnSubtitle}>
            add-α (α = {alpha.toFixed(2)})
          </div>
          <Bars rows={smoothRows} />

          <div className={styles.slider}>
            <Slider
              min={0}
              max={1}
              step={0.05}
              value={alpha}
              onValueChange={setAlpha}
              ariaLabel="Smoothing strength alpha"
              label="Smoothing strength"
              valueLabel={`α = ${alpha.toFixed(2)}`}
              hint="Slide α to watch unseen options stop being impossible."
            />
          </div>
        </div>
      </div>
    </VizCard>
  )
}

