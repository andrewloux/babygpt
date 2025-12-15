import styles from './ContextTrace.module.css';

type ContextTraceProps = {
  items: TraceItem[];
};

export type TraceItem = {
  context: string;
  next: string;
  source: string;
};

export const ContextTrace = ({ items }: ContextTraceProps) => {
  return (
    <div className={styles.contextTrace}>
      {items.map((item, i) => (
        <div key={i} className={styles.traceItem}>
          <span className={styles.context}>{item.context}</span>
          <span className={styles.arrow}>→</span>
          <span className={styles.next}>{item.next}</span>
          <span className={styles.source}>{item.source}</span>
        </div>
      ))}
    </div>
  );
};
