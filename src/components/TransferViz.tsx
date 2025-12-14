import styles from './TransferViz.module.css'

interface Sentence {
  text: string
  highlight: string
  count: string
  seen: boolean
}

interface TransferVizProps {
  sentences: Sentence[]
}

export function TransferCorpus({ sentences }: TransferVizProps) {
  return (
    <div className={styles.corpus}>
      {sentences.map((sentence, index) => (
        <div
          key={index}
          className={`${styles.sentence} ${sentence.seen ? styles.seen : styles.unseen}`}
        >
          <span>
            {sentence.text.split(sentence.highlight).map((part, i, arr) => (
              <span key={i}>
                {part}
                {i < arr.length - 1 && <strong>{sentence.highlight}</strong>}
              </span>
            ))}
          </span>
          <span className={styles.count}>{sentence.count}</span>
        </div>
      ))}
    </div>
  )
}

interface ComparisonEntry {
  label: string
}

interface ComparisonMethod {
  title: string
  entries: ComparisonEntry[]
  note: string
}

interface TransferComparisonProps {
  left: ComparisonMethod
  right: ComparisonMethod
}

export function TransferComparison({ left, right }: TransferComparisonProps) {
  return (
    <div className={styles.comparison}>
      <div className={styles.method}>
        <div className={styles.title}>{left.title}</div>
        <div className={styles.entries}>
          {left.entries.map((entry, i) => (
            <div key={i} className={styles.entry}>
              {entry.label}
            </div>
          ))}
        </div>
        <div className={styles.note}>{left.note}</div>
      </div>
      <div className={styles.method}>
        <div className={styles.title}>{right.title}</div>
        <div className={styles.entries}>
          {right.entries.map((entry, i) => (
            <div key={i} className={styles.entry}>
              {entry.label}
            </div>
          ))}
        </div>
        <div className={styles.note}>{right.note}</div>
      </div>
    </div>
  )
}

// Default data
export const defaultTransferSentences: Sentence[] = [
  { text: '"the cat sat on the mat"', highlight: 'cat', count: '×847', seen: true },
  { text: '"the dog ran in the yard"', highlight: 'dog', count: '×612', seen: true },
  { text: '"the dog sat on the mat"', highlight: 'dog', count: '×0', seen: false },
]

export const defaultTransferComparison: TransferComparisonProps = {
  left: {
    title: 'Count-Based View',
    entries: [
      { label: '"cat" = symbol #7' },
      { label: '"dog" = symbol #12' },
      { label: '"rat" = symbol #89' },
    ],
    note: 'Arbitrary IDs. No relation between them.',
  },
  right: {
    title: 'Usage Patterns',
    entries: [
      { label: '"cat" → appears after "the", before verbs' },
      { label: '"dog" → appears after "the", before verbs' },
      { label: '"rat" → appears after "the", before verbs' },
    ],
    note: 'Identical contexts. Functionally similar!',
  },
}
