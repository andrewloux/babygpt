import { useState } from 'react';
import styles from './SoftmaxWidget.module.css';

export function SoftmaxWidget() {
  const [logits, setLogits] = useState([2.0, 1.0, 0.1, -1.0, -0.5]);
  const labels = ['h', 'e', 'l', 'o', '␣'];

  // 1. Exponentiate
  const exps = logits.map(l => Math.exp(l));
  
  // 2. Sum
  const sumExps = exps.reduce((a, b) => a + b, 0);
  
  // 3. Normalize (Probs)
  const probs = exps.map(e => e / sumExps);

  const updateLogit = (idx: number, val: string) => {
    const newLogits = [...logits];
    newLogits[idx] = parseFloat(val);
    setLogits(newLogits);
  };

  return (
    <div className={styles.container}>
      {labels.map((label, i) => (
        <div key={label} className={styles.row}>
          <div className={styles.logitLabel}>{label}</div>
          
          <div className={styles.sliderContainer}>
            <input 
              type="range" 
              min="-5" 
              max="5" 
              step="0.1"
              value={logits[i]}
              className={styles.slider}
              onChange={(e) => updateLogit(i, e.target.value)}
            />
            <span className={styles.logitValue}>Logit: {logits[i].toFixed(1)}</span>
          </div>

          <div className={styles.probBarContainer}>
            <div 
              className={styles.probBar} 
              style={{ width: `${probs[i] * 100}%` }} 
            />
            <span className={styles.probValue}>{(probs[i] * 100).toFixed(1)}%</span>
          </div>
        </div>
      ))}
      
      <div className={styles.math}>
        Formula: e^{`{logit}`} / Σ(e^{`{all_logits}`})
      </div>
    </div>
  );
}
