import { useState } from 'react'
import { Slider } from './Slider'
import { VizCard } from './VizCard'
import styles from './DiscreteContinuousViz.module.css'

export function DiscreteContinuousViz() {
  const [discreteState, setDiscreteState] = useState(0) // 0: cat, 1: dog, 2: rabbit
  const [continuousValue, setContinuousValue] = useState(0.5) // 0.0 to 1.0

  const items = [
    { id: 0, label: 'Cat', emoji: '🐱' },
    { id: 1, label: 'Dog', emoji: '🐶' },
  ]

  // We only use 2 for the morph to make it clear.
  // Discrete side can have 3 just to show "separate-ness".
  const discreteItems = [...items, { id: 2, label: 'Rabbit', emoji: '🐰' }]

  return (
    <VizCard title="Discrete vs Continuous" subtitle="IDs jump. Vectors can move.">
      <div className={styles.inner}>
        <div className={`panel-dark ${styles.panel}`}>
          <div className={styles.title}>Integers (tokens)</div>

          <div className={`inset-box ${styles.stage}`}>
            <div key={discreteState} className={`${styles.emojiDisplay} ${styles.snapChange}`}>
              {discreteItems[discreteState].emoji}
            </div>
          </div>

          <div className={styles.discreteButtons}>
            {discreteItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`${styles.discBtn} ${discreteState === item.id ? styles.active : ''} hover-lift focus-glow`}
                onClick={() => setDiscreteState(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className={styles.caption}>
            Rigid labels. You jump from ID to ID.
            <br />
            <span className={styles.highlight}>No middle ground.</span>
          </div>
        </div>

        <div className={`panel-dark ${styles.panel}`}>
          <div className={styles.title}>Vectors (attributes)</div>

          <div className={`inset-box ${styles.stage}`}>
            <div className={styles.morphStage}>
              <div
                className={styles.morphEmoji}
                style={{
                  opacity: 1 - continuousValue,
                  transform: `translate(-50%, -50%) scale(${0.5 + (1 - continuousValue) * 0.5}) filter(blur(${continuousValue * 2}px))`,
                }}
              >
                🐱
              </div>
              <div
                className={styles.morphEmoji}
                style={{
                  opacity: continuousValue,
                  transform: `translate(-50%, -50%) scale(${0.5 + continuousValue * 0.5}) filter(blur(${(1 - continuousValue) * 2}px))`,
                }}
              >
                🐶
              </div>
            </div>
          </div>

          <div className={styles.sliderWrap}>
            <Slider
              wrap={false}
              min={0}
              max={1}
              step={0.01}
              value={continuousValue}
              onValueChange={setContinuousValue}
              ariaLabel="Blend amount"
            />
          </div>

          <div className={styles.caption}>
            Fluid attributes. You can blend.
            <br />
            <span className={styles.highlightSec}>"50% Cat, 50% Dog" is valid math.</span>
          </div>
        </div>
      </div>
    </VizCard>
  )
}
