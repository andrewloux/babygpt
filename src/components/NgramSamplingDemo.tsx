import { useCallback, useMemo, useState } from 'react'
import styles from './NgramSamplingDemo.module.css'
import { VOCAB, prettyChar } from '../data/characterData'

function cleanText(s: string): string {
  return s.toLowerCase().replace(/[^a-z ]/g, ' ')
}

function leftPadSpaces(s: string, targetLen: number): string {
  if (s.length >= targetLen) return s
  return ' '.repeat(targetLen - s.length) + s
}

function prettyString(s: string): string {
  if (s.length === 0) return '∅'
  return Array.from(s).map((c) => prettyChar(c)).join('')
}

function sampleIndex(weights: number[]): number {
  const total = weights.reduce((acc, w) => acc + w, 0)
  if (total <= 0) return 0
  const r = Math.random() * total
  let acc = 0
  for (let i = 0; i < weights.length; i++) {
    acc += weights[i]
    if (r <= acc) return i
  }
  return weights.length - 1
}

type CountsRow = Uint32Array

type NgramModel = {
  maxContextLen: number
  countsByLen: Map<string, CountsRow>[]
}

function buildModel(text: string, maxContextLen: number): NgramModel {
  const countsByLen: Map<string, CountsRow>[] = Array.from({ length: maxContextLen + 1 }, () => new Map())
  const padded = ' '.repeat(maxContextLen) + text
  const charToIndex = new Map<string, number>()
  for (let i = 0; i < VOCAB.length; i++) charToIndex.set(VOCAB[i], i)

  for (let pos = maxContextLen; pos < padded.length; pos++) {
    const nextChar = padded[pos]
    const nextIdx = charToIndex.get(nextChar)
    if (nextIdx === undefined) continue

    for (let k = 0; k <= maxContextLen; k++) {
      const ctx = k === 0 ? '' : padded.slice(pos - k, pos)
      let row = countsByLen[k].get(ctx)
      if (!row) {
        row = new Uint32Array(VOCAB.length)
        countsByLen[k].set(ctx, row)
      }
      row[nextIdx] += 1
    }
  }
  return { maxContextLen, countsByLen }
}

type LookupResult = { row: CountsRow; usedContext: string; usedLen: number }

function lookupNextCounts(model: NgramModel, contextWindow: string, backoff: boolean): LookupResult | null {
  const kMax = model.maxContextLen
  const window = kMax === 0 ? '' : contextWindow.slice(-kMax)

  if (!backoff) {
    const row = model.countsByLen[kMax].get(window)
    if (!row) return null
    return { row, usedContext: window, usedLen: kMax }
  }

  for (let k = kMax; k >= 0; k--) {
    const ctx = k === 0 ? '' : window.slice(kMax - k)
    const row = model.countsByLen[k].get(ctx)
    if (row) return { row, usedContext: ctx, usedLen: k }
  }
  return null
}

function countsToWeights(row: CountsRow, temperature: number): number[] {
  const total = row.reduce((acc, c) => acc + c, 0)
  if (total === 0) return new Array(row.length).fill(0)
  const t = Math.max(0.05, temperature)
  const invT = 1 / t
  const weights = new Array(row.length).fill(0)
  for (let i = 0; i < row.length; i++) {
    if (row[i] === 0) continue
    weights[i] = Math.pow(row[i] / total, invT)
  }
  return weights
}

type DistRow = { char: string; count: number; prob: number }

function rowToDist(row: CountsRow | undefined, topK: number = 8): DistRow[] {
  if (!row) return []
  const total = row.reduce((acc, c) => acc + c, 0)
  if (total === 0) return []
  return Array.from(row.entries())
    .filter(([, count]) => count > 0)
    .map(([idx, count]) => ({ char: VOCAB[idx] ?? ' ', count, prob: count / total }))
    .sort((a, b) => b.count - a.count || a.char.localeCompare(b.char))
    .slice(0, topK)
}

