import { useEffect, useMemo, useState } from 'react'
import styles from './DotProductViz.module.css'

const VOCAB = [
  ' ',
  'a',
  'b',
  'c',
  'd',
  'e',
  'f',
  'g',
  'h',
  'i',
  'j',
  'k',
  'l',
  'm',
  'n',
  'o',
  'p',
  'q',
  'r',
  's',
  't',
  'u',
  'v',
  'w',
  'x',
  'y',
  'z',
]

const DEFAULT_CORPUS = `it is a truth universally acknowledged that a single man in possession of a good fortune must be in want of a wife

the quick brown fox jumps over the lazy dog`

function prettyChar(c: string): string {
  return c === ' ' ? '␣' : c
}

function normalizeToVocab(text: string): string {
  const lower = text.toLowerCase()
  let out = ''
  let lastWasSpace = true

  for (const ch of lower) {
    const isLetter = ch >= 'a' && ch <= 'z'
    if (isLetter) {
      out += ch
      lastWasSpace = false
      continue
    }

    if (!lastWasSpace) {
      out += ' '
      lastWasSpace = true
    }
  }

  return out.trim()
}

function makeVocabIndex(vocab: string[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (let i = 0; i < vocab.length; i++) out[vocab[i]] = i
  return out
}

function topKFromDistribution(
  probs: number[],
  vocab: string[],
  k: number,
): { char: string; p: number }[] {
  return vocab
    .map((char, idx) => ({ char, p: probs[idx] }))
    .filter(x => x.p > 0)
    // For teaching: prefer letters over space when there’s a tie-ish.
    .sort((a, b) => {
      if (b.p !== a.p) return b.p - a.p
      if (a.char === ' ') return 1
      if (b.char === ' ') return -1
      return a.char.localeCompare(b.char)
    })
    .slice(0, k)
}

function dot(a: number[], b: number[]): number {
  let s = 0
  for (let i = 0; i < a.length; i++) s += a[i] * b[i]
  return s
}

function l2Distance(a: number[], b: number[]): number {
  let s = 0
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i]
    s += d * d
  }
  return Math.sqrt(s)
}

function buildNextCharDistributions(text: string): {
  nextProbs: number[][]
  counts: number[][]
  charCounts: number[]
} {
  const vocabIndex = makeVocabIndex(VOCAB)
  const v = VOCAB.length

  const counts = Array.from({ length: v }, () => new Array(v).fill(0))
  const charCounts = new Array(v).fill(0)

  for (const ch of text) {
    const idx = vocabIndex[ch]
    if (idx !== undefined) charCounts[idx]++
  }

  for (let i = 0; i < text.length - 1; i++) {
    const a = vocabIndex[text[i]]
    const b = vocabIndex[text[i + 1]]
    if (a === undefined || b === undefined) continue
    counts[a][b]++
  }

  // Add-one smoothing so every character has a full distribution
  const smoothing = 1
  const nextProbs = counts.map(row => {
    const smoothed = row.map(x => x + smoothing)
    const sum = smoothed.reduce((acc, x) => acc + x, 0)
    return smoothed.map(x => x / sum)
  })

  return { nextProbs, counts, charCounts }
}

type Contribution = {
  char: string
  pa: number
  pb: number
  contrib: number
}

function topContributions(
  pa: number[],
  pb: number[],
  vocab: string[],
  k: number,
): { top: Contribution[]; rest: number } {
  const all = vocab.map((char, i) => ({
    char,
    pa: pa[i],
    pb: pb[i],
    contrib: pa[i] * pb[i],
  }))

  all.sort((x, y) => {
    if (y.contrib !== x.contrib) return y.contrib - x.contrib
    if (x.char === ' ') return 1
    if (y.char === ' ') return -1
    return x.char.localeCompare(y.char)
  })

  // Space is often a dominant “match” term for English text. That’s true, but it can
  // crowd out the interesting story. We still include space in the total; we just
  // don’t force it into the top teaching examples unless it’s the only option.
  const lettersFirst = all.filter((x) => x.char !== ' ')
  const top = lettersFirst.slice(0, k)
  const total = all.reduce((acc, x) => acc + x.contrib, 0)
  const topSum = top.reduce((acc, x) => acc + x.contrib, 0)
  const rest = Math.max(0, total - topSum)
  return { top, rest }
}

