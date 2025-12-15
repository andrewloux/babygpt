import { useState, useMemo, ReactNode } from 'react';
import styles from './SparsityDemo.module.css';

const CORPUS = [
  "the cat sat on the mat",
  "the cat ate the fish",
  "a dog ran in the park",
  "the bird sang a song",
  "she sat on a chair",
];

const TOTAL_CHARS = CORPUS.join(' ').length;

export function SparsityDemo() {
  const [query, setQuery] = useState("the cat");

  const results = useMemo(() => {
    if (!query.trim()) return { count: 0, matches: [], total: TOTAL_CHARS };

    const matches: { sentenceIdx: number; startIdx: number; endIdx: number }[] = [];

    CORPUS.forEach((sentence, sentenceIdx) => {
      let pos = 0;
      while ((pos = sentence.indexOf(query, pos)) !== -1) {
        matches.push({
          sentenceIdx,
          startIdx: pos,
          endIdx: pos + query.length,
        });
        pos += 1;
      }
    });

    return { count: matches.length, matches, total: TOTAL_CHARS };
  }, [query]);

  const highlightSentence = (sentence: string, sentenceIdx: number) => {
    const matchesInSentence = results.matches.filter(m => m.sentenceIdx === sentenceIdx);

    if (matchesInSentence.length === 0) {
      return <span className={styles.dimText}>{sentence}</span>;
    }

    const parts: ReactNode[] = [];
    let lastEnd = 0;

    matchesInSentence
      .sort((a, b) => a.startIdx - b.startIdx)
      .forEach((match, i) => {
        if (match.startIdx > lastEnd) {
          parts.push(
            <span key={`before-${i}`} className={styles.dimText}>
              {sentence.slice(lastEnd, match.startIdx)}
            </span>
          );
        }
        parts.push(
          <span key={`match-${i}`} className={styles.highlight}>
            {sentence.slice(match.startIdx, match.endIdx)}
          </span>
        );
        lastEnd = match.endIdx;
      });

    if (lastEnd < sentence.length) {
      parts.push(
        <span key="after" className={styles.dimText}>
          {sentence.slice(lastEnd)}
        </span>
      );
    }

    return <>{parts}</>;
  };

  const probability = results.count > 0
    ? (results.count / results.total).toFixed(4)
    : "0";

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.title}>The Counting Problem</span>
        <span className={styles.subtitle}>Search for a sequence in our tiny corpus</span>
      </div>

      {/* Query input */}
      <div className={styles.querySection}>
        <label className={styles.queryLabel}>Search sequence:</label>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={styles.queryInput}
          placeholder="type a sequence..."
        />
      </div>

      {/* Corpus with highlights */}
      <div className={styles.corpus}>
        <div className={styles.corpusLabel}>Training Corpus</div>
        {CORPUS.map((sentence, idx) => (
          <div key={idx} className={styles.sentence}>
            <span className={styles.lineNum}>{idx + 1}</span>
            <span className={styles.text}>{highlightSentence(sentence, idx)}</span>
          </div>
        ))}
      </div>

      {/* Result */}
      <div className={`${styles.result} ${results.count === 0 ? styles.notFound : styles.found}`}>
        {query.trim() ? (
          <>
            <div className={styles.resultQuery}>"{query}"</div>
            {results.count > 0 ? (
              <div className={styles.resultStats}>
                <span className={styles.foundBadge}>FOUND</span>
                <span className={styles.count}>{results.count}× in corpus</span>
                <span className={styles.prob}>P ≈ {probability}</span>
              </div>
            ) : (
              <div className={styles.resultStats}>
                <span className={styles.notFoundBadge}>NEVER SEEN</span>
                <span className={styles.zero}>P = 0</span>
                <span className={styles.impossible}>(treated as impossible)</span>
              </div>
            )}
          </>
        ) : (
          <div className={styles.placeholder}>Type a sequence to search...</div>
        )}
      </div>

      {/* Suggestions */}
      <div className={styles.suggestions}>
        <span className={styles.suggestLabel}>Try:</span>
        {["the cat", "the dog", "sat on", "a bird", "the fish ate"].map((s) => (
          <button
            key={s}
            className={styles.suggestBtn}
            onClick={() => setQuery(s)}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
