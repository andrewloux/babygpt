import { useEffect, useMemo, useState } from 'react'
import { VizCard } from './VizCard'
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
  const [lastChanged, setLastChanged] = useState<'A' | 'B' | null>(null)
  const [glowPulse, setGlowPulse] = useState(false)

  const charA = controlledCharA ?? internalCharA
  const charB = controlledCharB ?? internalCharB

  function setCharA(next: string) {
    setLastChanged('A')
    if (controlledCharA === undefined) {
      setInternalCharA(next)
      return
    }
    onCharAChange?.(next)
  }

  function setCharB(next: string) {
    setLastChanged('B')
    if (controlledCharB === undefined) {
      setInternalCharB(next)
      return
    }
    onCharBChange?.(next)
  }

  const normalized = useMemo(() => normalizeToVocab(rawCorpus), [rawCorpus])
  const { nextProbs } = useMemo(
    () => buildNextCharDistributions(normalized),
    [normalized],
  )

  const vocabIndex = useMemo(() => makeVocabIndex(VOCAB), [])

  const aIdx = vocabIndex[charA]
  const bIdx = vocabIndex[charB]

  const pa = nextProbs[aIdx]
  const pb = nextProbs[bIdx]

  const matchProb = dot(pa, pb)
  const { top, rest } = useMemo(
    () => topContributions(pa, pb, VOCAB, 8),
    [pa, pb],
  )

  const topNextA = useMemo(() => topKFromDistribution(pa, VOCAB, 3), [pa])
  const topNextB = useMemo(() => topKFromDistribution(pb, VOCAB, 3), [pb])

  const baseline = 1 / VOCAB.length
  const scaleMax = Math.max(baseline * 4, matchProb * 1.15)
  const fillPercent = Math.min(100, (matchProb / scaleMax) * 100)
  const baselinePercent = Math.min(100, (baseline / scaleMax) * 100)
  const ratio = matchProb / baseline
  const scoreSafe = Math.max(1e-12, matchProb)
  const defaultDemoChar = top[0]?.char ?? ' '
  const [demoChar, setDemoChar] = useState(() => defaultDemoChar)

  useEffect(() => {
    setDemoChar(defaultDemoChar)
  }, [defaultDemoChar])

  const [guess, setGuess] = useState<'high' | 'low' | null>(null)
  const [guessLocked, setGuessLocked] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [displayedScore, setDisplayedScore] = useState(0)
  const [highlightedChar, setHighlightedChar] = useState<string | null>(null)

  useEffect(() => {
    setGuess(null)
    setGuessLocked(false)
    setRevealed(false)
    setDisplayedScore(0)
  }, [charA, charB, rawCorpus])

  // Score count-up animation on reveal
  useEffect(() => {
    if (!revealed) return

    const duration = 400 // ms
    const startTime = performance.now()
    const startValue = 0
    const endValue = matchProb

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      // Ease-out: fast start, slow end
      const eased = 1 - Math.pow(1 - progress, 3)
      const currentValue = startValue + (endValue - startValue) * eased

      setDisplayedScore(currentValue)

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    requestAnimationFrame(animate)
  }, [revealed, matchProb])

  // Ambient glow pulse on character change or reveal
  useEffect(() => {
    setGlowPulse(true)
    const timer = setTimeout(() => setGlowPulse(false), 400)
    return () => clearTimeout(timer)
  }, [charA, charB, revealed])

  const isHigh = ratio >= 1.5
  const guessCorrect = revealed && ((guess === 'high' && isHigh) || (guess === 'low' && !isHigh))

  const alignedChars = useMemo(() => {
    const set = new Set<string>()
    top.forEach((x) => set.add(x.char))
    topNextA.forEach((x) => set.add(x.char))
    topNextB.forEach((x) => set.add(x.char))
    const list = Array.from(set)
    list.sort((u, v) => {
      const ui = vocabIndex[u] ?? 0
      const vi = vocabIndex[v] ?? 0
      const cu = (pa[ui] ?? 0) * (pb[ui] ?? 0)
      const cv = (pa[vi] ?? 0) * (pb[vi] ?? 0)
      return cv - cu
    })
    return list.slice(0, 8)
  }, [pa, pb, top, topNextA, topNextB, vocabIndex])

  // Calculate ambient glow properties based on interaction and match score
  const glowXOffset = lastChanged === 'A' ? -30 : lastChanged === 'B' ? 30 : 0
  // Low overlap (characters different): more cyan; High overlap (characters similar): more magenta/gold
  const cyanOpacity = matchProb < 0.1 ? 0.25 : 0.15
  const magentaOpacity = matchProb > 0.15 ? 0.22 : 0.10

  return (
    <VizCard
      title="Dot Product: Overlap"
      subtitle="Imagine drawing one next character from A and one from B. How often do they land on the same character?"
    >
      <div className={styles.inner}>
        <div
          className={`${styles.ambientGlow} ${glowPulse ? styles.ambientGlowPulse : ''}`}
          style={{
            transform: `translateX(${glowXOffset}px)`,
            '--glow-cyan-opacity': cyanOpacity,
            '--glow-magenta-opacity': magentaOpacity,
          } as React.CSSProperties}
        />
        <div className={`${styles.prediction} panel-dark inset-box`}>
          <div className={styles.predictionPrompt}>Pick A and B. Predict: will overlap be high or low?</div>
          <div className={styles.predictionRow}>
            <div className={styles.predictionChoices} role="radiogroup" aria-label="Overlap guess">
              <button
                type="button"
                className={`${styles.predBtn} ${guess === 'high' ? styles.predBtnSelected : ''}`}
                onClick={() => setGuess('high')}
                aria-pressed={guess === 'high'}
                disabled={guessLocked}
              >
                High overlap
              </button>
              <button
                type="button"
                className={`${styles.predBtn} ${guess === 'low' ? styles.predBtnSelected : ''}`}
                onClick={() => setGuess('low')}
                aria-pressed={guess === 'low'}
                disabled={guessLocked}
              >
                Low overlap
              </button>
            </div>
            <div className={styles.predictionActions}>
              <button
                type="button"
                className={`${styles.lockBtn} ${guessLocked ? styles.lockBtnLocked : ''}`}
                onClick={() => guess !== null && setGuessLocked(true)}
                disabled={guessLocked || guess === null}
              >
                {guessLocked ? 'Guess locked' : 'Lock guess'}
              </button>
              <button
                type="button"
                className={styles.revealBtn}
                onClick={() => guessLocked && setRevealed(true)}
                disabled={!guessLocked}
              >
                Reveal
              </button>
            </div>
          </div>
          <div className={styles.predictionFeedback} aria-live="polite">
            {revealed ? (
              guessCorrect ? (
                <span className={styles.good}>Yep. These two contexts tend to agree more than uniform.</span>
              ) : (
                <span className={styles.bad}>Close — the overlap goes the other way for this pair.</span>
              )
            ) : guessLocked ? (
              <span className={styles.neutral}>Okay. Now reveal the score.</span>
            ) : (
              <span className={styles.neutral}>Pick a guess, lock it, then reveal.</span>
            )}
          </div>
        </div>

      {showCorpusEditor && (
        <div className={`${styles.corpusSection} panel-dark inset-box`}>
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
          <span className={styles.presetsLabel}>Presets:</span>
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

      {/* Dashboard: bins LEFT, score RIGHT */}
      <div className={styles.dashboard}>
        {/* LEFT: Aligned bins */}
        <div className={`${styles.aligned} panel-dark inset-box`}>
          <div className={styles.alignedHeader}>
            <div className={styles.alignedTitle}>Aligned bins</div>
            <div className={styles.alignedLegend}>
              <span className={styles.legendA}>A</span>
              <span className={styles.legendB}>B</span>
              <span className={styles.legendOverlap}>overlap</span>
            </div>
          </div>
          <div className={styles.alignedRows} role="list" aria-label="Aligned histogram bins">
            {alignedChars.slice(0, 5).map((ch, rowIndex) => {
              const idx = vocabIndex[ch] ?? 0
              const pA = pa[idx] ?? 0
              const pB = pb[idx] ?? 0
              const prod = pA * pB
              const isActive = demoChar === ch
              const isHighlighted = highlightedChar === ch
              return (
                <button
                  key={ch}
                  type="button"
                  className={`${styles.binRow} ${isActive ? styles.binRowActive : ''} ${isHighlighted ? styles.binRowHighlight : ''}`}
                  style={{ animationDelay: `${rowIndex * 0.05}s` }}
                  onMouseEnter={() => setDemoChar(ch)}
                  onFocus={() => setDemoChar(ch)}
                  onClick={() => setDemoChar(ch)}
                  onAnimationEnd={() => {
                    if (isHighlighted) setHighlightedChar(null)
                  }}
                >
                  <span className={styles.binChar}>{prettyChar(ch)}</span>
                  <span className={styles.binTrack} aria-hidden="true">
                    <span className={styles.binBarRow}>
                      <span className={styles.binBarA} style={{ width: `${Math.min(100, pA * 300)}px` }} />
                    </span>
                    <span className={styles.binBarRow}>
                      <span className={styles.binBarB} style={{ width: `${Math.min(100, pB * 300)}px` }} />
                    </span>
                    <span
                      className={styles.binOverlapGlow}
                      style={{
                        width: `${Math.min(pA, pB) * 300}px`,
                        opacity: Math.min(pA, pB) > 0.03 ? 0.7 : 0.25
                      }}
                    />
                  </span>
                  <span className={styles.binNums}>
                    <span className={styles.probA}>{pA.toFixed(3)}</span>
                    <span className={styles.times}>×</span>
                    <span className={styles.probB}>{pB.toFixed(3)}</span>
                    <span className={styles.equals}>=</span>
                    <span className={styles.contribValue}>{prod.toFixed(4)}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* RIGHT: Score panel - HERO element */}
        <div className={`${styles.summaryRight} panel-dark inset-box ${revealed ? styles.summaryRightRevealed : ''}`}>
          <div className={styles.scoreLabel}>
            <strong>P(match)</strong>
            <div className={styles.scoreSublabel}>
              Σ p<sub>i</sub>(A) · p<sub>i</sub>(B)
            </div>
          </div>
          <div className={`${styles.scoreValue} ${revealed ? styles.scoreValueRevealed : ''}`}>
            {revealed ? displayedScore.toFixed(4) : '—'}
          </div>
          <div className={styles.gauge}>
            <div className={styles.gaugeTrack}>
              <div
                className={`${styles.gaugeFill} ${revealed ? styles.gaugeFillAnimated : ''} ${revealed ? styles.gaugeFillDynamic : ''}`}
                style={{
                  '--target-width': `${fillPercent}%`,
                  '--score-hue-start': `${180 - (matchProb * 80)}`,
                  '--score-hue-end': `${330 - (matchProb * 30)}`,
                  width: revealed ? undefined : '0%',
                } as React.CSSProperties}
              />
              <div className={styles.gaugeBaseline} style={{ left: `${baselinePercent}%` }} />
            </div>
            <div className={styles.gaugeMeta}>
              <span className={styles.gaugeLeft}>0</span>
              <span className={styles.gaugeMid}>
                baseline = 1/V ({baseline.toFixed(3)})
              </span>
              <span className={styles.gaugeRight}>≈ {scaleMax.toFixed(3)}</span>
            </div>
          </div>
          <div className={styles.scoreHint}>
            {revealed ? (
              <>≈ {ratio.toFixed(1)}× baseline</>
            ) : (
              <>Lock a guess, then reveal</>
            )}
          </div>
          {/* Top contributors integrated into score panel */}
          <div className={styles.topContribs}>
            <div className={styles.topContribsLabel}>Top contributors</div>
            <div className={styles.topContribsChips}>
              {top.slice(0, 3).map((x, chipIndex) => {
                const isChipActive = demoChar === x.char
                return (
                  <button
                    key={x.char}
                    type="button"
                    className={`${styles.topChip} ${isChipActive ? styles.topChipActive : ''}`}
                    style={{ animationDelay: `${chipIndex * 0.05}s` }}
                    onClick={() => {
                      setDemoChar(x.char)
                      setHighlightedChar(x.char)
                    }}
                  >
                    {prettyChar(x.char)}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <details className="collapsible">
        <summary>▸ Show all 27 terms</summary>
        <div className={styles.breakdown}>
          <details className={styles.details} open>
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
      </div>
    </VizCard>
  )
}
