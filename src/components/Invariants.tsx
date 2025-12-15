import styles from './Invariants.module.css';

type InvariantsProps = {
  title: string;
  children: React.ReactNode;
};

export const Invariants = ({ title, children }: InvariantsProps) => {
  return (
    <div className={styles.invariants}>
      <div className={styles.title}>✓ {title}</div>
      {children}
    </div>
  );
};

type InvariantItemProps = {
  children: React.ReactNode;
};

export const InvariantItem = ({ children }: InvariantItemProps) => {
  return (
    <div className={styles.invariantItem}>
      <span className={styles.check}>✓</span>
      <span>{children}</span>
    </div>
  );
};
