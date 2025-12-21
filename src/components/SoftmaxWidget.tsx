import katex from 'katex'
import 'katex/dist/katex.min.css'
import { useMemo, useState } from 'react'
import { Slider } from './Slider'
import styles from './SoftmaxWidget.module.css'

export function SoftmaxWidget() {
  const [logits, setLogits] = useState([2.0, 1.0, 0.1, -1.0, -0.5])
  const [temperature, setTemperature] = useState(1.0)
  const labels = ['h', 'e', 'l', 'o', '␣']
  const safeT = Math.max(0.1, temperature)

  // Stable softmax: subtract max so exp() stays well-behaved
  const maxLogit = Math.max(...logits)
  const shifted = useMemo(() => logits.map(l => (l - maxLogit) / safeT), [logits, maxLogit, safeT])

  // 1. Exponentiate
  const exps = useMemo(() => shifted.map(l => Math.exp(l)), [shifted])
  
  // 2. Sum
  const sumExps = useMemo(() => exps.reduce((a, b) => a + b, 0), [exps])
  
  // 3. Normalize (Probs)
  const probs = useMemo(() => exps.map(e => e / sumExps), [exps, sumExps])

  const formulaHtml = useMemo(() => {
    const equation = String.raw`\text{Softmax}_T(\ell_i) = \frac{e^{(\ell_i - m)/T}}{\sum_j e^{(\ell_j - m)/T}} \quad \text{where } m = \max_j \ell_j`
    return katex.renderToString(equation, { throwOnError: false, displayMode: true })
  }, [])

  const updateLogit = (idx: number, val: number) => {
    const newLogits = [...logits]
    newLogits[idx] = val
    setLogits(newLogits)
  }

  return (
    <div className={styles.container}>
      <div className={styles.tempRow}>
        <div className={styles.tempLabel}>Temperature</div>
        <div className={styles.tempSliderWrap}>
          <Slider
            wrap={false}
            min={0.1}
            max={5.0}
            step={0.1}
            value={temperature}
            onValueChange={setTemperature}
            ariaLabel="Temperature"
          />
          <span className={styles.tempValue}>{safeT.toFixed(1)}</span>
        </div>
        <div className={styles.tempHint}>
          {safeT < 1 ? 'sharper' : safeT > 1 ? 'flatter' : 'neutral'}
        </div>
      </div>

      {labels.map((label, i) => (
        <div key={label} className={styles.row}>
          <div className={styles.logitLabel}>{label}</div>
          
          <div className={styles.sliderContainer}>
            <div className={styles.sliderWrapper}>
              <Slider
                wrap={false}
                min={-5}
                max={5}
                step={0.1}
                value={logits[i]}
                onValueChange={(v) => updateLogit(i, v)}
                ariaLabel={`Logit for ${label}`}
              />
              <span className={styles.logitValue}>{logits[i].toFixed(1)}</span>
            </div>
          </div>

          <div className={styles.probBarContainer}>
            <div 
              className={styles.probBar} 
              style={{ width: `${probs[i] * 100}%` }} 
            />
            <span className={styles.probValue}>
              {(probs[i] * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      ))}
      
      <div className={styles.formulaBox}>
        <div className={styles.formulaLabel}>Softmax (stable + temperature)</div>
        <div
          className={styles.formula}
          dangerouslySetInnerHTML={{ __html: formulaHtml }}
        />
        <div className={styles.formulaHint}>Same probabilities, safer numerics.</div>
      </div>
    </div>
  )
}
