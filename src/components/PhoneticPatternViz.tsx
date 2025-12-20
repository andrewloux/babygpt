import { useState } from 'react'
import styles from './PhoneticPatternViz.module.css'

type AnimationStep = 'initial' | 'highlight' | 'transform' | 'complete'
const STEPS: AnimationStep[] = ['initial', 'highlight', 'transform', 'complete']

export function PhoneticPatternViz() {
  const [step, setStep] = useState<AnimationStep>('initial')

  const stepIndex = STEPS.indexOf(step)

  const handlePrev = () => {
    const nextIdx = (stepIndex - 1 + STEPS.length) % STEPS.length
    setStep(STEPS[nextIdx])
  }

  const handleNext = () => {
    const nextIdx = (stepIndex + 1) % STEPS.length
    setStep(STEPS[nextIdx])
  }

  // Determine which phonemes to highlight
  const highlightPinP = step === 'highlight' || step === 'transform'
  const highlightSpinP = step === 'highlight'
  const showAspirated = step === 'transform' || step === 'complete'

  return (
    <div className={styles.container}>
      {/* Ambient glow */}
      <div className={styles.ambientGlow} />

      <div className={styles.card}>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <h3 className={styles.title}>Aspiration Has Rules</h3>
            <p className={styles.subtitle}>pin vs spin (English)</p>
          </div>
          <div className={styles.controls}>
            <button
              type="button"
              className={styles.controlBtn}
              onClick={handlePrev}
              aria-label="Previous step"
            >
              |&lt;
            </button>
            <button
              type="button"
              className={styles.controlBtn}
              onClick={handleNext}
              aria-label="Next step"
            >
              &gt;|
            </button>
          </div>
        </div>

        {/* Main visualization area */}
        <div className={styles.stage}>
          {/* Word 1 */}
          <div className={styles.wordSection}>
            <div className={styles.wordLabel}>Word start</div>
            <div className={styles.wordDisplay}>
              <span
                className={`${styles.phoneme} ${highlightPinP ? styles.highlightAspirate : ''} ${showAspirated ? styles.transformed : ''}`}
              >
                {showAspirated ? 'pʰ' : 'p'}
              </span>
              <span className={styles.phoneme}>i</span>
              <span className={styles.phoneme}>n</span>
            </div>
            <div className={styles.romanization}>puff of air</div>
            <div className={styles.meaning}>"pin"</div>
          </div>

          {/* Arrow */}
          <div className={styles.arrow}>
            <svg width="60" height="24" viewBox="0 0 60 24" fill="none">
              <path
                d="M2 12 L50 12"
                stroke="rgba(255, 255, 255, 0.3)"
                strokeWidth="2"
                strokeDasharray="4 4"
              />
              <path
                d="M50 12 L44 8 M50 12 L44 16"
                stroke="rgba(255, 255, 255, 0.3)"
                strokeWidth="2"
              />
            </svg>
          </div>

          {/* Word 2 */}
          <div className={styles.wordSection}>
            <div className={styles.wordLabel}>After “s”</div>
            <div className={styles.wordDisplay}>
              <span className={styles.phoneme}>s</span>
              <span
                className={`${styles.phoneme} ${highlightSpinP ? styles.highlightAspirate : ''}`}
              >
                p
              </span>
              <span className={styles.phoneme}>i</span>
              <span className={styles.phoneme}>n</span>
            </div>
            <div className={styles.romanization}>no puff</div>
            <div className={styles.meaning}>"spin"</div>
          </div>
        </div>

        {/* Rule explanation */}
        <div className={styles.ruleBox}>
          <div className={styles.ruleTitle}>The Pattern</div>
          <div className={styles.ruleContent}>
            {step === 'initial' && (
              <p>Same letter, different sound. English turns the “puff of air” on and off depending on position.</p>
            )}
            {step === 'highlight' && (
              <p>Compare the <span className={styles.aspirateHighlight}>p</span> in <em>pin</em> vs <em>spin</em>. The only difference is that <em>s</em> sitting in front.</p>
            )}
            {step === 'transform' && (
              <p>At word start, <span className={styles.transformHighlight}>p</span> becomes <span className={styles.transformHighlight}>pʰ</span> (aspirated). After <em>s</em>, it stays plain.</p>
            )}
            {step === 'complete' && (
              <p className={styles.conclusion}>
                <strong>Position → rule → output:</strong> local context flips a predictable switch.
              </p>
            )}
          </div>
        </div>

        {/* Footer insight */}
        <div className={styles.footer}>
          <p className={styles.footerText}>
            Language has <span className={styles.highlightPattern}>systematic patterns</span> that behave like functions.
            Once you believe “rules exist,” it’s not such a leap to believe they can be learned — and then stored as{' '}
            <span className={styles.highlightCoord}>coordinates in a vector space</span>.
          </p>
        </div>
      </div>
    </div>
  )
}
