import { useState } from 'react'
import { VizCard } from './VizCard'
import styles from './OneHotViz.module.css'

export function OneHotViz() {
  const vocab = ['a', 'b', 'c', 'd', 'e', 'h', 'l', 'o', 'r', 'w']
  const [selected, setSelected] = useState<number | null>(null)

  return (
    <VizCard title="One-Hot Encoding" subtitle="A selector vector: one 1 chooses one row">
      <div className={`panel-dark inset-box ${styles.container}`}>
        <span className={styles.label}>Select a token ID:</span>
        <div className={styles.vocabGrid} role="list" aria-label="Vocabulary">
          {vocab.map((char, idx) => (
            <button
              key={char}
              type="button"
              className={`${styles.tokenBtn} ${selected === idx ? styles.active : ''} hover-lift focus-glow`}
              onClick={() => setSelected(idx)}
            >
              {char}
            </button>
          ))}
        </div>

        <div className={styles.vectorDisplay} aria-label="One-hot vector">
          <span>[ </span>
          {vocab.map((_, idx) => (
            <span key={idx} className={`${styles.vectorValue} ${selected === idx ? styles.hot : ''}`}>
              {selected === idx ? '1' : '0'}
              {idx < vocab.length - 1 ? ',' : ''}
            </span>
          ))}
          <span> ]</span>
        </div>
      </div>
    </VizCard>
  )
}
