import { useEffect, useState, Children, isValidElement, ReactNode } from 'react';
import { codeToHtml } from 'shiki';
import styles from './CodeWalkthrough.module.css';

// Step component - data container
type StepProps = {
  code: string;
  children: ReactNode;
};

export function Step({ children }: StepProps) {
  return <>{children}</>;
}
Step.displayName = 'Step';

type CodeWalkthroughProps = {
  filename?: string;
  lang?: string;
  title?: string;
  subtitle?: string;
  figureNumber?: string;
  children: ReactNode;
};

export function CodeWalkthrough({
  filename,
  lang = 'python',
  title,
  subtitle,
  figureNumber,
  children
}: CodeWalkthroughProps) {
  const [highlightedHtml, setHighlightedHtml] = useState<string[]>([]);

  // Extract steps from children - check for 'code' prop which is unique to Step
  const steps: { code: string; explanation: ReactNode }[] = [];
  Children.forEach(children, (child) => {
    if (isValidElement(child) && typeof (child.props as any).code === 'string') {
      steps.push({
        code: (child.props as any).code,
        explanation: (child.props as any).children,
      });
    }
  });

  const countLines = (code: string) => (code ? code.split('\n').length : 0);
  const getAccumulatedCode = (stepIdx: number) =>
    steps
      .slice(0, stepIdx + 1)
      .map((s) => s.code)
      .join('\n');

  // Highlight accumulated code for each step, and mark the new line(s)
  useEffect(() => {
    let cancelled = false;

    const highlightAll = async () => {
      const results = await Promise.all(
        steps.map(async (step, idx) => {
          const previousCode = idx === 0 ? '' : steps.slice(0, idx).map((s) => s.code).join('\n');
          const fullCode = previousCode ? `${previousCode}\n${step.code}` : step.code;
          const highlightStart = countLines(previousCode) + 1;
          const highlightEnd = highlightStart + countLines(step.code) - 1;

          return codeToHtml(fullCode, {
            lang,
            theme: 'github-dark',
            tabindex: false,
            transformers: [
              {
                name: 'babygpt-highlight-new-lines',
                line(this: any, hast: any, lineNumber: number) {
                  if (lineNumber >= highlightStart && lineNumber <= highlightEnd) {
                    this.addClassToHast(hast, styles.newLine);
                  }
                },
              },
            ],
          });
        })
      );
      if (!cancelled) setHighlightedHtml(results);
    };

    highlightAll();
    return () => { cancelled = true; };
  }, [steps.map(s => s.code).join('|||'), lang]);

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

        <div className={styles.steps}>
          {steps.map((step, idx) => (
            <div key={idx} className={styles.step}>
              {/* Step number - left column */}
              <span className={styles.stepNum} aria-label={`Step ${idx + 1}`}>{idx + 1}</span>

              {/* Explanation - right column, top */}
              <div className={styles.explanation}>
                {step.explanation}
              </div>

              {/* Code block - right column, bottom */}
              <div
                className={styles.codeBlock}
                role="img"
                aria-label={`Code for step ${idx + 1}`}
              >
                {highlightedHtml[idx] ? (
                  <div
                    className={styles.codeContent}
                    dangerouslySetInnerHTML={{ __html: highlightedHtml[idx] }}
                  />
                ) : (
                  <div className={styles.codeContent}>
                    <pre><code>{getAccumulatedCode(idx)}</code></pre>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
