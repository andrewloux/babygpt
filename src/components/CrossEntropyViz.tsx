import { useMemo, useState } from 'react'
import styles from './CrossEntropyViz.module.css'
import { Slider } from './Slider'
import { Paragraph, Term } from './Typography'
import { VizCard } from './VizCard'

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

const LogCurve = ({ p, loss }: { p: number; loss: number }) => {
  const width = 520
  const height = 220
  const yMax = 10.5 // enough headroom for -log2(0.001) ≈ 9.97
  const xScale = (x: number) => x * (width - 20) + 10
  const yScale = (y: number) => height - (y / yMax) * (height - 20) - 10

  const pathData = useMemo(() => {
    const pMin = 0.001
    let d = `M ${xScale(pMin)} ${yScale(-Math.log2(pMin))}`
    for (let i = 2; i <= 100; i++) {
      const x = i / 100
      d += ` L ${xScale(x)} ${yScale(-Math.log2(x))}`
    }
    return d
  }, [])

  const pointX = xScale(p)
  const pointY = yScale(loss)
  const labelX = clamp(pointX, 34, width - 34)
  const labelY = clamp(pointY - 10, 22, height - 22)

  return (
    <div className={styles.curveContainer}>
      <svg viewBox={`0 0 ${width} ${height}`} className={styles.svg} role="img" aria-label="-log₂(p) curve">
        {/* Grid */}
        {[1, 2, 4, 8].map((y) => (
          <g key={`gy-${y}`}>
            <line x1="10" y1={yScale(y)} x2={width - 10} y2={yScale(y)} className={styles.gridLine} />
            <text x={12} y={yScale(y) - 4} className={styles.gridLabel}>
              {y}
            </text>
          </g>
        ))}
        {[0.25, 0.5, 0.75].map((x) => (
          <line
            key={`gx-${x}`}
            x1={xScale(x)}
            y1={10}
            x2={xScale(x)}
            y2={height - 10}
            className={styles.gridLine}
          />
        ))}

        {/* Axes */}
        <line x1="10" y1={height - 10} x2={width - 10} y2={height - 10} className={styles.axisLine} />
        <line x1="10" y1="10" x2="10" y2={height - 10} className={styles.axisLine} />
        <text x={width - 14} y={height - 14} className={styles.axisText} textAnchor="end">
          p
        </text>
        <text x={20} y={18} className={styles.axisText}>
          -log₂(p)
        </text>

        {/* Curve */}
        <path d={pathData} className={styles.curvePath} />

        {/* Point */}
        <circle cx={pointX} cy={pointY} r="5" className={styles.point} />

        {/* Lines to axes */}
        <line x1={pointX} y1={pointY} x2={pointX} y2={height - 10} className={styles.guideLine} />
        <line x1={10} y1={pointY} x2={pointX} y2={pointY} className={styles.guideLine} />

        {/* Axis Labels */}
        <text x={labelX} y={height - 14} className={styles.valueText} textAnchor="middle">
          {p.toFixed(3)}
        </text>
        <text x={12} y={labelY} className={styles.valueText} textAnchor="start">
          {loss.toFixed(2)}
        </text>
      </svg>
    </div>
  )
}

export function CrossEntropyViz() {
  const [prob, setProb] = useState(0.75)
  const loss = useMemo(() => -Math.log2(prob), [prob])
  const probLabel = prob < 0.01 ? prob.toFixed(3) : prob.toFixed(2)

  return (
    <VizCard
      title="Cross-Entropy: The Surprise Curve"
      subtitle="Why confident wrong hurts"
      footer={
        <Paragraph>
          Loss is <Term>−log₂(p_true)</Term>. The cliff is near <Term>p=0</Term>: giving the truth 1% probability costs ~6.6 bits.
        </Paragraph>
      }
    >
      <div className={styles.content}>
        <Paragraph>
          Drag the slider. Same formula, different intuition: you’re watching “probability of the truth” turn into “surprise.”
        </Paragraph>
        <div className={styles.interactiveArea}>
          <div className={styles.lossSection}>
            <div className={`${styles.calculation} inset-box`}>
              <Paragraph>
                Predicted probability of the truth: <Term>p = {probLabel}</Term>
              </Paragraph>
              <Paragraph>
                Loss = <Term>-log₂(p)</Term> = <strong>{loss.toFixed(3)} bits</strong>
              </Paragraph>
            </div>
            <div className={`${styles.sliderContainer} panel-dark inset-box`}>
              <label htmlFor="prob-slider">Adjust probability</label>
              <Slider
                id="prob-slider"
                wrap={false}
                min={0.001}
                max={0.999}
                step={0.001}
                value={prob}
                onValueChange={setProb}
                ariaLabel="Adjust probability"
              />
            </div>
            <LogCurve p={prob} loss={loss} />
          </div>
        </div>
      </div>
    </VizCard>
  )
}
