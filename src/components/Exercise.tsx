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
  const [activeTab, setActiveTab] = useState<'hint' | 'solution' | null>(null);

  return (
    <div className={styles.exercise}>
      <div className={styles.header}>
        <span className={styles.number}>{number}</span>
        <span className={styles.title}>{title}</span>
      </div>
      <div className={styles.body}>
        {children}
        {(hint || solution) && (
          <div className={styles.tabsWrap}>
            <div className={styles.tabs}>
              {hint && (
                <button
                  type="button"
                  className={[
                    styles.tab,
                    styles.hintTab,
                    activeTab === 'hint' ? styles.active : '',
                  ].join(' ')}
                  onClick={() => setActiveTab(activeTab === 'hint' ? null : 'hint')}
                  aria-pressed={activeTab === 'hint'}
                >
                  Hint
                </button>
              )}
              {solution && (
                <button
                  type="button"
                  className={[
                    styles.tab,
                    styles.solutionTab,
                    activeTab === 'solution' ? styles.active : '',
                  ].join(' ')}
                  onClick={() => setActiveTab(activeTab === 'solution' ? null : 'solution')}
                  aria-pressed={activeTab === 'solution'}
                >
                  Solution
                </button>
              )}
            </div>

            {activeTab && (
              <div
                className={[
                  styles.tabContent,
                  activeTab === 'solution' ? styles.solutionContent : styles.hintContent,
                ].join(' ')}
              >
                {activeTab === 'hint' ? hint : solution}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
