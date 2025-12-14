import styles from './NgramExamples.module.css'

interface NgramRow {
  name: string
  examples: string[]
}

interface NgramExamplesProps {
  rows?: NgramRow[]
}

const defaultRows: NgramRow[] = [
  { name: '1-gram (unigram):', examples: ['"c"', '"a"', '"t"'] },
  { name: '2-gram (bigram):', examples: ['"ca"', '"at"', '"th"'] },
  { name: '3-gram (trigram):', examples: ['"cat"', '"the"', '"sat"'] },
]

export function NgramExamples({ rows = defaultRows }: NgramExamplesProps) {
  return (
    <div className={styles.container}>
      {rows.map((row, index) => (
        <div key={index} className={styles.row}>
          <span className={styles.name}>{row.name}</span>
          {row.examples.map((example, i) => (
            <code key={i} className={styles.example}>
              {example}
            </code>
          ))}
        </div>
      ))}
    </div>
  )
}
