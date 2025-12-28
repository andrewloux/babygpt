import { useMemo, useState, useRef, useEffect } from 'react'
import styles from './CharacterClusterViz.module.css'
import { VOCAB, cosineSimilarity } from '../data/characterData'
import { VizCard } from './VizCard'

type LastChangedPicker = 'A' | 'B' | null

// Hook for animating a numeric value with easing
function useAnimatedValue(target: number, duration = 500) {
  const [current, setCurrent] = useState(target)
  const animRef = useRef<number | undefined>(undefined)
  const startValueRef = useRef(target)
  const startTimeRef = useRef<number | null>(null)

  // Check for reduced motion preference
  const prefersReducedMotion = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  useEffect(() => {
    if (prefersReducedMotion) {
      setCurrent(target)
      return
    }

    const start = current
    startValueRef.current = start
    startTimeRef.current = null

    const animate = (now: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = now
      }
      const elapsed = now - startTimeRef.current
      const progress = Math.min(elapsed / duration, 1)
      // Cubic ease-out
      const eased = 1 - Math.pow(1 - progress, 3)
      setCurrent(startValueRef.current + (target - startValueRef.current) * eased)

      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate)
      }
    }

    animRef.current = requestAnimationFrame(animate)
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [target, duration, prefersReducedMotion])

  return current
}

const DEFAULT_CORPUS = `It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.

The quick brown fox jumps over the lazy dog.`

// Helper to compute P(next | current)
function computeDistributions(text: string) {
  const counts: Record<string, Record<string, number>> = {}
  // Initialize
  for (const c of VOCAB) {
    counts[c] = {}
    for (const n of VOCAB) counts[c][n] = 0 // add-one smoothing handled later? No, let's keep it simple.
  }

  // Count bigrams
  const clean = text.toLowerCase().replace(/[^a-z ]/g, ' ')
  for (let i = 0; i < clean.length - 1; i++) {
    const curr = clean[i]
    if (!VOCAB.includes(curr)) continue
    const next = clean[i + 1]
    if (!VOCAB.includes(next)) continue

    counts[curr][next] = (counts[curr][next] || 0) + 1
  }

  // Normalize
  const dists: Record<string, { char: string; p: number; count: number }[]> = {}
  const totals: Record<string, number> = {}

  for (const c of VOCAB) {
    let sum = 0
    const row = counts[c]
    // Add 1 smoothing
    for (const n of VOCAB) sum += (row[n] + 1)
    totals[c] = Object.values(row).reduce((a, b) => a + b, 0)

    const d = []
    for (const n of VOCAB) {
      d.push({ char: n, count: row[n], p: (row[n] + 1) / sum })
    }
    d.sort((a, b) => b.p - a.p)
    dists[c] = d
  }

  return { dists, counts, totals }
}

// Convert distribution to flat vector for cosine sim
function toVec(dist: { char: string; p: number }[]): number[] {
  // Sort by VOCAB order to align
  const map = new Map(dist.map(d => [d.char, d.p]))
  return VOCAB.map(c => map.get(c) || 0)
}

function dot(a: number[], b: number[]): number {
  let s = 0
  for (let i = 0; i < a.length; i++) s += a[i] * b[i]
  return s
}

