import styles from './WorkedExample.module.css'

type WorkedExampleProps = {
  title: string
  children: React.ReactNode
}

export const WorkedExample = ({ title, children }: WorkedExampleProps) => {
  return (
    <div className={styles.workedExample}>
      <div className={styles.title}>{title}</div>
      <div className={styles.steps}>{children}</div>
    </div>
  )
}

type WorkedStepProps = {
  n: string | number
  children: React.ReactNode
  final?: boolean
}

export const WorkedStep = ({ n, children, final }: WorkedStepProps) => {
  return (
    <div className={`${styles.workedStep} ${final ? styles.final : ''}`}>
      <div className={styles.stepNumber}>{n}</div>
      <div className={styles.stepContent}>{children}</div>
    </div>
  )
}

type WorkedNoteProps = {
  children: React.ReactNode
}

export const WorkedNote = ({ children }: WorkedNoteProps) => {
  return <p className={styles.workedNote}>{children}</p>
}

type WorkedValueProps = {
  value: number
  onValueChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  label?: string
  ariaLabel: string
  format?: (value: number) => string
}

export const WorkedValue = ({
  value,
  onValueChange,
  min = -Infinity,
  max = Infinity,
  step = 0.1,
  label,
  ariaLabel,
  format,
}: WorkedValueProps) => {
  const display = format ? format(value) : value.toString()

  return (
    <span className={styles.valueWrap} aria-label={ariaLabel}>
      {label ? <span className={styles.valueLabel}>{label}</span> : null}
      <button
        type="button"
        className={`${styles.valueBtn} hover-lift`}
        onClick={() => onValueChange(Math.max(min, value - step))}
        aria-label={`${ariaLabel}: decrease`}
      >
        −
      </button>
      <span className={styles.valueDisplay}>{display}</span>
      <button
        type="button"
        className={`${styles.valueBtn} hover-lift`}
        onClick={() => onValueChange(Math.min(max, value + step))}
        aria-label={`${ariaLabel}: increase`}
      >
        +
      </button>
    </span>
  )
}
