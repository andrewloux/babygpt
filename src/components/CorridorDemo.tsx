import { useCallback, useMemo, useState } from 'react'
import styles from './CorridorDemo.module.css'

const DEFAULT_CORPUS = ['cat sat', 'dog ran', 'a can', 'a cat']
const MAX_LEN = 12

function cleanText(s: string): string {
  return s.toLowerCase().replace(/[^a-z ]/g, '')
}

function prettyChar(ch: string): string {
  if (ch === ' ') return '␣'
  return ch
}

function countPrefix(corpus: string[], prefix: string): number {
  if (prefix.length === 0) return corpus.length
  return corpus.reduce((acc, sentence) => acc + (sentence.startsWith(prefix) ? 1 : 0), 0)
}

type NextCharRow = {
  char: string
  count: number
  prob: number
}

function nextCharDistribution(corpus: string[], prefix: string): NextCharRow[] {
  const matches = corpus.filter((s) => s.startsWith(prefix))
  const total = matches.length
  if (total === 0) return []

  const counts = new Map<string, number>()
  for (const sentence of matches) {
    const idx = prefix.length
    if (idx >= sentence.length) continue
    const ch = sentence[idx]
    counts.set(ch, (counts.get(ch) ?? 0) + 1)
  }

  return Array.from(counts.entries())
    .map(([char, count]) => ({ char, count, prob: count / total }))
    .sort((a, b) => b.count - a.count || a.char.localeCompare(b.char))
}

interface CorridorRow {
  prefix: string
  probability: number
  count: number
}

type CorridorDemoProps = {
  corpus?: string[]
}

