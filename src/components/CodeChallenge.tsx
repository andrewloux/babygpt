import { useCallback, useEffect, useState, createContext, useContext, ReactNode } from 'react'
import styles from './CodeChallenge.module.css'

// Context to share revealed state with sub-components
const ChallengeContext = createContext<{
  step: 0 | 1 | 2
  setStep: (v: 0 | 1 | 2) => void
  hasCheckpoint: boolean
  registerCheckpoint: () => void
}>({
  step: 0,
  setStep: () => {},
  hasCheckpoint: false,
  registerCheckpoint: () => {},
})

interface CodeChallengeProps {
  phase?: number | string
  title: string
  children: ReactNode
}

export function CodeChallenge({ phase, title, children }: CodeChallengeProps) {
  const [step, setStep] = useState<0 | 1 | 2>(0)
  const [hasCheckpoint, setHasCheckpoint] = useState(false)
  const registerCheckpoint = useCallback(() => setHasCheckpoint(true), [])

  return (
    <ChallengeContext.Provider value={{ step, setStep, hasCheckpoint, registerCheckpoint }}>
      <div className={`${styles.container} ${step === 2 ? styles.revealed : ''}`}>
        <div className={styles.header}>
          {phase && <span className={styles.phase}>Phase {phase}</span>}
          <span className={styles.title}>{title}</span>
          {step === 2 && <span className={styles.check}>✓</span>}
        </div>
        <div className={styles.content}>
          {children}
        </div>
      </div>
    </ChallengeContext.Provider>
  )
}

// Setup: Always visible context/explanation
function Setup({ children }: { children: ReactNode }) {
  return <div className={styles.setup}>{children}</div>
}

// Prompt: The challenge question (visible until revealed, then dimmed)
function Prompt({ children }: { children: ReactNode }) {
  const { step, setStep, hasCheckpoint } = useContext(ChallengeContext)

  return (
    <div className={styles.promptSection}>
      <div className={`${styles.prompt} ${step > 0 ? styles.promptRevealed : ''}`}>
        <div className={styles.promptHeader}>
          <span className={styles.promptIcon}>🤔</span>
          <span className={styles.promptLabel}>Your turn</span>
        </div>
        <div className={styles.promptContent}>
          {children}
        </div>
      </div>
      {step === 0 && (
        <button
          className={styles.nextButton}
          onClick={() => setStep(hasCheckpoint ? 1 : 2)}
        >
          Next →
        </button>
      )}
    </div>
  )
}

// Checkpoint: An intermediate self-check stage (shown before revealing the full solution).
function Checkpoint({ children }: { children: ReactNode }) {
  const { step, setStep, registerCheckpoint } = useContext(ChallengeContext)

  useEffect(() => {
    registerCheckpoint()
  }, [registerCheckpoint])

  if (step === 0) return null

  return (
    <div className={styles.checkpointSection}>
      <div className={styles.checkpoint}>
        <div className={styles.checkpointHeader}>
          <span className={styles.checkpointIcon}>👀</span>
          <span className={styles.checkpointLabel}>What you should see</span>
        </div>
        <div className={styles.checkpointContent}>{children}</div>
      </div>
      {step === 1 && (
        <button className={styles.nextButton} onClick={() => setStep(2)}>
          Show solution →
        </button>
      )}
    </div>
  )
}

// Solution: Hidden until Next is clicked
function Solution({ children }: { children: ReactNode }) {
  const { step } = useContext(ChallengeContext)

  if (step !== 2) return null

  return (
    <div className={styles.solution}>
      {children}
    </div>
  )
}

// Answer: Optional highlighted answer box inside Solution
function Answer({ children }: { children: ReactNode }) {
  return (
    <div className={styles.answer}>
      <div className={styles.answerHeader}>
        <span className={styles.answerIcon}>✓</span>
        <span className={styles.answerLabel}>Answer</span>
      </div>
      <div className={styles.answerContent}>
        {children}
      </div>
    </div>
  )
}

// Attach sub-components
CodeChallenge.Setup = Setup
CodeChallenge.Prompt = Prompt
CodeChallenge.Checkpoint = Checkpoint
CodeChallenge.Solution = Solution
CodeChallenge.Answer = Answer
