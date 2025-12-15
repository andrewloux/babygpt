import { useState, useMemo } from 'react';
import styles from './TokenizerDemo.module.css';

export const TokenizerDemo = () => {
  const [text, setText] = useState('hello world');

  // Vocabulary is automatically derived from the input (just like the real code)
  const vocab = useMemo(() => {
    return [...new Set(text.split(''))].sort();
  }, [text]);

  // Build stoi mapping
  const stoi = useMemo(() => {
    const map: Record<string, number> = {};
    vocab.forEach((char, idx) => {
      map[char] = idx;
    });
    return map;
  }, [vocab]);

  // Tokenize the input
  const tokens = useMemo(() => {
    return text.split('').map((char) => ({
      char,
      id: stoi[char],
    }));
  }, [text, stoi]);

  return (
    <div className={styles.tokenizerDemo}>
      <div className={styles.inputSection}>
        <div className={styles.inputLabel}>Input text</div>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className={styles.textInput}
          placeholder="type something..."
        />
        <div className={styles.tokensLabel}>Encoded → <span className={styles.tokenArray}>[{tokens.map(t => t.id).join(', ')}]</span></div>
        <div className={styles.tokens}>
          {tokens.map((t, i) => (
            <div key={i} className={styles.token}>
              <div className={styles.tokenId}>{t.id}</div>
              <div className={styles.tokenChar}>{t.char === ' ' ? '␣' : `'${t.char}'`}</div>
            </div>
          ))}
        </div>
      </div>
      <div className={styles.vocabSection}>
        <div className={styles.vocabHeader}>
          <span className={styles.vocabTitle}>Vocabulary</span>
          <span className={styles.vocabSize}>{vocab.length} tokens</span>
        </div>
        <div className={styles.vocab}>
          {vocab.map((char, id) => (
            <div key={id} className={styles.vocabItem}>
              <div className={styles.vocabId}>{id}</div>
              <div className={styles.vocabChar}>{char === ' ' ? '␣' : `'${char}'`}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
