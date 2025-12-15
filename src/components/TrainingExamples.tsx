import styles from './TrainingExamples.module.css';

type TrainingExamplesProps = {
  rows: TrainingRow[];
};

export type TrainingRow = {
  step: string;
  context: string;
  target: string;
};

export const TrainingExamples = ({ rows }: TrainingExamplesProps) => {
  return (
    <div className={styles.trainingExamples}>
      <div className={`${styles.row} ${styles.header}`}>
        <span>Step</span>
        <span>Context (input)</span>
        <span>Target</span>
      </div>
      {rows.map((row, i) => (
        <div key={i} className={styles.row}>
          <span className={styles.step}>{row.step}</span>
          <span className={styles.context}>{row.context}</span>
          <span className={styles.target}>{row.target}</span>
        </div>
      ))}
    </div>
  );
};
