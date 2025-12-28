import { useEffect, useState, useCallback, Children, isValidElement, ReactNode } from 'react'
import { codeToHtml } from 'shiki'
import { StepDots } from './StepDots'
import styles from './CodeWalkthrough.module.css'

// Step component - data container
type StepProps = {
  code: string
  children: ReactNode
}

export function Step({ children }: StepProps) {
  return <>{children}</>
}
Step.displayName = 'Step'

type CodeWalkthroughProps = {
  filename?: string
  lang?: string
  title?: string
  subtitle?: string
  figureNumber?: string
  children: ReactNode
}

export function CodeWalkthrough({
  filename,
  lang = 'python',
  title,
  subtitle,
  figureNumber,
  children,
}: CodeWalkthroughProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [highlightedHtml, setHighlightedHtml] = useState<string[]>([])

  // Extract steps from children
  const steps: { code: string; explanation: ReactNode }[] = []
  Children.forEach(children, (child) => {
    if (isValidElement(child) && typeof (child.props as any).code === 'string') {
      steps.push({
        code: (child.props as any).code,
        explanation: (child.props as any).children,
      })
    }
  })

  const countLines = (code: string) => (code ? code.split('\n').length : 0)

  // Highlight code for each step (accumulated)
  useEffect(() => {
    let cancelled = false

    const highlightAll = async () => {
      const results = await Promise.all(
        steps.map(async (step, idx) => {
          const previousCode =
            idx === 0
              ? ''
              : steps
                  .slice(0, idx)
                  .map((s) => s.code)
                  .join('\n')
          const fullCode = previousCode ? `${previousCode}\n${step.code}` : step.code
          const highlightStart = countLines(previousCode) + 1
          const highlightEnd = highlightStart + countLines(step.code) - 1

          return codeToHtml(fullCode, {
            lang,
            theme: 'github-dark',
            tabindex: false,
            transformers: [
              {
                name: 'babygpt-highlight-new-lines',
                line(this: any, hast: any, lineNumber: number) {
                  if (lineNumber >= highlightStart && lineNumber <= highlightEnd) {
                    this.addClassToHast(hast, styles.newLine)
                  }
                },
              },
            ],
          })
        })
      )
      if (!cancelled) setHighlightedHtml(results)
    }

    highlightAll()
    return () => {
      cancelled = true
    }
  }, [steps.map((s) => s.code).join('|||'), lang])

  const goToPrev = useCallback(() => {
    setCurrentStep((s) => Math.max(0, s - 1))
  }, [])

  const goToNext = useCallback(() => {
    setCurrentStep((s) => Math.min(steps.length - 1, s + 1))
  }, [steps.length])

  const currentExplanation = steps[currentStep]?.explanation
  const currentHtml = highlightedHtml[currentStep]
  const currentCode = steps
    .slice(0, currentStep + 1)
    .map((s) => s.code)
    .join('\n')

  return (
    <div className={styles.container}>
      <div className={styles.ambientGlow} />
      <div className={styles.walkthrough}>
        {(title || subtitle || figureNumber) && (
          <div className={styles.header}>
            <div className={styles.headerText}>
              {title && <h3 className={styles.title}>{title}</h3>}
              {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
            </div>
            {figureNumber && <span className={styles.figNum}>{figureNumber}</span>}
          </div>
        )}

        {filename && <div className={styles.filename}>{filename}</div>}

        <StepDots
          className={styles.stepIndicator}
          count={steps.length}
          current={currentStep}
          onSelect={setCurrentStep}
          variant="numbered"
          ariaLabel="Code step navigation"
        />

        <div className={styles.stepContent}>
          <div className={styles.explanation}>{currentExplanation}</div>

          <div className={styles.codeBlock} role="img" aria-label={`Code for step ${currentStep + 1}`}>
            {currentHtml ? (
              <div className={styles.codeContent} dangerouslySetInnerHTML={{ __html: currentHtml }} />
            ) : (
              <div className={styles.codeContent}>
                <pre>
                  <code>{currentCode}</code>
                </pre>
              </div>
            )}
          </div>
        </div>

        <div className={styles.controls}>
          <button
            className={styles.navBtn}
            onClick={goToPrev}
            disabled={currentStep === 0}
            aria-label="Previous step"
            type="button"
          >
            ← Previous
          </button>
          <span className={styles.stepCount}>
            {currentStep + 1} / {steps.length}
          </span>
          <button
            className={styles.navBtn}
            onClick={goToNext}
            disabled={currentStep === steps.length - 1}
            aria-label="Next step"
            type="button"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  )
}
