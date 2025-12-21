import { ReactNode, useId } from 'react'
import styles from './Slider.module.css'

interface SliderProps {
  id?: string
  wrap?: boolean
  className?: string
  inputClassName?: string
  unstyled?: boolean
  min: number
  max: number
  step?: number
  value: number
  onValueChange: (value: number) => void
  label?: ReactNode
  valueLabel?: ReactNode
  hint?: ReactNode
  disabled?: boolean
  ariaLabel?: string
}

export function Slider({
  id,
  wrap = true,
  className,
  inputClassName,
  unstyled = false,
  min,
  max,
  step,
  value,
  onValueChange,
  label,
  valueLabel,
  hint,
  disabled,
  ariaLabel,
}: SliderProps) {
  const autoId = useId()
  const inputId = id ?? autoId

  const input = (
    <input
      id={inputId}
      className={
        unstyled
          ? inputClassName
          : `${styles.slider}${inputClassName ? ` ${inputClassName}` : ''}`
      }
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onValueChange(parseFloat(e.target.value))}
      disabled={disabled}
      aria-label={ariaLabel ?? (typeof label === 'string' ? label : undefined)}
    />
  )

  if (!wrap) return input

  return (
    <div className={`${styles.root}${className ? ` ${className}` : ''}`}>
      {label || valueLabel ? (
        <label className={styles.labelRow} htmlFor={inputId}>
          <span className={styles.label}>{label}</span>
          {valueLabel ? <span className={styles.value}>{valueLabel}</span> : null}
        </label>
      ) : null}

      {input}

      {hint ? <div className={styles.hint}>{hint}</div> : null}
    </div>
  )
}
