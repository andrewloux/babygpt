import { useState, useMemo } from 'react';
import styles from './SlidingWindowDemo.module.css';

const text = 'hello world';
const corpus = text.split('');

export const SlidingWindowDemo = () => {
  const [contextSize, setContextSize] = useState(3);
  const [step, setStep] = useState(0);

  const examples = useMemo(() => {
    const result = [];
    for (let i = 0; i < corpus.length - contextSize; i++) {
      const context = corpus.slice(i, i + contextSize);
      const target = corpus[i + contextSize];
      result.push({
        context,
        target,
        contextStr: context.map(c => c === ' ' ? '␣' : c).join(''),
        targetStr: target === ' ' ? '␣' : target
      });
    }
    return result;
  }, [contextSize]);

  const maxStep = Math.max(0, examples.length - 1);
  const safeStep = Math.min(step, maxStep);
  const currentExample = examples[safeStep];

  const handleContextSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setContextSize(parseInt(e.target.value, 10));
    setStep(0);
  };

  const handlePrev = () => setStep(s => Math.max(0, s - 1));
  const handleNext = () => setStep(s => Math.min(maxStep, s + 1));

  return (
    <div className={styles.demo}>
      <div className={styles.header}>
        <span className={styles.title}>Sliding Window</span>
        <div className={styles.contextControl}>
          <span className={styles.controlLabel}>Context length:</span>
          <input
            type="range"
            min="1"
            max="6"
            value={contextSize}
            onChange={handleContextSizeChange}
            className={styles.slider}
          />
          <span className={styles.contextValue}>{contextSize}</span>
        </div>
      </div>

      {/* Character tape */}
      <div className={styles.tape}>
        {corpus.map((char, i) => {
          const isPast = i < safeStep;
          const isContext = i >= safeStep && i < safeStep + contextSize;
          const isTarget = i === safeStep + contextSize;
          const isFuture = i > safeStep + contextSize;

          return (
            <div
              key={i}
              className={`${styles.cell}
                ${isPast ? styles.past : ''}
                ${isContext ? styles.context : ''}
                ${isTarget ? styles.target : ''}
                ${isFuture ? styles.future : ''}`}
            >
              <div className={styles.char}>{char === ' ' ? '␣' : char}</div>
              <div className={styles.index}>{i}</div>
            </div>
          );
        })}
      </div>

      {/* Current example display */}
      <div className={styles.currentExample}>
        <span className={styles.exampleLabel}>Training example {safeStep + 1}:</span>
        <span className={styles.contextBox}>"{currentExample?.contextStr}"</span>
        <span className={styles.arrow}>→</span>
        <span className={styles.targetBox}>"{currentExample?.targetStr}"</span>
      </div>

      {/* Step controls */}
      <div className={styles.stepControls}>
        <button
          onClick={handlePrev}
          disabled={safeStep === 0}
          className={styles.stepButton}
        >
          ← Prev
        </button>
        <div className={styles.stepIndicator}>
          {examples.map((_, i) => (
            <div
              key={i}
              className={`${styles.dot} ${i === safeStep ? styles.activeDot : ''}`}
              onClick={() => setStep(i)}
            />
          ))}
        </div>
        <button
          onClick={handleNext}
          disabled={safeStep === maxStep}
          className={styles.stepButton}
        >
          Next →
        </button>
      </div>

      {/* Examples table */}
      <div className={styles.examplesTable}>
        <div className={styles.tableHeader}>
          <span>All {examples.length} training examples from "{text}":</span>
        </div>
        <div className={styles.tableBody}>
          {examples.map((ex, i) => (
            <div
              key={i}
              className={`${styles.tableRow} ${i === safeStep ? styles.activeRow : ''}`}
              onClick={() => setStep(i)}
            >
              <span className={styles.rowNum}>{i + 1}</span>
              <span className={styles.rowContext}>"{ex.contextStr}"</span>
              <span className={styles.rowArrow}>→</span>
              <span className={styles.rowTarget}>"{ex.targetStr}"</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
