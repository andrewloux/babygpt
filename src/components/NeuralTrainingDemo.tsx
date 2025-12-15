import { useState } from 'react';
import styles from './NeuralTrainingDemo.module.css';

// Simple vocab: h, e, l, o
// Target pattern: h->e, e->l, l->l, l->o (hello bigrams)

export function NeuralTrainingDemo() {
  // Weights: 4x4 matrix (row=input, col=output)
  // Initially random-ish but low
  const [weights, setWeights] = useState([
    [0.1, -0.2, 0.1, 0.0],  // Input h
    [0.1, 0.1, -0.1, 0.0],  // Input e
    [-0.1, 0.2, 0.0, 0.1],  // Input l
    [0.0, 0.1, -0.1, 0.2]   // Input o
  ]);

  const [step, setStep] = useState(0);
  const [loss, setLoss] = useState(2.5); // Arbitrary start
  const [learningRate, setLearningRate] = useState(0.5);

  const vocab = ['h', 'e', 'l', 'o'];
  const targets = [1, 2, 2, 3]; // h->e(1), e->l(2), l->l(2), l->o(3)

  const trainStep = () => {
    // Simulate Gradient Descent
    // We want to increase W[input][target] and decrease others

    const newWeights = weights.map((row, inputIdx) => {
        const targetIdx = targets[inputIdx];
        return row.map((w, colIdx) => {
            if (colIdx === targetIdx) {
                return w + learningRate; // Boost correct path
            } else {
                return w - learningRate * 0.4; // Suppress wrong path
            }
        });
    });

    setWeights(newWeights);
    setStep(s => s + 1);

    // Fake loss calculation for visuals
    // Loss should drop as weights align
    const newLoss = Math.max(0.1, loss * 0.7);
    setLoss(newLoss);
  };

  const reset = () => {
      setWeights([
        [0.1, -0.2, 0.1, 0.0],
        [0.1, 0.1, -0.1, 0.0],
        [-0.1, 0.2, 0.0, 0.1],
        [0.0, 0.1, -0.1, 0.2]
      ]);
      setStep(0);
      setLoss(2.5);
  };

  // Helper for color intensity
  const getColor = (val: number) => {
      // Maps value -5 to 5 to a color scale
      // Red (neg) to Green (pos)
      if (val > 0) {
          const intensity = Math.min(255, val * 50);
          return `rgba(0, ${intensity + 50}, 0, 0.8)`;
      } else {
          const intensity = Math.min(255, Math.abs(val) * 50);
          return `rgba(${intensity + 50}, 0, 0, 0.8)`;
      }
  };

  return (
    <div className={styles.container}>
      <h4>The Brain (Weight Matrix)</h4>
      <div className={styles.grid}>
        <div className={`${styles.cell} ${styles.header}`}>In\Out</div>
        {vocab.map(v => <div key={v} className={`${styles.cell} ${styles.header}`}>{v}</div>)}

        {vocab.map((inputChar, r) => (
            <>
                <div key={`row-${r}`} className={`${styles.cell} ${styles.header}`}>{inputChar}</div>
                {weights[r].map((w, c) => (
                    <div
                        key={`${r}-${c}`}
                        className={`${styles.cell} ${styles.weight}`}
                        style={{ backgroundColor: getColor(w) }}
                        title={`Weight: ${w.toFixed(2)}`}
                    >
                        {w.toFixed(1)}
                    </div>
                ))}
            </>
        ))}
      </div>

      <div className={styles.sliderControl}>
        <label htmlFor="learning-rate" className={styles.sliderLabel}>
          Learning Rate: <strong>{learningRate.toFixed(1)}</strong>
        </label>
        <input
          id="learning-rate"
          type="range"
          min="0.1"
          max="2.0"
          step="0.1"
          value={learningRate}
          onChange={(e) => setLearningRate(parseFloat(e.target.value))}
          className={styles.slider}
        />
        <div className={styles.sliderHints}>
          <span className={styles.hint}>Too low: slow convergence</span>
          <span className={styles.hint}>Too high: may overshoot/diverge</span>
        </div>
      </div>

      <div className={styles.controls}>
        <button className={styles.btn} onClick={trainStep}>
            Step Gradient Descent
        </button>
        <button className={styles.btn} style={{background: '#666'}} onClick={reset}>
            Reset
        </button>
        <div className={styles.stats}>
            Step: {step} <br/>
            Loss: {loss.toFixed(4)}
        </div>
      </div>
      <p style={{fontSize: '0.8rem', color: '#888'}}>
        Goal: Learn pattern h→e, e→l, l→l, l→o. <br/>
        Green = High Score (High Probability). Red = Low Score.
      </p>
    </div>
  );
}
