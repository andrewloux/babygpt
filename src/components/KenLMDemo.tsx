import { useState } from 'react'
import styles from './KenLMDemo.module.css'

type Slot = {
  key: string | null
  value: string | null
  originalHash: number | null
}

const MEMORY_SIZE = 8

// Setup: "cat sat" hashes to 3. "dog sat" ALSO hashes to 3 (collision).
// "dog ran" hashes to 6.
const INITIAL_MEMORY: Slot[] = Array(MEMORY_SIZE).fill(null).map(() => ({ key: null, value: null, originalHash: null }))

// Insert "cat sat" -> 3
INITIAL_MEMORY[3] = { key: "cat sat", value: "0.25", originalHash: 3 }
// Insert "dog sat" -> 3 (COLLISION! moved to 4)
INITIAL_MEMORY[4] = { key: "dog sat", value: "0.01", originalHash: 3 }
// Insert "dog ran" -> 6
INITIAL_MEMORY[6] = { key: "dog ran", value: "0.50", originalHash: 6 }

const QUERY = "dog sat"
const QUERY_HASH = 3 // Intentionally collides with "cat sat"

export function KenLMDemo() {
  const [step, setStep] = useState(0) // 0: Idle, 1: Hash, 2: Check 3 (Miss), 3: Check 4 (Hit)
  const [activeSlot, setActiveSlot] = useState<number | null>(null)
  const [status, setStatus] = useState<"idle" | "checking" | "collision" | "found">("idle")
  const [log, setLog] = useState("Ready to query.")

  const nextStep = () => {
    if (step === 0) {
      setStep(1)
      setLog(`Hash("${QUERY}") = ${QUERY_HASH}`)
      return
    }
    if (step === 1) {
      setStep(2)
      setActiveSlot(3)
      setStatus("collision")
      setLog(`Index ${QUERY_HASH}: Found "cat sat". Match? NO. (Collision!)`)
      return
    }
    if (step === 2) {
      setStep(3)
      setActiveSlot(4)
      setStatus("found")
      setLog(`Index ${QUERY_HASH + 1}: Found "dog sat". Match? YES. Value: 0.01`)
      return
    }
    if (step === 3) {
      // Reset
      setStep(0)
      setActiveSlot(null)
      setStatus("idle")
      setLog("Ready to query.")
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.title}>Visualizing Linear Probing</div>
      
      <div className={styles.controls}>
        <div className={styles.queryBox}>
          <span className={styles.label}>Query:</span>
          <span className={styles.value}>"{QUERY}"</span>
        </div>
        <button className={styles.actionBtn} onClick={nextStep}>
          {step === 0 ? "Start Lookup" : step === 3 ? "Reset" : "Next Step"}
        </button>
      </div>

      <div className={styles.log}>
        <span className={styles.logStep}>
          {step === 0 && (
            <span>
              Click 'Start Lookup' to trace the probe.
              <br/>
              <em style={{opacity: 0.7, fontSize: '0.9em'}}>Note: Hash("dog sat") ≠ Hash("sat dog"). The order is baked into the index.</em>
            </span>
          )}
          {step !== 0 && (
             <span>
               {step === 1 && "1. Compute Hash: "}
               {step === 2 && "2. Check Slot 3: "}
               {step === 3 && "3. Check Slot 4: "}
               <strong>{log}</strong>
             </span>
          )}
        </span>
      </div>

      <div className={styles.memoryMap}>
        {INITIAL_MEMORY.map((slot, i) => {
          let stateClass = ""
          if (activeSlot === i) {
            if (status === "collision") stateClass = styles.collision
            if (status === "found") stateClass = styles.match
            if (status === "checking") stateClass = styles.active
          }

          return (
            <div key={i} className={`${styles.slot} ${stateClass}`}>
              <span className={styles.slotIndex}>{i}</span>
              <span className={`${styles.slotContent} ${!slot.key ? styles.empty : ''}`}>
                {slot.key || "(empty)"}
              </span>
              <span className={styles.slotValue}>
                {slot.value ? `P=${slot.value}` : ""}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