// Highlighted corpus preview component
function HighlightedCorpus({ corpus, charA, charB }: { corpus: string; charA: string; charB: string }) {
  const { highlighted, countA, countB } = useMemo(() => {
    const clean = corpus.toLowerCase()
    const lowerA = charA.toLowerCase()
    const lowerB = charB.toLowerCase()
    let cA = 0
    let cB = 0

    const elements = clean.split('').map((char, i) => {
      const isA = char === lowerA
      const isB = char === lowerB

      if (isA) {
        cA++
        return <span key={i} className={styles.highlightA}>{char}</span>
      }
      if (isB) {
        cB++
        return <span key={i} className={styles.highlightB}>{char}</span>
      }
      return char
    })

    return { highlighted: elements, countA: cA, countB: cB }
  }, [corpus, charA, charB])

  const labelA = charA === ' ' ? 'space' : `'${charA}'`
  const labelB = charB === ' ' ? 'space' : `'${charB}'`

  return (
    <div className={styles.corpusPreviewWrapper}>
      <div className={styles.corpusPreviewHeader}>
        <span className={styles.corpusPreviewTitle}>Character highlights</span>
        <span className={styles.corpusPreviewCounts}>
          <span className={styles.countA}>{countA}× {labelA}</span>
          <span className={styles.countDivider}>·</span>
          <span className={styles.countB}>{countB}× {labelB}</span>
        </span>
      </div>
      <div className={styles.corpusPreview} aria-label="Highlighted corpus preview">
        {highlighted}
      </div>
    </div>
  )
}

type CharacterClusterVizProps = {
  corpus?: string
  onCorpusChange?: (s: string) => void
  selectedA?: string
  onChangeA?: (s: string) => void
  selectedB?: string
  onChangeB?: (s: string) => void
}

