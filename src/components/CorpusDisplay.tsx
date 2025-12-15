import styles from './CorpusDisplay.module.css';

type CorpusDisplayProps = {
  sentences: string[];
};

export const CorpusDisplay = ({ sentences }: CorpusDisplayProps) => {
  return (
    <div className={styles.corpusDisplay}>
      {sentences.map((sentence, i) => (
        <div key={i} className={styles.sentence}>
          {sentence}
        </div>
      ))}
    </div>
  );
};
