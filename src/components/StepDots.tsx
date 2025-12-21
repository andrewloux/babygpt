import styles from './StepDots.module.css'

type StepDotsVariant = 'mini' | 'numbered'

interface StepDotsProps {
  count: number
  current: number
  onSelect: (index: number) => void
  variant?: StepDotsVariant
  showCompleted?: boolean
  ariaLabel?: string
  className?: string
}

export function StepDots({
  count,
  current,
  onSelect,
  variant = 'mini',
  showCompleted = variant === 'numbered',
  ariaLabel = 'Step navigation',
  className,
}: StepDotsProps) {
  if (count <= 1) return null

  const safeCurrent = Math.max(0, Math.min(current, count - 1))
  const rootClassName = [styles.root, styles[variant], className].filter(Boolean).join(' ')

  return (
    <div className={rootClassName} role="navigation" aria-label={ariaLabel}>
      {Array.from({ length: count }, (_, i) => {
        const isActive = i === safeCurrent
        const isCompleted = showCompleted && i < safeCurrent
        const dotClassName = [
          styles.dot,
          isActive ? styles.active : '',
          isCompleted ? styles.completed : '',
        ]
          .filter(Boolean)
          .join(' ')

        return (
          <button
            key={i}
            type="button"
            className={dotClassName}
            onClick={() => onSelect(i)}
            aria-label={`Go to step ${i + 1}`}
            aria-current={isActive ? 'step' : undefined}
          >
            {variant === 'numbered' ? i + 1 : null}
          </button>
        )
      })}
    </div>
  )
}

