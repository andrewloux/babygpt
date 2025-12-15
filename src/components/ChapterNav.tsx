import styles from './ChapterNav.module.css';

type ChapterNavProps = {
  prev?: {
    href: string;
    label: string;
  };
  next?: {
    href: string;
    label: string;
  };
};

export const ChapterNav = ({ prev, next }: ChapterNavProps) => {
  return (
    <nav className={styles.chapterNav}>
      {prev ? (
        <a href={prev.href} className={styles.prev}>
          <span className={styles.arrow}>&larr;</span>
          <span className={styles.label}>{prev.label}</span>
        </a>
      ) : (
        <div />
      )}
      {next ? (
        <a href={next.href} className={styles.next}>
          <span className={styles.label}>{next.label}</span>
          <span className={styles.arrow}>&rarr;</span>
        </a>
      ) : (
        <div />
      )}
    </nav>
  );
};