export function CharacterClusterViz({
  corpus: propCorpus,
  onCorpusChange,
  selectedA,
  onChangeA,
  selectedB,
  onChangeB
}: CharacterClusterVizProps) {
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1)
  const [internalCorpus, setInternalCorpus] = useState(DEFAULT_CORPUS)
  const [internalA, setInternalA] = useState('a')
  const [internalB, setInternalB] = useState('e')
  const [hoveredChar, setHoveredChar] = useState<string | null>(null)
  const [slideDirection, setSlideDirection] = useState<'forward' | 'reverse'>('forward')
  const [lastChangedPicker, setLastChangedPicker] = useState<LastChangedPicker>(null)
  const [hasMounted, setHasMounted] = useState(false)

  // Compute derived state values first so refs can use them
  const corpus = propCorpus ?? internalCorpus
  const setCorpus = onCorpusChange ?? setInternalCorpus
  const charA = selectedA ?? internalA
  const setCharA = onChangeA ?? setInternalA
  const charB = selectedB ?? internalB
  const setCharB = onChangeB ?? setInternalB

  const stageRef = useRef<HTMLDivElement>(null)
  const prevStepRef = useRef<1 | 2 | 3>(1)
  const [step2WasActive, setStep2WasActive] = useState(false)
  const [step3WasActive, setStep3WasActive] = useState(false)
  const [vectorKeyA, setVectorKeyA] = useState(0)
  const [vectorKeyB, setVectorKeyB] = useState(0)
  const [scoreFlash, setScoreFlash] = useState(false)
  const [step3Key, setStep3Key] = useState(0)
  const prevCharARef = useRef(charA)
  const prevCharBRef = useRef(charB)
  const prevMatchProbRef = useRef<number | null>(null)

  // Trigger mount animation
  useEffect(() => {
    setHasMounted(true)
  }, [])

  // Track slide direction based on step changes
  useEffect(() => {
    if (activeStep !== prevStepRef.current) {
      setSlideDirection(activeStep > prevStepRef.current ? 'forward' : 'reverse')
      prevStepRef.current = activeStep
    }
  }, [activeStep])

  // Track when step 2 becomes active for entrance animations
  useEffect(() => {
    if (activeStep === 2 && !step2WasActive) {
      setStep2WasActive(true)
    } else if (activeStep !== 2) {
      // Reset when leaving step 2 so animation plays again
      setStep2WasActive(false)
    }
  }, [activeStep, step2WasActive])

  // Track when step 3 becomes active for entrance animations
  useEffect(() => {
    if (activeStep === 3 && !step3WasActive) {
      setStep3WasActive(true)
      setStep3Key(k => k + 1)
    } else if (activeStep !== 3) {
      // Reset when leaving step 3 so animation plays again
      setStep3WasActive(false)
    }
  }, [activeStep, step3WasActive])

  // Track character changes to trigger vector re-animation and glow position
  useEffect(() => {
    if (prevCharARef.current !== charA) {
      setVectorKeyA(k => k + 1)
      setLastChangedPicker('A')
      prevCharARef.current = charA
    }
  }, [charA])

  useEffect(() => {
    if (prevCharBRef.current !== charB) {
      setVectorKeyB(k => k + 1)
      setLastChangedPicker('B')
      prevCharBRef.current = charB
    }
  }, [charB])

  // Compute progress fill width: 0% at step 1, 38% at step 2, 76% at step 3
  // (The 76% is the distance between center of first and last tab in the segmented control)
  const progressWidth = ((activeStep - 1) / 2) * 76

  const model = useMemo(() => computeDistributions(corpus), [corpus])
  const dists = model.dists

  const vecA = toVec(dists[charA])
  const vecB = toVec(dists[charB])
  const cosSim = cosineSimilarity(vecA, vecB)
  const matchProb = dot(vecA, vecB)
  const baseline = 1 / VOCAB.length
  const baselineImprovement = matchProb / baseline

  // Animated score value
  const animatedMatchProb = useAnimatedValue(matchProb, 500)

  // Detect significant score changes for flash effect
  useEffect(() => {
    if (prevMatchProbRef.current !== null) {
      const diff = Math.abs(matchProb - prevMatchProbRef.current)
      if (diff > 0.01) {
        setScoreFlash(true)
        setStep3Key(k => k + 1)
        const timer = setTimeout(() => setScoreFlash(false), 300)
        return () => clearTimeout(timer)
      }
    }
    prevMatchProbRef.current = matchProb
  }, [matchProb])

  // Determine score tier for glow color (adjusted for similarity range)
  const scoreTier = matchProb > 0.08 ? 'high' : matchProb >= 0.04 ? 'medium' : 'low'
  const scoreTierClass = scoreTier === 'high'
    ? styles.scoreHeroHigh
    : scoreTier === 'medium'
      ? styles.scoreHeroMedium
      : styles.scoreHeroLow

  // Compute ambient glow position and color based on last changed picker
  const glowStyle = useMemo(() => {
    if (!lastChangedPicker) {
      return {
        '--glow-x': '50%',
        '--glow-y': '30%',
        '--glow-color': 'transparent',
      } as React.CSSProperties
    }
    return {
      '--glow-x': lastChangedPicker === 'A' ? '25%' : '75%',
      '--glow-y': '35%',
      '--glow-color': lastChangedPicker === 'A'
        ? 'rgba(0, 217, 255, 0.5)'
        : 'rgba(255, 0, 110, 0.5)',
    } as React.CSSProperties
  }, [lastChangedPicker])

  const topOverlap = useMemo(() => {
    const all = VOCAB.map((ch, i) => ({
      char: ch,
      pa: vecA[i],
      pb: vecB[i],
      contrib: vecA[i] * vecB[i],
    }))
    all.sort((x, y) => y.contrib - x.contrib)
    return all.slice(0, 3)
  }, [vecA, vecB])

  // -- SPATIAL PLOT CONFIG --
  // We explicitly pick two dimensions to be our "X" and "Y" axes
  // For English, P(next=' ') and P(next='e') are good differentiators
  const axisXToken = ' '
  const axisYToken = 'e'
  const axisXLabel = 'P(next = space)'
  const axisYLabel = `P(next = 'e')`

  // Compute stats for scaling
  // Find max Prob for X and Y across all chars to fit plot
  let maxX = 0.1
  let maxY = 0.1

  const points = VOCAB.map(c => {
    const d = dists[c]
    const px = d.find(k => k.char === axisXToken)?.p || 0
    const py = d.find(k => k.char === axisYToken)?.p || 0
    if (px > maxX) maxX = px
    if (py > maxY) maxY = py
    return { char: c, x: px, y: py }
  })

  // Pad max
  maxX *= 1.1
  maxY *= 1.1

  const toPctX = (v: number) => (v / maxX) * 100
  const toPctY = (v: number) => (v / maxY) * 100

  // Points for A and B
  const pA = points.find(p => p.char === charA)!
  const pB = points.find(p => p.char === charB)!

  const aX = toPctX(pA.x)
  const aY = 100 - toPctY(pA.y)
  const bX = toPctX(pB.x)
  const bY = 100 - toPctY(pB.y)

  const pHover = hoveredChar ? points.find(p => p.char === hoveredChar) : null
  const hoverX = pHover ? toPctX(pHover.x) : 0
  const hoverY = pHover ? 100 - toPctY(pHover.y) : 0

  const vecHover = hoveredChar ? toVec(dists[hoveredChar]) : null
  const cosSimHoverA = vecHover ? cosineSimilarity(vecA, vecHover) : 0
  const cosSimHoverB = vecHover ? cosineSimilarity(vecB, vecHover) : 0

  const renderHist = (char: string) => {
    const top3 = dists[char].slice(0, 3)
    const total = model.totals[char] ?? 0
    const pretty = char === ' ' ? 'space' : `'${char}'`
    return (
      <div className={styles.histogram}>
        <div className={styles.histMeta}>
          After {pretty}: <span className={styles.histMetaValue}>{total.toLocaleString()}×</span>
        </div>
        {top3.map((d, index) => (
          <div
            key={d.char}
            className={styles.barRow}
            style={{ ['--bar-index' as string]: index }}
          >
            <div className={styles.barLeft}>
              <div className={styles.barLabel}>{d.char === ' ' ? '␣' : d.char}</div>
              <div className={styles.barTrack}>
                <div
                  className={styles.barFill}
                  style={{
                    ['--bar-index' as string]: index,
                    width: `${d.p * 100}%`
                  }}
                />
              </div>
            </div>
            <div className={styles.barRight}>
              <span className={styles.barPct}>{(d.p * 100).toFixed(0)}%</span>
              <span className={styles.barCount}>{d.count.toLocaleString()}×</span>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <VizCard
      title="From Histograms to Coordinates"
      subtitle="Counts → postcard → similarity"
      figNum="Fig. 2.3"
      footer={
        <div className={styles.footerWrapper}>
          <div className={styles.footerDivider} />
          <p className={styles.footerText}>
            <span className={styles.footerEmphasis}>The link:</span> histograms are <em className={styles.footerTerm}>fingerprints</em>.
            Training tries to give characters coordinates whose similarities behave like fingerprint similarities.
          </p>
        </div>
      }
    >
      <div ref={stageRef} className={`${styles.vizWrapper} ${hasMounted ? styles.vizWrapperMounted : ''}`}>
        <div className={styles.toolbar} aria-label="Controls">
        <div className={styles.topControls} aria-label="Pick two context characters">
          <label className={styles.picker}>
            <span className={`${styles.pickerLabel} ${styles.pickerLabelA}`}>A</span>
            <select
              className={`${styles.pickerSelect} ${styles.pickerSelectA}`}
              value={charA}
              onChange={(e) => setCharA(e.target.value)}
            >
              {VOCAB.map(c => (
                <option key={c} value={c}>
                  {c === ' ' ? 'Space' : c}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.picker}>
            <span className={`${styles.pickerLabel} ${styles.pickerLabelB}`}>B</span>
            <select
              className={`${styles.pickerSelect} ${styles.pickerSelectB}`}
              value={charB}
              onChange={(e) => setCharB(e.target.value)}
            >
              {VOCAB.map(c => (
                <option key={c} value={c}>
                  {c === ' ' ? 'Space' : c}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className={styles.segmented} role="tablist" aria-label="Walkthrough steps">
          <div
            className={styles.progressFill}
            style={{ width: `${progressWidth}%` }}
            aria-hidden="true"
          />
          <button
            type="button"
            role="tab"
            className={`${styles.segment} ${activeStep === 1 ? styles.segmentActive : ''}`}
            onClick={() => setActiveStep(1)}
            aria-selected={activeStep === 1}
            tabIndex={activeStep === 1 ? 0 : -1}
          >
            <span className={styles.segmentKicker}>1</span>
            <span className={styles.segmentLabel}>Counts</span>
          </button>
          <button
            type="button"
            role="tab"
            className={`${styles.segment} ${activeStep === 2 ? styles.segmentActive : ''}`}
            onClick={() => setActiveStep(2)}
            aria-selected={activeStep === 2}
            tabIndex={activeStep === 2 ? 0 : -1}
          >
            <span className={styles.segmentKicker}>2</span>
            <span className={styles.segmentLabel}>Postcard</span>
          </button>
          <button
            type="button"
            role="tab"
            className={`${styles.segment} ${activeStep === 3 ? styles.segmentActive : ''}`}
            onClick={() => setActiveStep(3)}
            aria-selected={activeStep === 3}
            tabIndex={activeStep === 3 ? 0 : -1}
          >
            <span className={styles.segmentKicker}>3</span>
            <span className={styles.segmentLabel}>Similarity</span>
          </button>
        </div>
      </div>

      <div className={`panel-dark ${styles.stage}`} style={glowStyle}>
        {activeStep === 1 && (
          <div
            className={slideDirection === 'forward' ? styles.stageContent : styles.stageContentReverse}
            key="step-1"
          >
            <div className={styles.stageIntro}>
              <strong>Counts → probabilities.</strong> Scan the corpus and count every adjacent pair (current → next).
            </div>

            <div className={styles.step1Layout}>
              <div className={`inset-box ${styles.corpusSection}`}>
                <div className={styles.corpusHeader}>
                  <div className={styles.corpusTitle}>Training text</div>
                  <div className={styles.corpusHint}>Lower-case, punctuation → spaces</div>
                </div>
                <textarea
                  className={styles.corpusInput}
                  value={corpus}
                  onChange={(e) => setCorpus(e.target.value)}
                  rows={2}
                  spellCheck={false}
                />
                <HighlightedCorpus corpus={corpus} charA={charA} charB={charB} />
              </div>

              <div className={styles.histGrid} aria-label="Next-character distributions for A and B">
                <div className={`inset-box ${styles.charCard} ${styles.charCardA}`}>
                  {renderHist(charA)}
                </div>
                <div className={`inset-box ${styles.charCard} ${styles.charCardB}`}>
                  {renderHist(charB)}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeStep === 2 && (
          <div
            className={slideDirection === 'forward' ? styles.stageContent : styles.stageContentReverse}
            key="step-2"
          >
            <div className={styles.stageIntro}>
              <strong>A 2D postcard.</strong> Each character has 27 probabilities. We plot just two of them as X/Y so you can
              see the cloud.
            </div>

            <div className={styles.spatialPlotArea}>
              <div className={`${styles.axisLabel} ${styles.xAxisLabel}`}>{axisXLabel} →</div>
              <div className={`${styles.axisLabel} ${styles.yAxisLabel}`}>↑ {axisYLabel}</div>

              <svg
                className={styles.spatialOverlay}
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <defs>
                  <linearGradient id="vectorA" gradientUnits="userSpaceOnUse" x1="0" y1="100" x2={aX} y2={aY}>
                    <stop offset="0%" stopColor="rgba(0, 217, 255, 0)" />
                    <stop offset="70%" stopColor="rgba(0, 217, 255, 0.35)" />
                    <stop offset="100%" stopColor="rgba(0, 217, 255, 0.95)" />
                  </linearGradient>
                  <linearGradient id="vectorB" gradientUnits="userSpaceOnUse" x1="0" y1="100" x2={bX} y2={bY}>
                    <stop offset="0%" stopColor="rgba(255, 0, 110, 0)" />
                    <stop offset="70%" stopColor="rgba(255, 0, 110, 0.33)" />
                    <stop offset="100%" stopColor="rgba(255, 0, 110, 0.92)" />
                  </linearGradient>

                  <marker
                    id="arrowA"
                    viewBox="0 0 10 10"
                    refX="8.5"
                    refY="5"
                    markerWidth="5"
                    markerHeight="5"
                    orient="auto"
                    markerUnits="strokeWidth"
                  >
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(0, 217, 255, 0.95)" />
                  </marker>
                  <marker
                    id="arrowB"
                    viewBox="0 0 10 10"
                    refX="8.5"
                    refY="5"
                    markerWidth="5"
                    markerHeight="5"
                    orient="auto"
                    markerUnits="strokeWidth"
                  >
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(255, 0, 110, 0.92)" />
                  </marker>
                </defs>

                <line key={`glow-a-${vectorKeyA}`} className={styles.vectorLineAGlow} x1={0} y1={100} x2={aX} y2={aY} stroke="rgba(0, 217, 255, 0.25)" />
                <line key={`line-a-${vectorKeyA}`} className={styles.vectorLineA} x1={0} y1={100} x2={aX} y2={aY} stroke="url(#vectorA)" markerEnd="url(#arrowA)" />
                <line key={`glow-b-${vectorKeyB}`} className={styles.vectorLineBGlow} x1={0} y1={100} x2={bX} y2={bY} stroke="rgba(255, 0, 110, 0.20)" />
                <line key={`line-b-${vectorKeyB}`} className={styles.vectorLineB} x1={0} y1={100} x2={bX} y2={bY} stroke="url(#vectorB)" markerEnd="url(#arrowB)" />
                {hoveredChar && pHover && (
                  <line
                    className={styles.vectorLineHover}
                    x1={0}
                    y1={100}
                    x2={hoverX}
                    y2={hoverY}
                  />
                )}
              </svg>

              {points.map((p, index) => (
                <button
                  key={p.char}
                  type="button"
                  className={`${styles.point} ${p.char === charA ? styles.selectedA : ''} ${
                    p.char === charB ? styles.selectedB : ''
                  } ${p.char === hoveredChar ? styles.hovered : ''} ${step2WasActive ? styles.pointEntered : ''}`}
                  style={{
                    left: `${toPctX(p.x)}%`,
                    bottom: `${toPctY(p.y)}%`,
                    ['--point-delay' as string]: index
                  }}
                  onClick={(e) => {
                    if (e.shiftKey) setCharB(p.char)
                    else setCharA(p.char)
                  }}
                  onMouseEnter={() => setHoveredChar(p.char)}
                  onMouseLeave={() => setHoveredChar(null)}
                  aria-label={`Select '${p.char === ' ' ? 'space' : p.char}'${p.char === charA ? ' (A)' : p.char === charB ? ' (B)' : ''}`}
                >
                  {p.char === ' ' ? '␣' : p.char}
                </button>
              ))}

              <div className={`${styles.hoverInspector} ${hoveredChar ? styles.visible : ''}`}>
                {hoveredChar && (
                  <>
                    <div className={styles.hoverInspectorChar}>{hoveredChar === ' ' ? '␣' : hoveredChar}</div>
                    <div className={styles.hoverInspectorStats}>
                      <div>
                        <span className={styles.hoverInspectorLabel}>cos(A, H) </span>
                        <span className={`${styles.hoverInspectorValue} ${styles.hoverInspectorValueA}`}>
                          {cosSimHoverA.toFixed(2)}
                        </span>
                      </div>
                      <div>
                        <span className={styles.hoverInspectorLabel}>cos(B, H) </span>
                        <span className={`${styles.hoverInspectorValue} ${styles.hoverInspectorValueB}`}>
                          {cosSimHoverB.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className={styles.hintRow}>
              Tip: click for A, <strong>shift+click</strong> for B.
              <span className={styles.hintDivider} aria-hidden="true">·</span>
              The real "fingerprint" is 27‑D; this is a 2‑D slice.
            </div>
          </div>
        )}

        {activeStep === 3 && (
          <div
            className={slideDirection === 'forward' ? styles.stageContent : styles.stageContentReverse}
            key="step-3"
          >
            <div className={styles.stageIntro}>
              <strong>One score.</strong> Sample one next‑character from A and one from B. How often do they match?
            </div>

            <div className={`inset-box ${styles.simCard} ${scoreFlash ? styles.simCardFlash : ''}`}>
              {/* HERO: The overlap score */}
              <div className={styles.scoreHero}>
                <div
                  key={step3Key}
                  className={`${styles.scoreHeroValue} ${scoreTierClass} ${step3WasActive ? styles.scoreHeroAnimated : ''} ${scoreFlash ? styles.scoreHeroFlash : ''}`}
                >
                  {(animatedMatchProb * 100).toFixed(1)}%
                </div>
                <div className={styles.scoreHeroLabel}>match probability</div>
              </div>

              {/* Gauge bar: overlap vs random baseline */}
              <div className={styles.overlapGauge} key={`gauge-${step3Key}`}>
                <div className={styles.gaugeTrack}>
                  <div
                    className={styles.gaugeFill}
                    style={{ width: `${Math.min((matchProb / 0.25) * 100, 100)}%` }}
                  />
                  <div
                    className={styles.gaugeBaseline}
                    style={{ left: `${(baseline / 0.25) * 100}%` }}
                  >
                    <span className={styles.gaugeBaselineLabel}>random</span>
                  </div>
                </div>
                <div className={styles.gaugeCaption}>
                  <span className={`${styles.gaugeMultiplier} ${baselineImprovement >= 1 ? styles.gaugeAbove : styles.gaugeBelow}`}>
                    {baselineImprovement.toFixed(1)}×
                  </span>
                  {baselineImprovement >= 1 ? ' above' : ' below'} random ({(baseline * 100).toFixed(1)}%)
                </div>
              </div>

              {/* Breakdown: where does the overlap come from? */}
              <div className={styles.overlapBreakdown}>
                <div className={styles.breakdownTitle}>Where the overlap comes from</div>
                <div className={styles.breakdownBars}>
                  {topOverlap.map((x, index) => {
                    const pct = matchProb <= 0 ? 0 : (x.contrib / matchProb) * 100
                    return (
                      <div
                        key={x.char}
                        className={`${styles.breakdownRow} ${step3WasActive ? styles.breakdownRowAnimated : ''}`}
                        style={{ ['--row-index' as string]: index }}
                      >
                        <span className={styles.breakdownChar}>{x.char === ' ' ? '␣' : x.char}</span>
                        <div className={styles.breakdownBarTrack}>
                          <div
                            className={styles.breakdownBarFill}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className={styles.breakdownPct}>{pct.toFixed(0)}%</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              <details className={styles.details}>
                <summary className={styles.detailsSummary}>Cosine similarity (normalized)</summary>
                <div className={styles.detailsBody}>
                  <div className={styles.detailsRow}>
                    <div className={styles.detailsLabel}>cos(A, B)</div>
                    <div
                      className={styles.detailsValue}
                      style={{
                        color:
                          cosSim > 0.9
                            ? 'var(--accent-green)'
                            : cosSim < 0.8
                              ? 'var(--accent-red)'
                              : 'var(--accent-yellow)',
                      }}
                    >
                      {cosSim.toFixed(2)}
                    </div>
                  </div>
                  <div className={styles.detailsNote}>
                    Cosine = dot product after scaling both vectors to length 1. Measures <em>shape</em>, ignoring magnitude.
                  </div>
                </div>
              </details>
            </div>
          </div>
        )}
      </div>
      </div>
    </VizCard>
  )
}