type Preset = { label: string; a: string; b: string }

const PRESETS: Preset[] = [
  { label: 'vowels', a: 'a', b: 'e' },
  { label: 'rare pair', a: 'q', b: 'u' },
  { label: 'far apart', a: 'a', b: 'z' },
  { label: 'space + t', a: ' ', b: 't' },
]

type DotProductVizProps = {
  corpus?: string
  onCorpusChange?: (next: string) => void
  showCorpusEditor?: boolean
  charA?: string
  charB?: string
  onCharAChange?: (next: string) => void
  onCharBChange?: (next: string) => void
}

export function DotProductViz({
  corpus,
  onCorpusChange,
  showCorpusEditor = true,
  charA: controlledCharA,
  charB: controlledCharB,
  onCharAChange,
  onCharBChange,
}: DotProductVizProps) {
  const [internalCorpus, setInternalCorpus] = useState(DEFAULT_CORPUS)
  const rawCorpus = corpus ?? internalCorpus
  const isReadOnly = corpus !== undefined && !onCorpusChange

  function setRawCorpus(next: string) {
    if (corpus === undefined) {
      setInternalCorpus(next)
      return
    }

    onCorpusChange?.(next)
  }

  const [internalCharA, setInternalCharA] = useState('a')
  const [internalCharB, setInternalCharB] = useState('e')

  const charA = controlledCharA ?? internalCharA
  const charB = controlledCharB ?? internalCharB

  function setCharA(next: string) {
    if (controlledCharA === undefined) {
      setInternalCharA(next)
      return
    }
    onCharAChange?.(next)
  }

  function setCharB(next: string) {
    if (controlledCharB === undefined) {
      setInternalCharB(next)
      return
    }
    onCharBChange?.(next)
  }

  const normalized = useMemo(() => normalizeToVocab(rawCorpus), [rawCorpus])
  const { nextProbs, charCounts } = useMemo(
    () => buildNextCharDistributions(normalized),
    [normalized],
  )

  const vocabIndex = useMemo(() => makeVocabIndex(VOCAB), [])

  const aIdx = vocabIndex[charA]
  const bIdx = vocabIndex[charB]

  const pa = nextProbs[aIdx]
  const pb = nextProbs[bIdx]

  const score = dot(pa, pb)
  const l2 = useMemo(() => l2Distance(pa, pb), [pa, pb])
  const { top, rest } = useMemo(
    () => topContributions(pa, pb, VOCAB, 8),
    [pa, pb],
  )

  const topNextA = useMemo(() => topKFromDistribution(pa, VOCAB, 3), [pa])
  const topNextB = useMemo(() => topKFromDistribution(pb, VOCAB, 3), [pb])

  const countA = charCounts[aIdx]
  const countB = charCounts[bIdx]

  const baseline = 1 / VOCAB.length
  const scaleMax = Math.max(baseline * 4, score * 1.15)
  const fillPercent = Math.min(100, (score / scaleMax) * 100)
  const baselinePercent = Math.min(100, (baseline / scaleMax) * 100)
  const ratio = score / baseline
  const scoreSafe = Math.max(1e-12, score)
  const defaultDemoChar = top[0]?.char ?? ' '
  const [demoChar, setDemoChar] = useState(() => defaultDemoChar)
  const [metric, setMetric] = useState<'dot' | 'euclidean'>('dot')
  const [toyScale, setToyScale] = useState(4)

  useEffect(() => {
    setDemoChar(defaultDemoChar)
  }, [defaultDemoChar])

  const demoIdx = vocabIndex[demoChar] ?? 0
  const demoPa = pa[demoIdx]
  const demoPb = pb[demoIdx]
  const demoContrib = demoPa * demoPb
  const demoShare = demoContrib / scoreSafe

  const l2Max = Math.SQRT2
  const l2FillPercent = Math.min(100, (l2 / l2Max) * 100)

  const isDot = metric === 'dot'
  const scoreTitle = isDot ? 'P(match)' : 'L2 distance'
  const scoreValue = isDot ? score.toFixed(4) : l2.toFixed(4)

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.title}>Dot Product: Overlap</span>
        <span className={styles.subtitle}>
          Draw one next-character from A and one from B. <strong>dot(A, B)</strong> is <strong>P(match)</strong>.
        </span>
      </div>

      {showCorpusEditor && (
        <div className={styles.corpusSection}>
          <div className={styles.corpusTopRow}>
            <span className={styles.corpusLabel}>Corpus</span>
            <span className={styles.corpusStats}>{normalized.length.toLocaleString()} chars</span>
          </div>
          <textarea
            className={styles.corpusInput}
            value={rawCorpus}
            onChange={(e) => setRawCorpus(e.target.value)}
            rows={3}
            spellCheck={false}
            readOnly={isReadOnly}
          />
          <div className={styles.corpusHint}>
            Only <code>a–z</code> and spaces are used. Everything else becomes a space.
          </div>
        </div>
      )}

      <div className={styles.controls}>
        <div className={styles.pickers}>
          <label className={styles.picker}>
            <span className={`${styles.pickerLabel} ${styles.pickerLabelA}`}>A</span>
            <select
              className={`${styles.select} ${styles.selectA}`}
              value={charA}
              onChange={(e) => setCharA(e.target.value)}
            >
              {VOCAB.map(c => (
                <option key={c} value={c}>
                  {prettyChar(c)}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.picker}>
            <span className={`${styles.pickerLabel} ${styles.pickerLabelB}`}>B</span>
            <select
              className={`${styles.select} ${styles.selectB}`}
              value={charB}
              onChange={(e) => setCharB(e.target.value)}
            >
              {VOCAB.map(c => (
                <option key={c} value={c}>
                  {prettyChar(c)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className={styles.presets}>
          <span className={styles.presetsLabel}>Try:</span>
          {PRESETS.map(p => (
            <button
              key={p.label}
              className={styles.presetBtn}
              onClick={() => {
                setCharA(p.a)
                setCharB(p.b)
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.summary}>
        <div className={styles.summaryLeft}>
          <div className={styles.pairLine}>
            <span className={`${styles.badge} ${styles.badgeA}`}>{prettyChar(charA)}</span>
            <span className={styles.symbol}>·</span>
            <span className={`${styles.badge} ${styles.badgeB}`}>{prettyChar(charB)}</span>
          </div>
          <div className={styles.detailLine}>
            Pair counts: {prettyChar(charA)}→* = {countA.toLocaleString()}× · {prettyChar(charB)}→* ={' '}
            {countB.toLocaleString()}×
          </div>
          <div className={styles.topNextRow}>
            <span className={`${styles.topNextLabel} ${styles.topNextLabelA}`}>
              Top next after {prettyChar(charA)}
            </span>
            <div className={styles.topNextChips}>
              {topNextA.length === 0 ? (
                <span className={styles.topNextEmpty}>—</span>
              ) : (
                topNextA.map(x => (
                  <span key={x.char} className={`${styles.chip} ${styles.chipA}`}>
                    <span className={styles.chipChar}>{prettyChar(x.char)}</span>
                    <span className={styles.chipPct}>{(x.p * 100).toFixed(0)}%</span>
                  </span>
                ))
              )}
            </div>
          </div>
          <div className={styles.note}>
            Tip: spaces are often the most common “next character.” That’s real — but for the chips we usually show letters
            so you can see the language patterns.
          </div>
          <div className={styles.topNextRow}>
            <span className={`${styles.topNextLabel} ${styles.topNextLabelB}`}>
              Top next after {prettyChar(charB)}
            </span>
            <div className={styles.topNextChips}>
              {topNextB.length === 0 ? (
                <span className={styles.topNextEmpty}>—</span>
              ) : (
                topNextB.map(x => (
                  <span key={x.char} className={`${styles.chip} ${styles.chipB}`}>
                    <span className={styles.chipChar}>{prettyChar(x.char)}</span>
                    <span className={styles.chipPct}>{(x.p * 100).toFixed(0)}%</span>
                  </span>
                ))
              )}
            </div>
          </div>
        </div>

        <div className={styles.summaryRight}>
          <div className={styles.metricSwitch}>
            <button
              type="button"
              className={`${styles.metricBtn} ${isDot ? styles.metricBtnActive : ''}`}
              onClick={() => setMetric('dot')}
            >
              dot
            </button>
            <button
              type="button"
              className={`${styles.metricBtn} ${!isDot ? styles.metricBtnActive : ''}`}
              onClick={() => setMetric('euclidean')}
            >
              euclidean
            </button>
          </div>
          <div className={styles.scoreLabel}>
            <strong>{scoreTitle}</strong> {isDot ? '= dot(A, B)' : ''}
            <div className={styles.scoreSublabel}>
              {isDot ? (
                <>
                  = Σ p<sub>i</sub>(A) · p<sub>i</sub>(B)
                </>
              ) : (
                '= ||A − B||₂ (lower is closer)'
              )}
            </div>
          </div>
          <div className={styles.scoreValue}>{scoreValue}</div>
          <div className={styles.gauge}>
            <div className={styles.gaugeTrack}>
              <div
                className={styles.gaugeFill}
                style={{ width: `${isDot ? fillPercent : l2FillPercent}%` }}
              />
              {isDot && (
                <div className={styles.gaugeBaseline} style={{ left: `${baselinePercent}%` }} />
              )}
            </div>
            <div className={styles.gaugeMeta}>
              <span className={styles.gaugeLeft}>0</span>
              <span className={styles.gaugeMid}>
                {isDot ? `baseline = 1/V (${baseline.toFixed(3)})` : `max ≈ √2 (${l2Max.toFixed(3)})`}
              </span>
              <span className={styles.gaugeRight}>≈ {isDot ? scaleMax.toFixed(3) : l2Max.toFixed(3)}</span>
            </div>
          </div>
          <div className={styles.scoreHint}>
            {isDot ? (
              <>Higher means “more likely to match” (≈ {ratio.toFixed(1)}× uniform).</>
            ) : (
              <>Lower means “more similar” (0 would be identical fingerprints).</>
            )}
            <div className={styles.scoreSubhint}>
              {isDot
                ? 'This is the “two weighted dice” view: one roll from A, one roll from B.'
                : 'Distance is a different question: how far apart are the two distributions, coordinate by coordinate?'}
            </div>
          </div>

          {!isDot && (
            <div className={styles.metricToy}>
              <div className={styles.metricToyTitle}>Counterexample (embeddings): same direction, different length</div>
              <div className={styles.metricToySliderRow}>
                <span className={styles.metricToyLabel}>scale</span>
                <input
                  className={styles.metricToySlider}
                  type="range"
                  min={0.5}
                  max={6}
                  step={0.1}
                  value={toyScale}
                  onChange={(e) => setToyScale(parseFloat(e.target.value))}
                />
                <span className={styles.metricToyValue}>{toyScale.toFixed(1)}×</span>
              </div>
              <div className={styles.metricToyGrid}>
                <div className={styles.metricToyCell}>
                  u = <code>[0.6, 0.8]</code>
                </div>
                <div className={styles.metricToyCell}>
                  v = <code>{toyScale.toFixed(1)}×u</code>
                </div>
                <div className={styles.metricToyCell}>
                  dot(u, v) = <strong>{toyScale.toFixed(2)}</strong>
                </div>
                <div className={styles.metricToyCell}>
                  ||u − v||₂ = <strong>{Math.abs(toyScale - 1).toFixed(2)}</strong>
                </div>
              </div>
              <div className={styles.metricToyNote}>
                u and v point the same way. Euclidean grows with the length mismatch. Dot stays large because the alignment is perfect.
              </div>
            </div>
          )}
        </div>
      </div>

      <details className="collapsible">
        <summary>Optional: how dot(A, B) becomes a probability</summary>
        <div className={styles.breakdown}>
          <div className={styles.termDemo}>
            <div className={styles.termDemoHeader}>
              <div className={styles.termDemoTitle}>One way to match</div>
              <div className={styles.termDemoControls}>
                <label className={styles.termDemoPicker}>
                  <span className={styles.termDemoPickerLabel}>Match on</span>
                  <select
                    className={styles.termDemoSelect}
                    value={demoChar}
                    onChange={(e) => setDemoChar(e.target.value)}
                  >
                    {VOCAB.map(c => (
                      <option key={c} value={c}>
                        {prettyChar(c)}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  className={styles.termDemoBtn}
                  onClick={() => setDemoChar(defaultDemoChar)}
                  title="Pick the biggest term in the sum"
                >
                  biggest term
                </button>
              </div>
            </div>

            <div className={styles.termRows}>
              <div className={styles.termRow}>
                <div className={styles.termLabel}>P(next = {prettyChar(demoChar)} | {prettyChar(charA)})</div>
                <div className={styles.termBarTrack}>
                  <div className={styles.termBarA} style={{ width: `${Math.min(100, demoPa * 100)}%` }} />
                </div>
                <div className={styles.termValue}>{(demoPa * 100).toFixed(1)}%</div>
              </div>

              <div className={styles.termRow}>
                <div className={styles.termLabel}>P(next = {prettyChar(demoChar)} | {prettyChar(charB)})</div>
                <div className={styles.termBarTrack}>
                  <div className={styles.termBarB} style={{ width: `${Math.min(100, demoPb * 100)}%` }} />
                </div>
                <div className={styles.termValue}>{(demoPb * 100).toFixed(1)}%</div>
              </div>

              <div className={`${styles.termRow} ${styles.termRowMatch}`}>
                <div className={styles.termLabel}>
                  P(match on {prettyChar(demoChar)}) = P_A · P_B
                  <div className={styles.termMeta}>
                    {demoPa.toFixed(3)}×{demoPb.toFixed(3)} = <strong>{demoContrib.toFixed(4)}</strong> (
                    {(demoShare * 100).toFixed(1)}% of dot)
                  </div>
                </div>
                <div className={styles.termBarTrack}>
                  <div className={styles.termBarMatch} style={{ width: `${Math.min(100, demoShare * 100)}%` }} />
                </div>
                <div className={styles.termValue}>{(demoShare * 100).toFixed(1)}%</div>
              </div>
            </div>
          </div>

          <details className={styles.details}>
            <summary className={styles.detailsSummary}>
              <span className={styles.detailsSummaryLeft}>
                <span className={styles.detailsCaret} aria-hidden="true">
                  ▸
                </span>
                <span className={styles.detailsTitle}>Full breakdown (27 terms)</span>
              </span>
              <span className={styles.detailsMeta}>
                Σ p<sub>i</sub>(A)·p<sub>i</sub>(B)
              </span>
            </summary>
            <div className={styles.detailsBody}>
              <div className={styles.contribs}>
                <div className={styles.contribsTitle}>All the ways to match (add them up)</div>
                <div className={styles.contribsNote}>
                  A match has to happen on <em>some</em> character. For each character <code>i</code>, the match chance is{' '}
                  <code>p_i(A)·p_i(B)</code>. Add every row and you get <code>dot(A,B)</code>.
                </div>
                {top.map((item) => {
                  const share = item.contrib / scoreSafe
                  return (
                    <div key={item.char} className={styles.contribRow}>
                      <span className={styles.contribChar}>{prettyChar(item.char)}</span>
                      <div className={styles.contribBarTrack}>
                        <div
                          className={styles.contribBar}
                          style={{ width: `${Math.min(100, share * 100)}%` }}
                        />
                      </div>
                      <div className={styles.contribMath}>
                        <div>
                          <span className={styles.probA}>{item.pa.toFixed(3)}</span>
                          <span className={styles.times}>×</span>
                          <span className={styles.probB}>{item.pb.toFixed(3)}</span>
                          <span className={styles.equals}>=</span>
                          <span className={styles.contribValue}>{item.contrib.toFixed(4)}</span>
                        </div>
                        <div className={styles.contribShare}>{(share * 100).toFixed(1)}% of dot</div>
                      </div>
                    </div>
                  )
                })}
                <div className={styles.contribRow}>
                  <span className={styles.contribChar}>…</span>
                  <div className={styles.contribBarTrack}>
                    <div
                      className={styles.contribBarMuted}
                      style={{ width: `${Math.min(100, (rest / scoreSafe) * 100)}%` }}
                    />
                  </div>
                  <div className={styles.contribMath}>
                    <div>
                      rest <span className={styles.equals}>=</span>{' '}
                      <span className={styles.contribValue}>{rest.toFixed(4)}</span>
                    </div>
                    <div className={styles.contribShare}>{((rest / scoreSafe) * 100).toFixed(1)}% of dot</div>
                  </div>
                </div>
              </div>
            </div>
          </details>

          <details className={styles.details}>
            <summary className={styles.detailsSummary}>
              <span className={styles.detailsSummaryLeft}>
                <span className={styles.detailsCaret} aria-hidden="true">
                  ▸
                </span>
                <span className={styles.detailsTitle}>Corpus examples</span>
              </span>
              <span className={styles.detailsMeta}>“show me where”</span>
            </summary>
            <div className={styles.detailsBody}>
              <div className={styles.breakdownSection}>
                <div className={styles.breakdownTitle}>A few overlaps you can point at</div>
                <div className={styles.breakdownNote}>
                  These are the biggest terms above, plus one concrete example from the corpus.
                </div>

                {top.slice(0, 3).map(item => {
                  const contextLabel = (c: string) => (c === ' ' ? 'after space' : `after '${prettyChar(c)}'`)

                  const findExample = (context: string, next: string) => {
                    if (context === ' ' && next !== ' ') {
                      const rx = new RegExp(`\\b${next}\\w*\\b`, 'i')
                      return rawCorpus.match(rx)?.[0] || `...${prettyChar(context)}${prettyChar(next)}...`
                    }

                    if (next === ' ' && context !== ' ') {
                      const rx = new RegExp(`\\b\\w*${context}\\b`, 'i')
                      return rawCorpus.match(rx)?.[0] || `...${prettyChar(context)}${prettyChar(next)}...`
                    }

                    if (context !== ' ' && next !== ' ') {
                      const rx = new RegExp(`\\b\\w*${context}${next}\\w*\\b`, 'i')
                      return rawCorpus.match(rx)?.[0] || `...${prettyChar(context)}${prettyChar(next)}...`
                    }

                    return `...${prettyChar(context)}${prettyChar(next)}...`
                  }

                  const matchA = findExample(charA, item.char)
                  const matchB = findExample(charB, item.char)
                  const share = item.contrib / scoreSafe

                  return (
                    <div key={item.char} className={styles.evidenceRow}>
                      <div className={styles.evidenceTrait}>
                        Both give <strong>'{prettyChar(item.char)}'</strong> non-trivial probability.
                      </div>
                      <div className={styles.evidenceMath}>
                        <span className={styles.probA}>{item.pa.toFixed(3)}</span>
                        <span className={styles.times}>×</span>
                        <span className={styles.probB}>{item.pb.toFixed(3)}</span>
                        <span className={styles.equals}>=</span>
                        <span className={styles.contribVal}>{item.contrib.toFixed(4)}</span>
                        <span className={styles.contribPct}>{(share * 100).toFixed(1)}% of dot</span>
                      </div>

                      <div className={styles.evidenceProof}>
                        <div className={styles.proofItem}>
                          <span className={styles.proofLabel}>{contextLabel(charA)}:</span>
                          <code className={styles.proofWord}>{matchA}</code>
                        </div>
                        <div className={styles.proofItem}>
                          <span className={styles.proofLabel}>{contextLabel(charB)}:</span>
                          <code className={styles.proofWord}>{matchB}</code>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </details>
        </div>
      </details>

      <div className={styles.footer}>
        <strong>Interpretation:</strong> imagine rolling two weighted dice. Die A rolls using “what follows '{prettyChar(charA)}'”.
        Die B rolls using “what follows '{prettyChar(charB)}'”. The dot product is the probability they land on the same character.
      </div>
    </div>
  )
}
