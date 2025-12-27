import { useEffect, useId, useMemo, useRef, useState } from 'react'

import styles from './ExplorableEssay.module.css'

export type ExplorableEssayStep = {
  label: string
  body: React.ReactNode
  hint?: React.ReactNode
}

export type ExplorableEssayProps = {
  title: string
  steps: ExplorableEssayStep[]
  renderViz: (stepIndex: number) => React.ReactNode
  initialStep?: number
  onStepChange?: (stepIndex: number) => void
}

export function ExplorableEssay({ title, steps, renderViz, initialStep = 0, onStepChange }: ExplorableEssayProps) {
  const stepCount = steps.length
  const safeInitial = Math.max(0, Math.min(stepCount - 1, initialStep))
  const [stepIndex, setStepIndex] = useState(safeInitial)
  const stepperId = useId()
  const stepperRef = useRef<HTMLDivElement | null>(null)

  const step = steps[stepIndex]

  const stepperItems = useMemo(() => {
    return steps.map((s, i) => ({
      i,
      label: s.label,
      isActive: i === stepIndex,
    }))
  }, [steps, stepIndex])

  useEffect(() => {
    // If the initialStep prop changes, clamp and move.
    setStepIndex(Math.max(0, Math.min(stepCount - 1, initialStep)))
  }, [initialStep, stepCount])

  useEffect(() => {
    onStepChange?.(stepIndex)
  }, [onStepChange, stepIndex])

  const onStepperKeyDown = (e: React.KeyboardEvent) => {
    if (stepCount <= 1) return
    let next = stepIndex
    let handled = true

    switch (e.key) {
      case 'ArrowLeft':
      case 'ArrowUp':
        next = Math.max(0, stepIndex - 1)
        break
      case 'ArrowRight':
      case 'ArrowDown':
        next = Math.min(stepCount - 1, stepIndex + 1)
        break
      case 'Home':
        next = 0
        break
      case 'End':
        next = stepCount - 1
        break
      default:
        handled = false
    }

    if (!handled) return
    e.preventDefault()
    setStepIndex(next)
    const container = stepperRef.current
    const btn = container?.querySelector<HTMLButtonElement>(`[data-step="${next}"]`)
    btn?.focus()
  }

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <div className={styles.title}>{title}</div>
        <div
          className={styles.stepper}
          ref={stepperRef}
          role="tablist"
          aria-label={`${title} stepper`}
          onKeyDown={onStepperKeyDown}
          id={stepperId}
        >
          {stepperItems.map((s) => (
            <button
              key={s.i}
              type="button"
              role="tab"
              aria-selected={s.isActive}
              aria-controls={`${stepperId}-panel`}
              className={`${styles.stepBtn} ${s.isActive ? styles.stepBtnActive : ''}`}
              onClick={() => setStepIndex(s.i)}
              data-step={s.i}
            >
              <span className={styles.stepDot} aria-hidden="true" />
              <span className={styles.stepLabel}>{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className={styles.body}>
        <div className={`${styles.narrative} panel-dark inset-box`} role="tabpanel" id={`${stepperId}-panel`} aria-labelledby={stepperId}>
          <div className={styles.narrativeHeader}>
            <div className={styles.narrativeKicker}>
              Step {stepIndex + 1} / {stepCount}
            </div>
            <div className={styles.narrativeTitle}>{step?.label}</div>
          </div>

          <div className={styles.narrativeBody}>{step?.body}</div>

          {step?.hint ? (
            <details className="collapsible">
              <summary>Hint</summary>
              <div className={styles.hintBody}>{step.hint}</div>
            </details>
          ) : null}

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.navBtn}
              onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
              disabled={stepIndex === 0}
            >
              Back
            </button>
            <button
              type="button"
              className={styles.navBtnPrimary}
              onClick={() => setStepIndex((i) => Math.min(stepCount - 1, i + 1))}
              disabled={stepIndex === stepCount - 1}
            >
              Next
            </button>
          </div>
        </div>

        <div className={styles.viz} aria-label={`${title} visualization`}>
          {renderViz(stepIndex)}
        </div>
      </div>
    </div>
  )
}
