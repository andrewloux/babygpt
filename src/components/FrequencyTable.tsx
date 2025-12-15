import styles from './FrequencyTable.module.css';

type FrequencyTableProps = {
  header: [string, string, string];
  rows: (FreqRowData | FreqRowSum)[];
};

export type FreqRowData = {
  char: string;
  count: number | string;
  prob: string;
};

export type FreqRowSum = {
  isSum: true;
  label: string;
  count: number | string;
  prob: string;
};

export const FrequencyTable = ({ header, rows }: FrequencyTableProps) => {
  return (
    <div className={styles.frequencyTable}>
      <div className={`${styles.row} ${styles.header}`}>
        <span>{header[0]}</span>
        <span>{header[1]}</span>
        <span>{header[2]}</span>
      </div>
      {rows.map((row, i) =>
        'isSum' in row ? (
          <div key={i} className={`${styles.row} ${styles.sum}`}>
            <span>{row.label}</span>
            <span className={styles.count}>{row.count}</span>
            <span className={styles.prob}>{row.prob}</span>
          </div>
        ) : (
          <div key={i} className={styles.row}>
            <span className={styles.char}>{row.char}</span>
            <span className={styles.count}>{row.count}</span>
            <span className={styles.prob}>{row.prob}</span>
          </div>
        )
      )}
    </div>
  );
};
