import { useState, type ReactNode } from 'react'
import { VizCard } from './VizCard'
import { Slider } from './Slider'
import styles from './ContextExplosionViz.module.css'

const vocabSize = 27 // Fixed vocab size for clarity (a–z + space)
const D = 64 // Example embedding dimension

function formatNumber(n: number): ReactNode {
  if (n >= 1e15) return <>≈ 10<sup>{Math.log10(n).toFixed(0)}</sup></>
  if (n >= 1e12) return `${(n / 1e12).toFixed(1)}T`
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return n.toLocaleString()
  return n.toString()
}

export function ContextExplosionViz() {
  const [T, setT] = useState(4)

  const contexts = Math.pow(vocabSize, T)
  const lookupTableEntries = contexts * vocabSize // one distribution (size vocabSize) per context
  const embeddingNums = vocabSize * D // one vector (size D) per token
  const multiplier = vocabSize

  return (
    <div className={styles.noSelect}>
      <VizCard title="The Context Explosion" subtitle="Same wall, different count" figNum="Fig. 2.2">
        <div className={styles.sliderSection}>
          <div className={styles.sliderHeader}>
            <span className={styles.sliderLabel}>Context length (T)</span>
            <span className={styles.sliderValue}>T = {T}</span>
          </div>
          <Slider
            wrap={false}
            min={1}
            max={8}
            step={1}
            value={T}
            onValueChange={(v) => setT(Math.round(v))}
            ariaLabel="Context length (T)"
          />
          <div className={styles.sliderHint}>T = how many tokens the model gets to see. Slide to add more.</div>
        </div>

        {/* The comparison - this is the MAIN EVENT */}
        <div className={styles.comparison}>
          <div className={`${styles.side} ${styles.sideBad}`}>
            <div className={styles.sideLabel}>Lookup table entries</div>
            <div className={styles.formula}>
              VocabularySize<sup>T</sup> × VocabularySize = {vocabSize}<sup>{T}</sup> × {vocabSize}
            </div>
            <div className={`${styles.number} ${styles.numberBad}`}>
              {formatNumber(lookupTableEntries)}
            </div>
            <div className={styles.growth}>
              +1 to T → <span className={styles.multiplier}>×{multiplier}</span>
            </div>
          </div>

          <div className={styles.vs}>vs</div>

          <div className={`${styles.side} ${styles.sideGood}`}>
            <div className={styles.sideLabel}>Embedding numbers</div>
            <div className={styles.formula}>
              VocabularySize × D = {vocabSize} × {D}
            </div>
            <div className={`${styles.number} ${styles.numberGood}`}>
              {formatNumber(embeddingNums)}
            </div>
            <div className={styles.growth}>
              +1 to T → <span className={styles.unchanged}>unchanged</span>
            </div>
          </div>
        </div>

        <details className={`collapsible ${styles.whatIsT}`}>
          <summary>What is T?</summary>
          <div className={styles.whatIsTBody}>
            <strong>T is the context length.</strong> A lookup table needs a row for every possible length‑T context — that’s{' '}
            VocabularySize<sup>T</sup> rows. An embedding table stays one row per token, so T never shows up.
          </div>
        </details>

        {/* Visual scale comparison */}
        <div className={styles.scale}>
          <div className={styles.scaleTitle}>Numbers stored (roughly)</div>
          <div className={styles.scaleRow}>
            <span className={styles.scaleLabel}>Lookup table</span>
            <div className={styles.scaleBar}>
              <div
                className={`${styles.scaleFill} ${styles.scaleFillBad}`}
                style={{ width: `${Math.min(100, (Math.log10(lookupTableEntries) / 15) * 100)}%` }}
              />
            </div>
            <span className={styles.scaleValue}>{formatNumber(lookupTableEntries)} probs</span>
          </div>
          <div className={styles.scaleRow}>
            <span className={styles.scaleLabel}>Embedding</span>
            <div className={styles.scaleBar}>
              <div
                className={`${styles.scaleFill} ${styles.scaleFillGood}`}
                style={{ width: `${(Math.log10(embeddingNums) / 15) * 100}%` }}
              />
            </div>
            <span className={styles.scaleValue}>{formatNumber(embeddingNums)} nums</span>
          </div>
        </div>
      </VizCard>
    </div>
  )
}
