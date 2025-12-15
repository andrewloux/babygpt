import { useState, createContext, useContext, ReactNode } from 'react'
import styles from './CodeChallenge.module.css'

// Context to share revealed state with sub-components
const ChallengeContext = createContext<{
  revealed: boolean
  setRevealed: (v: boolean) => void
}>({ revealed: false, setRevealed: () => {} })

interface CodeChallengeProps {
  phase?: number | string
  title: string
  children: ReactNode
}

export function CodeChallenge({ phase, title, children }: CodeChallengeProps) {
  const [revealed, setRevealed] = useState(false)

  return (
    <ChallengeContext.Provider value={{ revealed, setRevealed }}>
      <div className={`${styles.container} ${revealed ? styles.revealed : ''}`}>
        <div className={styles.header}>
          {phase && <span className={styles.phase}>Phase {phase}</span>}
          <span className={styles.title}>{title}</span>
          {revealed && <span className={styles.check}>✓</span>}
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
  const { revealed, setRevealed } = useContext(ChallengeContext)

  return (
    <div className={styles.promptSection}>
      <div className={`${styles.prompt} ${revealed ? styles.promptRevealed : ''}`}>
        <div className={styles.promptHeader}>
          <span className={styles.promptIcon}>🤔</span>
          <span className={styles.promptLabel}>Your turn</span>
        </div>
        <div className={styles.promptContent}>
          {children}
        </div>
      </div>
      {!revealed && (
        <button
          className={styles.nextButton}
          onClick={() => setRevealed(true)}
        >
          Next →
        </button>
      )}
    </div>
  )
}

// Solution: Hidden until Next is clicked
function Solution({ children }: { children: ReactNode }) {
  const { revealed } = useContext(ChallengeContext)

  if (!revealed) return null

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
CodeChallenge.Solution = Solution
CodeChallenge.Answer = Answer
