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
        <div className={styles.layout}>
          <div className={styles.top}>
            <div className={styles.sliderHeader}>
              <span className={styles.sliderLabel}>Context length (T)</span>
              <span className={styles.sliderValue}>T = {T}</span>
            </div>
            <div className={styles.sliderRow}>
              <Slider
                wrap={false}
                min={1}
                max={8}
                step={1}
                value={T}
                onValueChange={(v) => setT(Math.round(v))}
                ariaLabel="Context length (T)"
              />
              <div className={styles.delta} aria-label="How changing T affects each approach">
                <div className={styles.deltaItem}>
                  <span className={styles.deltaLabel}>Lookup</span>
                  <span className={styles.deltaValueBad}>×{multiplier}</span>
                  <span className={styles.deltaNote}>per +1 T</span>
                </div>
                <div className={styles.deltaItem}>
                  <span className={styles.deltaLabel}>Embedding</span>
                  <span className={styles.deltaValueGood}>unchanged</span>
                  <span className={styles.deltaNote}>per +1 T</span>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.panels}>
            <div className={`${styles.panel} ${styles.panelBad}`}>
              <div className={styles.panelKicker}>Lookup table</div>
              <div className={styles.formula}>
                {vocabSize}<sup>{T}</sup> × {vocabSize}
              </div>
              <div className={`${styles.number} ${styles.numberBad}`}>{formatNumber(lookupTableEntries)}</div>
              <div className={styles.panelSub}>numbers to store</div>
              <div className={styles.miniBar} aria-hidden="true">
                <div
                  className={`${styles.miniFill} ${styles.miniFillBad}`}
                  style={{ width: `${Math.min(100, (Math.log10(lookupTableEntries) / 15) * 100)}%` }}
                />
              </div>
            </div>

            <div className={`${styles.panel} ${styles.panelGood}`}>
              <div className={styles.panelKicker}>Embedding table</div>
              <div className={styles.formula}>
                {vocabSize} × {D}
              </div>
              <div className={`${styles.number} ${styles.numberGood}`}>{formatNumber(embeddingNums)}</div>
              <div className={styles.panelSub}>numbers to store</div>
              <div className={styles.miniBar} aria-hidden="true">
                <div
                  className={`${styles.miniFill} ${styles.miniFillGood}`}
                  style={{ width: `${(Math.log10(embeddingNums) / 15) * 100}%` }}
                />
              </div>
            </div>
          </div>

          <div className={styles.overlap} aria-label="Why overlap matters">
            <div className={styles.overlapTitle}>Overlap (sharing)</div>
            <div className={styles.overlapGrid}>
              <div className={styles.overlapCol}>
                <div className={styles.overlapLabelBad}>Lookup:</div>
                <div className={styles.overlapText}>each length‑T context is its own key → no sharing</div>
              </div>
              <div className={styles.overlapCol}>
                <div className={styles.overlapLabelGood}>Embeddings:</div>
                <div className={styles.overlapText}>the same token row is reused across many contexts → evidence overlaps</div>
              </div>
            </div>
          </div>

          <details className={`collapsible ${styles.whatIsT}`}>
            <summary>What is T?</summary>
            <div className={styles.whatIsTBody}>
              <strong>T is the context length.</strong> A lookup table needs a row for every possible length‑T context — that’s
              VocabularySize<sup>T</sup> rows. An embedding table stays one row per token, so T never shows up.
            </div>
          </details>
        </div>
      </VizCard>
    </div>
  )
}
