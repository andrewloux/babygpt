import { useState } from 'react';
import styles from './MatrixRowSelectViz.module.css';

export function MatrixRowSelectViz() {
  const vocab = ['h', 'e', 'l', 'o', '␣'];
  const [selected, setSelected] = useState<number | null>(null);

  // 5x5 weight matrix with random-ish values
  const weights = [
    [0.3, -0.5, 0.8, -0.2, 0.1],  // h
    [0.6, 0.2, -0.4, 0.9, -0.1],  // e
    [-0.3, 0.7, 0.4, -0.6, 0.5],  // l
    [0.9, -0.2, 0.3, 0.1, -0.8],  // o
    [-0.1, 0.4, -0.7, 0.6, 0.2]   // ␣
  ];

  return (
    <div className={styles.container}>
      <div className={styles.section}>
        <span className={styles.label}>Select a character:</span>
        <div className={styles.vocabGrid}>
          {vocab.map((char, idx) => (
            <button
              key={char}
              className={`${styles.tokenBtn} ${selected === idx ? styles.active : ''}`}
              onClick={() => setSelected(idx)}
            >
              {char}
            </button>
          ))}
        </div>
      </div>

      {selected !== null && (
        <div className={styles.section}>
          <span className={styles.label}>One-hot vector (x):</span>
          <div className={styles.vectorDisplay}>
            <span>[ </span>
            {vocab.map((_, idx) => (
              <span
                key={idx}
                className={`${styles.vectorValue} ${selected === idx ? styles.hot : ''}`}
              >
                {selected === idx ? '1' : '0'}
                {idx < vocab.length - 1 ? ',' : ''}
              </span>
            ))}
            <span> ]</span>
          </div>
        </div>
      )}

      <div className={styles.section}>
        <span className={styles.label}>Weight matrix (W):</span>
        <div className={styles.matrixContainer}>
          <div className={styles.matrix}>
            {weights.map((row, rowIdx) => (
              <div
                key={rowIdx}
                className={`${styles.matrixRow} ${selected === rowIdx ? styles.selectedRow : ''}`}
              >
                <div className={styles.rowLabel}>{vocab[rowIdx]}</div>
                <div className={styles.rowCells}>
                  {row.map((val, colIdx) => (
                    <div
                      key={colIdx}
                      className={`${styles.cell} ${selected === rowIdx ? styles.highlighted : ''}`}
                      style={{
                        animationDelay: selected === rowIdx ? `${colIdx * 0.05}s` : '0s'
                      }}
                    >
                      {val.toFixed(1)}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {selected !== null && (
        <div className={styles.section}>
          <div className={styles.arrowContainer}>
            <span className={styles.arrow}>↓</span>
            <span className={styles.insight}>Row {selected} selected - no multiplication needed!</span>
          </div>
          <span className={styles.label}>Result (logits = x @ W):</span>
          <div className={styles.vectorDisplay}>
            <span>[ </span>
            {weights[selected].map((val, idx) => (
              <span
                key={idx}
                className={`${styles.vectorValue} ${styles.result}`}
                style={{
                  animationDelay: `${idx * 0.05}s`
                }}
              >
                {val.toFixed(1)}
                {idx < weights[selected].length - 1 ? ',' : ''}
              </span>
            ))}
            <span> ]</span>
          </div>
        </div>
      )}

      <div className={styles.explanation}>
        <strong>Key insight:</strong> One-hot encoding × weight matrix = row selection.
        When <code>x = [0,0,1,0,0]</code>, multiplying by W just picks out the 3rd row.
        No actual math - it's just indexing!
      </div>
    </div>
  );
}
