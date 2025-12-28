import { useState, useMemo, useEffect } from 'react'
import { VizCard } from './VizCard'
import { Slider } from './Slider'
import styles from './ContextExplosionViz.module.css'

// Corpus that eventually contains all 26 letters + underscore
const CORPUS = 'the_cat_sat_on_the_mat_the_quick_brown_fox_jumped_over_the_lazy_dog_'
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz_'.split('')
const VOCAB_SIZE = 27

export function ContextExplosionViz() {
  const [position, setPosition] = useState(0)
  const [T, setT] = useState(4)
  const [isScanning, setIsScanning] = useState(false)

  // Current context window
  const context = useMemo(() => {
    return CORPUS.slice(position, position + T)
  }, [position, T])

  // All unique letters seen from start up to current window end
  const seenLetters = useMemo(() => {
    const seen = new Set<string>()
    for (let i = 0; i <= position + T - 1 && i < CORPUS.length; i++) {
      seen.add(CORPUS[i])
    }
    return seen
  }, [position, T])

  // Letters in current window (for extra glow)
  const windowLetters = useMemo(() => {
    return new Set(context.split(''))
  }, [context])

  const maxPosition = CORPUS.length - T
  const allSeen = seenLetters.size === VOCAB_SIZE

  // Auto-scan effect
  useEffect(() => {
    if (!isScanning) return

    const interval = setInterval(() => {
      setPosition((prev) => {
        if (prev >= maxPosition) {
          setIsScanning(false)
          return prev
        }
        return prev + 1
      })
    }, 150)

    return () => clearInterval(interval)
  }, [isScanning, maxPosition])

  const handleScanClick = () => {
    if (isScanning) {
      setIsScanning(false)
    } else {
      // Reset to start if already at end
      if (position >= maxPosition) {
        setPosition(0)
      }
      setIsScanning(true)
    }
  }

  return (
    <div className={styles.noSelect}>
      <VizCard
        title="The Context Explosion"
        subtitle="Watch the alphabet fill up... then stop"
        figNum="Fig. 2.2"
      >
        <div className={styles.layout}>
          {/* Corpus strip */}
          <div className={styles.corpusSection}>
            <div className={styles.corpusLabel}>Corpus</div>
            <div className={styles.corpusStrip}>
              {CORPUS.split('').map((char, i) => {
                const inWindow = i >= position && i < position + T
                const isSeen = i < position + T
                return (
                  <span
                    key={i}
                    className={styles.corpusChar}
                    data-in-window={inWindow}
                    data-seen={isSeen}
                  >
                    {char === '_' ? '\u2423' : char}
                  </span>
                )
              })}
            </div>
          </div>

          {/* Controls */}
          <div className={styles.controlsRow}>
            <div className={styles.sliderGroup}>
              <span className={styles.sliderLabel}>Position</span>
              <Slider
                wrap={false}
                min={0}
                max={maxPosition}
                step={1}
                value={position}
                onValueChange={(v) => setPosition(Math.round(v))}
                ariaLabel="Position in corpus"
              />
              <span className={styles.sliderValue}>{position}</span>
            </div>
            <div className={styles.sliderGroup}>
              <span className={styles.sliderLabel}>Window T</span>
              <Slider
                wrap={false}
                min={1}
                max={6}
                step={1}
                value={T}
                onValueChange={(v) => {
                  const newT = Math.round(v)
                  setT(newT)
                  // Clamp position if needed
                  if (position > CORPUS.length - newT) {
                    setPosition(CORPUS.length - newT)
                  }
                }}
                ariaLabel="Context window length"
              />
              <span className={styles.sliderValue}>{T}</span>
            </div>
          </div>

          {/* Auto-scan button */}
          <button
            className={styles.scanButton}
            data-scanning={isScanning}
            onClick={handleScanClick}
          >
            {isScanning ? 'Stop' : 'Auto-scan'}
          </button>

          {/* Current window display */}
          <div className={styles.windowDisplay}>
            <span className={styles.windowLabel}>Current window:</span>
            <div className={styles.windowChars}>
              {context.split('').map((char, i) => (
                <span key={i} className={styles.windowChar}>
                  {char === '_' ? '\u2423' : char}
                </span>
              ))}
            </div>
          </div>

          {/* Alphabet grid */}
          <div className={styles.alphabetSection}>
            <div className={styles.alphabetLabel}>Embedding table (27 vectors)</div>
            <div className={styles.alphabetGrid}>
              {ALPHABET.map((char) => {
                const seen = seenLetters.has(char)
                const inWindow = windowLetters.has(char)
                return (
                  <div
                    key={char}
                    className={styles.alphabetCell}
                    data-seen={seen}
                    data-in-window={inWindow}
                  >
                    {char === '_' ? '\u2423' : char}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Stats */}
          <div className={styles.statsSection}>
            <div className={styles.statsPrimary}>
              <span className={styles.statsNumber}>{seenLetters.size}</span>
              <span className={styles.statsLabel}>/ {VOCAB_SIZE} unique letters seen</span>
            </div>
            {allSeen && (
              <div className={styles.celebration}>
                All letters discovered! The table is full.
              </div>
            )}
          </div>

          {/* Insight */}
          <div className={styles.insightFooter}>
            <strong>The ceiling:</strong> No matter how much more text we read,
            we will never need more than {VOCAB_SIZE} vectors.
            That is the power of embeddings over lookup tables.
          </div>
        </div>
      </VizCard>
    </div>
  )
}