const DEFAULT_TEXT = cleanText(
  ['the cat sat on the mat', 'the cat ate the fish', 'a dog ran in the park', 'the bird sang a song', 'she sat on a chair'].join(' ')
)

export function NgramSamplingDemo() {
  const [trainingText, setTrainingText] = useState(DEFAULT_TEXT)
  const [order, setOrder] = useState(2)
  const [seed, setSeed] = useState('the ')
  const [genLen] = useState(100)
  const [temperature, setTemperature] = useState(0.9)
  const [backoff, setBackoff] = useState(true)
  const [output, setOutput] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [lookupContext, setLookupContext] = useState('x')

  const cleanedTraining = useMemo(() => cleanText(trainingText), [trainingText])
  const maxContextLen = Math.max(0, Math.min(6, order) - 1)
  const model = useMemo(() => buildModel(cleanedTraining, maxContextLen), [cleanedTraining, maxContextLen])

  const observedContexts = model.countsByLen[maxContextLen]?.size ?? 0
  const possibleContexts = useMemo(() => Math.pow(VOCAB.length, maxContextLen), [maxContextLen])

  const generate = useCallback(() => {
    const cleanedSeed = cleanText(seed)
    const startWindow = maxContextLen === 0 ? '' : leftPadSpaces(cleanedSeed, maxContextLen).slice(-maxContextLen)
    let window = startWindow
    let s = cleanedSeed

    for (let i = 0; i < genLen; i++) {
      const lookup = lookupNextCounts(model, window, backoff)
      if (!lookup) break
      const weights = countsToWeights(lookup.row, temperature)
      const idx = sampleIndex(weights)
      const nextChar = VOCAB[idx] ?? ' '
      s += nextChar
      window = maxContextLen === 0 ? '' : (window + nextChar).slice(-maxContextLen)
    }
    setOutput(s)
  }, [backoff, genLen, maxContextLen, model, seed, temperature])

  const lookupWindow = useMemo(() => {
    if (maxContextLen === 0) return ''
    const cleaned = cleanText(lookupContext)
    return leftPadSpaces(cleaned, maxContextLen).slice(-maxContextLen)
  }, [lookupContext, maxContextLen])

  const exactRow = useMemo(() => model.countsByLen[maxContextLen]?.get(lookupWindow), [lookupWindow, maxContextLen, model])
  const exactDist = useMemo(() => rowToDist(exactRow, 6), [exactRow])
  const backoffLookup = useMemo(() => lookupNextCounts(model, lookupWindow, true), [lookupWindow, model])
  const backoffDist = useMemo(() => rowToDist(backoffLookup?.row, 6), [backoffLookup])

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.dots}>
          <div className={`${styles.dot} ${styles.red}`} />
          <div className={`${styles.dot} ${styles.yellow}`} />
          <div className={`${styles.dot} ${styles.green}`} />
        </div>
        <div className={styles.title}>ngram_sampler.ts — Live Demo</div>
      </div>

      <div className={styles.body}>
        {/* Training Text */}
        <div className={styles.section}>
          <div className={styles.sectionLabel}>Training text</div>
          <textarea
            className={styles.textarea}
            value={trainingText}
            onChange={(e) => setTrainingText(e.target.value)}
            rows={3}
            spellCheck={false}
          />
        </div>

        {/* Controls Row */}
        <div className={styles.controlsRow}>
          <div className={styles.controlGroup}>
            <label className={styles.label}>
              n = <span className={styles.value}>{order}</span>
            </label>
            <input
              className={styles.slider}
              type="range"
              min={1}
              max={5}
              step={1}
              value={order}
              onChange={(e) => setOrder(parseInt(e.target.value, 10))}
            />
          </div>
          <div className={styles.controlGroup}>
            <label className={styles.label}>seed</label>
            <input
              className={styles.input}
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              placeholder="the "
            />
          </div>
          <div className={styles.buttons}>
            <button className={styles.buttonPrimary} onClick={generate}>Generate</button>
            <button className={styles.buttonSecondary} onClick={() => setOutput('')}>Clear</button>
          </div>
        </div>

        {/* Output */}
        <div className={styles.section}>
          <div className={styles.sectionLabel}>Output</div>
          <pre className={styles.output}>{output || '(click Generate)'}</pre>
        </div>

        {/* Advanced Toggle */}
        <button
          className={styles.advancedToggle}
          onClick={() => setShowAdvanced(!showAdvanced)}
          type="button"
        >
          <span className={styles.toggleIcon}>{showAdvanced ? '▾' : '▸'}</span>
          Advanced options
        </button>

        {/* Advanced Section */}
        {showAdvanced && (
          <div className={styles.advanced}>
            {/* Temperature & Backoff */}
            <div className={styles.advancedRow}>
              <div className={styles.controlGroup}>
                <label className={styles.label}>
                  temperature: <span className={styles.value}>{temperature.toFixed(2)}</span>
                </label>
                <input
                  className={styles.slider}
                  type="range"
                  min={0.2}
                  max={1.5}
                  step={0.05}
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                />
              </div>
              <label className={styles.toggle}>
                <input type="checkbox" checked={backoff} onChange={(e) => setBackoff(e.target.checked)} />
                <span>backoff when missing</span>
              </label>
            </div>

            {/* Stats */}
            <div className={styles.stats}>
              <span>observed contexts: <strong>{observedContexts}</strong></span>
              <span>possible: <strong>{possibleContexts}</strong></span>
              <span>coverage: <strong>{((observedContexts / possibleContexts) * 100).toFixed(2)}%</strong></span>
            </div>

            {/* Lookup Section */}
            <div className={styles.lookupSection}>
              <div className={styles.sectionLabel}>Context lookup</div>
              <div className={styles.lookupInput}>
                <input
                  className={styles.input}
                  value={lookupContext}
                  onChange={(e) => setLookupContext(e.target.value)}
                  placeholder="type context..."
                />
                <span className={styles.lookupHint}>
                  last {maxContextLen} chars: <code>"{prettyString(lookupWindow)}"</code>
                </span>
              </div>

              <div className={styles.lookupGrid}>
                <div className={styles.lookupCard}>
                  <div className={styles.lookupTitle}>
                    Exact lookup
                    <span className={exactDist.length > 0 ? styles.badgeFound : styles.badgeNotFound}>
                      {exactDist.length > 0 ? 'FOUND' : 'NOT FOUND'}
                    </span>
                  </div>
                  {exactDist.length > 0 ? (
                    <div className={styles.dist}>
                      {exactDist.map((row) => (
                        <div key={row.char} className={styles.distRow}>
                          <span className={styles.distChar}>{prettyChar(row.char)}</span>
                          <div className={styles.barTrack}>
                            <div className={styles.barFill} style={{ width: `${row.prob * 100}%` }} />
                          </div>
                          <span className={styles.distProb}>{(row.prob * 100).toFixed(0)}%</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className={styles.lookupEmpty}>No row for this context.</div>
                  )}
                </div>

                <div className={styles.lookupCard}>
                  <div className={styles.lookupTitle}>With backoff</div>
                  {backoffDist.length > 0 ? (
                    <>
                      <div className={styles.lookupNote}>
                        → context len {backoffLookup?.usedLen ?? 0}
                        {backoffLookup?.usedLen ? ` ("${prettyString(backoffLookup.usedContext)}")` : ' (unigram)'}
                      </div>
                      <div className={styles.dist}>
                        {backoffDist.map((row) => (
                          <div key={row.char} className={styles.distRow}>
                            <span className={styles.distChar}>{prettyChar(row.char)}</span>
                            <div className={styles.barTrack}>
                              <div className={styles.barFill} style={{ width: `${row.prob * 100}%` }} />
                            </div>
                            <span className={styles.distProb}>{(row.prob * 100).toFixed(0)}%</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className={styles.lookupEmpty}>No data.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
