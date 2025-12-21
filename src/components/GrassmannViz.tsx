import { useState, useMemo } from 'react'
import { Slider } from './Slider'
import styles from './GrassmannViz.module.css'

// Vocabulary for character mode
const VOCAB = [
  ' ',
  'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
  'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
]

const DEFAULT_CORPUS = `It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.

The quick brown fox jumps over the lazy dog.`

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

function computeRoleVectors(text: string): number[][] {
  const vocabIndex: Record<string, number> = {}
  for (let i = 0; i < VOCAB.length; i++) vocabIndex[VOCAB[i]] = i

  const bigramCounts = Array.from({ length: VOCAB.length }, () => new Array(VOCAB.length).fill(0))

  for (let i = 0; i < text.length - 1; i++) {
    const a = vocabIndex[text[i]]
    const b = vocabIndex[text[i + 1]]
    if (a === undefined || b === undefined) continue
    bigramCounts[a][b]++
  }

  // Role vectors with add-one smoothing
  const smoothing = 1
  return bigramCounts.map(row => {
    const smoothed = row.map(x => x + smoothing)
    const sum = smoothed.reduce((a, b) => a + b, 0)
    return smoothed.map(x => x / sum)
  })
}

function interpolateVectors(a: number[], b: number[], t: number): number[] {
  return a.map((val, i) => (1 - t) * val + t * b[i])
}

function prettyChar(c: string): string {
  return c === ' ' ? '␣' : c
}

type Mode = 'color' | 'character'

interface Props {
  corpus?: string
}

