import { useState } from 'react';
import styles from './Exercise.module.css';

type ExerciseProps = {
  number: string;
  title: string;
  children: React.ReactNode;
  hint?: React.ReactNode;
  solution?: React.ReactNode;
};

export const Exercise = ({ number, title, children, hint, solution }: ExerciseProps) => {
  const [showHint, setShowHint] = useState(false);
  const [showSolution, setShowSolution] = useState(false);

  return (
    <div className={styles.exercise}>
      <div className={styles.header}>
        <span className={styles.number}>{number}</span>
        <span className={styles.title}>{title}</span>
      </div>
      <div className={styles.body}>
        {children}
        {(hint || solution) && (
          <div className={styles.collapsibles}>
            {hint && (
              <Collapsible
                type="hint"
                isOpen={showHint}
                onToggle={() => setShowHint(!showHint)}
              >
                {hint}
              </Collapsible>
            )}
            {solution && (
              <Collapsible
                type="solution"
                isOpen={showSolution}
                onToggle={() => setShowSolution(!showSolution)}
              >
                {solution}
              </Collapsible>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

type CollapsibleProps = {
  type: 'hint' | 'solution';
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
};

const Collapsible = ({
  type,
  isOpen,
  onToggle,
  children,
}: CollapsibleProps) => {
  const label = type === 'hint' ? 'Show Hint' : 'Show Solution';
  return (
    <div className={styles.collapsible}>
      <button
        onClick={onToggle}
        className={`${styles.collapsibleHeader} ${type === 'solution' ? styles.solution : ''}`}
      >
        {isOpen ? 'Hide' : label}
      </button>
      {isOpen && (
        <div className={`${styles.collapsibleContent} ${type === 'solution' ? styles.solution : ''}`}>
          {children}
        </div>
      )}
    </div>
  );
};
