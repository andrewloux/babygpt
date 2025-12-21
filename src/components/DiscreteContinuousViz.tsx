import { useState } from 'react'
import { Slider } from './Slider'
import styles from './DiscreteContinuousViz.module.css'

export function DiscreteContinuousViz() {
    const [discreteState, setDiscreteState] = useState(0) // 0: cat, 1: dog, 2: rabbit
    const [continuousValue, setContinuousValue] = useState(0.5) // 0.0 to 1.0

    const items = [
        { id: 0, label: 'Cat', emoji: '🐱' },
        { id: 1, label: 'Dog', emoji: '🐶' },
    ]

    // We only use 2 for the morph to make it clear
    // Discrete side can have 3 just to show "separate-ness"
    const discreteItems = [
        ...items,
        { id: 2, label: 'Rabbit', emoji: '🐰' }
    ]

    return (
        <div className={styles.container}>
            {/* LEFT: DISCRETE (INTEGERS) */}
            <div className={styles.panel}>
                <div className={styles.title}>Integers (Tokens)</div>

                <div className={styles.stage}>
                    <div key={discreteState} className={`${styles.emojiDisplay} ${styles.snapChange}`}>
                        {discreteItems[discreteState].emoji}
                    </div>
                </div>

                <div className={styles.discreteButtons}>
                    {discreteItems.map((item) => (
                        <button
                            key={item.id}
                            className={`${styles.discBtn} ${discreteState === item.id ? styles.active : ''}`}
                            onClick={() => setDiscreteState(item.id)}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>

                <div className={styles.caption}>
                    Rigid Names. You jump from ID to ID.<br />
                    <span className={styles.highlight}>No middle ground.</span>
                </div>
            </div>

            {/* RIGHT: CONTINUOUS (VECTORS) */}
            <div className={styles.panel}>
                <div className={styles.title}>Vectors (Attributes)</div>

                <div className={styles.stage}>
                    <div className={styles.morphStage}>
                        {/* Emoji A */}
                        <div
                            className={styles.morphEmoji}
                            style={{
                                opacity: 1 - continuousValue,
                                transform: `translate(-50%, -50%) scale(${0.5 + (1 - continuousValue) * 0.5}) filter(blur(${(continuousValue) * 2}px))`
                            }}
                        >
                            🐱
                        </div>
                        {/* Emoji B */}
                        <div
                            className={styles.morphEmoji}
                            style={{
                                opacity: continuousValue,
                                transform: `translate(-50%, -50%) scale(${0.5 + continuousValue * 0.5}) filter(blur(${(1 - continuousValue) * 2}px))`
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
                    Fluid Attributes. You can blend.<br />
                    <span className={styles.highlightSec}> "50% Cat, 50% Dog" is valid math.</span>
                </div>
            </div>
        </div>
    )
}
