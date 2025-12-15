import styles from './ProbabilityExample.module.css';

type ProbRow = {
  char: string;
  prob: number;
  highlight?: boolean;
};

type ProbabilityExampleProps = {
  rows: ProbRow[];
  sum?: string;
};

export const ProbabilityExample = ({ rows, sum }: ProbabilityExampleProps) => {
  return (
    <div className={styles.probabilityExample}>
      {rows.map((row, i) => (
        <div key={i} className={styles.row}>
          <span className={styles.char}>{row.char}</span>
          <div className={styles.barContainer}>
            <div
              className={`${styles.bar} ${row.highlight ? styles.highlight : ''}`}
              style={{ width: `${row.prob * 100}%` }}
            />
          </div>
          <span className={styles.value}>{row.prob.toFixed(2)}</span>
        </div>
      ))}
      {sum && (
        <div className={styles.sum}>
          <span dangerouslySetInnerHTML={{ __html: sum }} />
        </div>
      )}
    </div>
  );
};
