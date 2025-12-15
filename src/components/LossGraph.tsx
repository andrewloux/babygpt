import { useState } from 'react';
import styles from './LossGraph.module.css';

export function LossGraph() {
  const [prob, setProb] = useState(0.5);
  const loss = -Math.log(prob);

  return (
    <div className={styles.container}>
      <div className={styles.graphContainer}>
        <div className={styles.labelY}>Loss (NLL)</div>
        <div className={styles.goodZone} title="Low Loss"></div>
        <div className={styles.badZone} title="High Loss"></div>
        
        {/* The Curve (Approximated with CSS gradient or SVG if we were fancy, 
            but for a quick viz, just the dot movement is powerful enough 
            if the user understands the axes) */}
        <svg style={{width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, pointerEvents: 'none'}}>
            <path 
                d="M 1 0 Q 5 150 100 198" 
                fill="none" 
                stroke="var(--text-secondary)" 
                strokeWidth="2" 
                strokeDasharray="4"
                opacity="0.3"
            /> 
            {/* That path is a fake curve. Let's do real math points for the line. */}
             <polyline
                fill="none"
                stroke="var(--primary)"
                strokeWidth="2"
                points={Array.from({length: 100}, (_, i) => {
                    const x = (i + 1) / 100; // 0.01 to 1.0
                    const y = -Math.log(x);
                    // Map y (0 to ~4.6) to pixels (200 to 0)
                    const yPx = 200 - (y / 4.6 * 200); 
                    return `${x * 100}% ${yPx}px`;
                }).join(' ')}
             />
        </svg>

        <div 
            className={styles.point}
            style={{
                left: `${prob * 100}%`,
                bottom: `${(loss / 4.6) * 100}%` // 4.6 is approx -log(0.01)
            }}
        />
        
        <div className={styles.labelX}>Probability assigned to correct answer (Confidence)</div>
      </div>

      <div className={styles.sliderContainer}>
        <input
            type="range"
            min="0.01"
            max="1.0"
            step="0.01"
            value={prob}
            onChange={(e) => setProb(parseFloat(e.target.value))}
            className={styles.slider}
        />
      </div>
      
      <div className={styles.valueDisplay}>
        P(correct) = <strong>{prob.toFixed(2)}</strong> <br/>
        Loss = -log({prob.toFixed(2)}) = <strong>{loss.toFixed(4)}</strong>
      </div>
    </div>
  );
}
