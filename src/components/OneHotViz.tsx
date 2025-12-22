import { useState } from 'react';
import styles from './OneHotViz.module.css';

export function OneHotViz() {
  const vocab = ['a', 'b', 'c', 'd', 'e', 'h', 'l', 'o', 'r', 'w'];
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <div className={`panel-dark ${styles.container}`}>
      <span className={styles.label}>Select a character to see its One-Hot Vector:</span>
      <div className={styles.vocabGrid}>
        {vocab.map((char, idx) => (
          <button
            key={char}
            className={`${styles.tokenBtn} ${selected === idx ? styles.active : ''} focus-glow`}
            onClick={() => setSelected(idx)}
          >
            {char}
          </button>
        ))}
      </div>

      <div className={styles.vectorDisplay}>
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
  );
}