export function CorridorDemo({ corpus = DEFAULT_CORPUS }: CorridorDemoProps) {
  const [input, setInput] = useState('')

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setInput(cleanText(e.target.value).slice(0, MAX_LEN))
    },
    []
  )

  const normalizedCorpus = useMemo(() => corpus.map(cleanText), [corpus])
  const N = normalizedCorpus.length

  const rows = useMemo((): CorridorRow[] => {
    const result: CorridorRow[] = [{ prefix: '', count: N, probability: 1 }]
    for (let i = 0; i < input.length; i++) {
      const prefix = input.slice(0, i + 1)
      const count = countPrefix(normalizedCorpus, prefix)
      result.push({ prefix, count, probability: N === 0 ? 0 : count / N })
    }
    return result
  }, [N, input, normalizedCorpus])

  const steps = useMemo(() => {
    const s: {
      context: string
      nextChar: string
      countContext: number
      countExtended: number
      prob: number
    }[] = []

    for (let i = 0; i < input.length; i++) {
      const context = input.slice(0, i)
      const nextChar = input[i]
      const countContext = countPrefix(normalizedCorpus, context)
      const countExtended = countPrefix(normalizedCorpus, context + nextChar)
      const prob = countContext === 0 ? 0 : countExtended / countContext
      s.push({ context, nextChar, countContext, countExtended, prob })
    }

    return s
  }, [input, normalizedCorpus])

  const lastRow = rows[rows.length - 1]
  const cumulativeProb = lastRow ? lastRow.probability : 0
  const prefixCount = lastRow ? lastRow.count : 0

  const nextChars = useMemo(
    () => nextCharDistribution(normalizedCorpus, input).slice(0, 7),
    [input, normalizedCorpus]
  )

  const appendChar = useCallback(
    (ch: string) => {
      if (input.length >= MAX_LEN) return
      setInput((prev) => (prev + ch).slice(0, MAX_LEN))
    },
    [input.length]
  )

  const corpusLines = useMemo(() => {
    return normalizedCorpus.map((sentence, idx) => {
      const matches = input.length === 0 || sentence.startsWith(input)

      if (!matches) {
        return (
          <div key={`${idx}-${sentence}`} className={styles.sentence}>
            <span className={styles.lineNum}>{idx + 1}</span>
            <span className={`${styles.sentenceText} ${styles.dimText}`}>{sentence}</span>
          </div>
        )
      }

      if (input.length === 0) {
        return (
          <div key={`${idx}-${sentence}`} className={styles.sentence}>
            <span className={styles.lineNum}>{idx + 1}</span>
            <span className={styles.sentenceText}>{sentence}</span>
          </div>
        )
      }

      return (
        <div key={`${idx}-${sentence}`} className={styles.sentence}>
          <span className={styles.lineNum}>{idx + 1}</span>
          <span className={styles.sentenceText}>
            <span className={styles.highlight}>{sentence.slice(0, input.length)}</span>
            <span className={styles.dimText}>{sentence.slice(input.length)}</span>
          </span>
        </div>
      )
    })
  }, [input, normalizedCorpus])

  return (
    <div className={styles.demo}>
      <div className={styles.header}>
        <div className={styles.dots}>
          <div className={`${styles.dot} ${styles.red}`} />
          <div className={`${styles.dot} ${styles.yellow}`} />
          <div className={`${styles.dot} ${styles.green}`} />
        </div>
        <span className={styles.title}>counts_from_corpus.js — Live Demo</span>
      </div>
      <div className={styles.body}>
        <div className={styles.corpus}>
          <div className={styles.corpusLabel}>Training corpus (toy)</div>
          {corpusLines}
        </div>

        <label className={styles.label}>Type a prefix (try: a ca)</label>
        <input
          type="text"
          className={styles.input}
          value={input}
          onChange={handleChange}
          maxLength={MAX_LEN}
          placeholder="Start typing..."
        />

        <div className={styles.statsRow}>
          <div className={styles.stat}>
            <span className={styles.statLabel}>C(prefix):</span>{' '}
            <span className={styles.statValue}>
              {prefixCount}/{N}
            </span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>P(prefix):</span>{' '}
            <span className={styles.statValue}>{(cumulativeProb * 100).toFixed(1)}%</span>
          </div>
        </div>

        <div className={styles.main}>
          <div className={styles.viz}>
            {rows.map((row, index) => (
              <div key={index} className={styles.row}>
                <div className={styles.barContainer}>
                  <div
                    className={styles.bar}
                    style={{
                      width:
                        row.probability === 0
                          ? '0%'
                          : `${Math.max(row.probability * 100, 0.5)}%`,
                    }}
                  />
                </div>
                <div className={styles.labelRow}>
                  <span className={styles.text}>
                    {row.prefix
                      ? `Sentences starting with "${row.prefix}"`
                      : 'All sentences'}
                  </span>
                  <span className={styles.prob}>
                    {row.count}/{N}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className={styles.nextSection}>
            <div className={styles.nextHeader}>
              <div className={styles.nextTitle}>Next character</div>
              <div className={styles.nextSubtitle}>computed from matching sentences</div>
            </div>

            {nextChars.length === 0 ? (
              <div className={styles.nextEmpty}>
                {prefixCount === 0
                  ? 'No sentences match this prefix.'
                  : 'No next character (you hit the end of a training sentence).'}
              </div>
            ) : (
              <div className={styles.nextList}>
                {nextChars.map((row) => (
                  <button
                    key={row.char}
                    className={styles.nextOption}
                    onClick={() => appendChar(row.char)}
                    type="button"
                  >
                    <span className={styles.nextChar}>{prettyChar(row.char)}</span>
                    <div className={styles.nextBarContainer} aria-hidden="true">
                      <div
                        className={styles.nextBar}
                        style={{ width: `${row.prob * 100}%` }}
                      />
                    </div>
                    <span className={styles.nextProb}>
                      {row.count}/{prefixCount} = {row.prob.toFixed(2)}
                    </span>
                  </button>
                ))}
              </div>
            )}

            <div className={styles.suggestions}>
              <span className={styles.suggestLabel}>Try:</span>
              {['cat', 'dog', 'a', 'a ', 'a ca', 'a cat', 'a can'].map((s) => (
                <button
                  key={s}
                  className={styles.suggestBtn}
                  onClick={() => setInput(s)}
                  type="button"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.formula}>
          {input.length === 0 ? (
            <span className={styles.formulaResult}>
              Type to see the corridor narrow...
            </span>
          ) : (
            <span className={styles.formulaResult}>
              {steps.map((s, i) => (
                <span key={`${s.context}-${s.nextChar}-${i}`}>
                  <span className={styles.probTerm}>
                    {s.countExtended}/{s.countContext}
                  </span>
                  {i < steps.length - 1 && ' × '}
                </span>
              ))}{' '}
              <span className={styles.equals}>=</span>
              <span className={styles.final}>
                {prefixCount}/{N} ({(cumulativeProb * 100).toFixed(1)}%) of this corpus
              </span>
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
