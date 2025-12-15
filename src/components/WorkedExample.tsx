import styles from './WorkedExample.module.css';

type WorkedExampleProps = {
  title: string;
  children: React.ReactNode;
};

export const WorkedExample = ({ title, children }: WorkedExampleProps) => {
  return (
    <div className={styles.workedExample}>
      <div className={styles.title}>{title}</div>
      <div className={styles.steps}>{children}</div>
    </div>
  );
};

type WorkedStepProps = {
  n: string | number;
  children: React.ReactNode;
  final?: boolean;
};

export const WorkedStep = ({ n, children, final }: WorkedStepProps) => {
  return (
    <div className={`${styles.workedStep} ${final ? styles.final : ''}`}>
      <div className={styles.stepNumber}>{n}</div>
      <div className={styles.stepContent}>{children}</div>
    </div>
  );
};

type WorkedNoteProps = {
  children: React.ReactNode;
};

export const WorkedNote = ({ children }: WorkedNoteProps) => {
  return <p className={styles.workedNote}>{children}</p>;
};