export function GrassmannViz({ corpus = DEFAULT_CORPUS }: Props) {
  const [mode, setMode] = useState<Mode>('color')
  const [mix, setMix] = useState(0.5)
  const [charA, setCharA] = useState('q')
  const [charB, setCharB] = useState('u')

  // Compute role vectors for character mode
  const roleVectors = useMemo(() => {
    const normalized = normalizeToVocab(corpus)
    return computeRoleVectors(normalized)
  }, [corpus])

  // Get indices for selected characters
  const idxA = VOCAB.indexOf(charA)
  const idxB = VOCAB.indexOf(charB)

  // Interpolated distribution for character mode
  const blendedDist = useMemo(() => {
    if (idxA < 0 || idxB < 0) return null
    return interpolateVectors(roleVectors[idxA], roleVectors[idxB], mix)
  }, [roleVectors, idxA, idxB, mix])

  // Top characters in blended distribution
  const topChars = useMemo(() => {
    if (!blendedDist) return []
    return VOCAB
      .map((ch, i) => ({ char: ch, p: blendedDist[i] }))
      .sort((a, b) => b.p - a.p)
      .slice(0, 8)
  }, [blendedDist])

  // Color mode calculations
  const r = Math.round(255 * (1 - mix))
  const b = Math.round(255 * mix)
  const currentColor = `rgb(${r}, 0, ${b})`
  const glowColor = `rgba(${r}, 0, ${b}, 0.6)`

  // Character mode colors
  const charColorA = '#4ecdc4'
  const charColorB = '#ff6b6b'

  return (
    <div className={styles.container}>
      {/* Background Ambient Glow */}
      <div
        className={styles.ambientGlow}
        style={{ background: mode === 'color' ? currentColor : `linear-gradient(90deg, ${charColorA}, ${charColorB})` }}
      />

      <div className={styles.card}>

        {/* Header with Mode Toggle */}
        <div className={styles.header}>
          <div>
            <h3 className={styles.title}>
              {mode === 'color' ? 'Colors as Coordinates' : 'Characters as Coordinates'}
            </h3>
            <p className={styles.subtitle}>
              {mode === 'color' ? 'Grassmann\'s insight: blend = interpolate' : 'Same algebra, different domain'}
            </p>
          </div>
          <div className={styles.modeToggle}>
            <button
              type="button"
              className={`${styles.modeBtn} ${mode === 'color' ? styles.active : ''}`}
              onClick={() => setMode('color')}
            >
              Colors
            </button>
            <button
              type="button"
              className={`${styles.modeBtn} ${mode === 'character' ? styles.active : ''}`}
              onClick={() => setMode('character')}
            >
              Characters
            </button>
          </div>
        </div>

        {mode === 'color' ? (
          /* ========== COLOR MODE ========== */
          <>
            <div className={styles.stage}>
              {/* Concept A (Left) */}
              <div className={styles.concept} style={{ opacity: 1 - mix * 0.5 }}>
                <div className={`${styles.node} ${styles.nodeA}`}>
                  <span>R</span>
                </div>
                <div className={styles.labelGroup}>
                  <div className={`${styles.label} ${styles.labelA}`}>Red</div>
                  <div className={`${styles.coords} ${styles.coordsA}`}>1.0, 0.0</div>
                </div>
              </div>

              {/* Connection Beam */}
              <div className={styles.beam} />

              {/* Slider */}
              <div className={styles.sliderContainer}>
                <Slider
                  wrap={false}
                  unstyled
                  inputClassName={styles.rangeInput}
                  min={0}
                  max={1}
                  step={0.01}
                  value={mix}
                  onValueChange={setMix}
                  ariaLabel="Blend amount"
                />

                <div className={styles.puck} style={{ left: `${mix * 100}%` }}>
                  <div className={styles.orbGlow} style={{ background: glowColor }} />
                  <div
                    className={styles.orbCore}
                    style={{ backgroundColor: currentColor, boxShadow: `0 0 20px ${glowColor}` }}
                  >
                    <div className={styles.dot} />
                  </div>

                  <div className={styles.tooltip}>
                    <div className={styles.tooltipContent}>
                      <div className={styles.equation}>
                        {(1 - mix).toFixed(2)}<span className={styles.valA}>R</span> + {mix.toFixed(2)}<span className={styles.valB}>B</span>
                      </div>
                    </div>
                    <div className={styles.tooltipArrow} />
                  </div>
                </div>
              </div>

              {/* Concept B (Right) */}
              <div className={styles.concept} style={{ opacity: 0.5 + mix * 0.5 }}>
                <div className={`${styles.node} ${styles.nodeB}`}>
                  <span>B</span>
                </div>
                <div className={styles.labelGroup}>
                  <div className={`${styles.label} ${styles.labelB}`}>Blue</div>
                  <div className={`${styles.coords} ${styles.coordsB}`}>0.0, 1.0</div>
                </div>
              </div>
            </div>

            <div className={styles.footer}>
              <p className={styles.footerText}>
                Slide <span className={styles.highlightAbstract}>t</span>. In a coordinate system, “in-between” is a real place you can land — you’re just moving along the line between A and B.
              </p>
            </div>
          </>
        ) : (
          /* ========== CHARACTER MODE ========== */
          <>
            {/* Character Selectors */}
            <div className={styles.charSelectors}>
              <div className={styles.charSelector}>
                <label className={styles.charLabel}>Context char A</label>
                <select
                  value={charA}
                  onChange={(e) => setCharA(e.target.value)}
                  className={styles.charSelect}
                  style={{ borderColor: charColorA }}
                >
                  {VOCAB.map(ch => (
                    <option key={ch} value={ch}>{prettyChar(ch)}</option>
                  ))}
                </select>
              </div>
              <div className={styles.charSelector}>
                <label className={styles.charLabel}>Context char B</label>
                <select
                  value={charB}
                  onChange={(e) => setCharB(e.target.value)}
                  className={styles.charSelect}
                  style={{ borderColor: charColorB }}
                >
                  {VOCAB.map(ch => (
                    <option key={ch} value={ch}>{prettyChar(ch)}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Blend Stage */}
            <div className={styles.blendStage}>
              <div className={styles.blendEndpoint} style={{ color: charColorA }}>
                <span className={styles.blendChar}>{prettyChar(charA)}</span>
                <span className={styles.blendLabel}>t = 0</span>
              </div>

              <div className={styles.blendSliderWrap}>
                <Slider
                  wrap={false}
                  unstyled
                  inputClassName={styles.blendSlider}
                  min={0}
                  max={1}
                  step={0.01}
                  value={mix}
                  onValueChange={setMix}
                  ariaLabel="Blend amount"
                />
                <div className={styles.blendValue}>
                  t = {mix.toFixed(2)}
                </div>
              </div>

              <div className={styles.blendEndpoint} style={{ color: charColorB }}>
                <span className={styles.blendChar}>{prettyChar(charB)}</span>
                <span className={styles.blendLabel}>t = 1</span>
              </div>
            </div>

            {/* Blended Distribution Display */}
            <div className={styles.distSection}>
              <div className={styles.distHeader}>
                <span className={styles.distTitle}>P(next | blend)</span>
                <span className={styles.distFormula}>
                  = {(1 - mix).toFixed(2)} × P(next|<span style={{ color: charColorA }}>{prettyChar(charA)}</span>) + {mix.toFixed(2)} × P(next|<span style={{ color: charColorB }}>{prettyChar(charB)}</span>)
                </span>
              </div>

              <div className={styles.barChart}>
                {topChars.map(({ char, p }) => (
                  <div key={char} className={styles.barRow}>
                    <span className={styles.barLabel}>{prettyChar(char)}</span>
                    <div className={styles.barTrack}>
                      <div
                        className={styles.barFill}
                        style={{
                          width: `${Math.min(100, p * 400)}%`,
                          background: `linear-gradient(90deg, ${charColorA}, ${charColorB})`,
                        }}
                      />
                    </div>
                    <span className={styles.barValue}>{(p * 100).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.footer}>
              <p className={styles.footerText}>
                You’re not mixing letters — you’re mixing <span className={styles.highlightAbstract}>next-character distributions</span>. As <span className={styles.highlightAbstract}>t</span> slides from 0 to 1, the bars move from what follows '{prettyChar(charA)}' toward what follows '{prettyChar(charB)}'.
              </p>
            </div>
          </>
        )}

      </div>
    </div>
  )
}
