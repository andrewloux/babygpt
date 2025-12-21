import { useMemo, useState } from 'react'
import { Slider } from './Slider'
import styles from './TensorShapeBuilder.module.css'

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

const SAMPLE_TEXT = normalizeToVocab(`the cat sat on the mat
the quick brown fox jumps over the lazy dog
it is a truth universally acknowledged`)

function prettyChar(c: string): string {
  return c === ' ' ? '␣' : c
}

function makeVocabIndex(vocab: string[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (let i = 0; i < vocab.length; i++) out[vocab[i]] = i
  return out
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

function mulberry32(seed: number) {
  return function random() {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n))
}

function embedValue(tokenId: number, dim: number) {
  // Deterministic “fake embedding”: stable per (tokenId, dim).
  // Range is roughly [-1, 1].
  const a = Math.sin((tokenId + 1) * 1337 + (dim + 1) * 97)
  const b = Math.sin((tokenId + 1) * 31 + (dim + 1) * 211)
  return clamp((a + b) * 0.5, -1, 1)
}

export function TensorShapeBuilder() {
  const [batchSize, setBatchSize] = useState(3)
  const [timeSteps, setTimeSteps] = useState(6)
  const [embedDim, setEmbedDim] = useState(8)
  const [seed, setSeed] = useState(1)
  const [focus, setFocus] = useState({ b: 0, t: 0 })

  const vocabIndex = useMemo(() => makeVocabIndex(VOCAB), [])

  const { chars, ids } = useMemo(() => {
    const rng = mulberry32(seed)
    const text = SAMPLE_TEXT
    const B = batchSize
    const T = timeSteps
    const outChars: string[][] = []
    const outIds: number[][] = []

    for (let b = 0; b < B; b++) {
      const start = Math.floor(rng() * Math.max(1, text.length - T))
      const slice = text.slice(start, start + T).padEnd(T, ' ')
      const rowChars = [...slice]
      const rowIds = rowChars.map(ch => vocabIndex[ch] ?? 0)
      outChars.push(rowChars)
      outIds.push(rowIds)
    }

    return { chars: outChars, ids: outIds }
  }, [batchSize, timeSteps, seed, vocabIndex])

  const focusB = clamp(focus.b, 0, batchSize - 1)
  const focusT = clamp(focus.t, 0, timeSteps - 1)
  const focusId = ids[focusB]?.[focusT] ?? 0
  const focusChar = VOCAB[focusId] ?? ' '
  const focusVec = useMemo(
    () => Array.from({ length: embedDim }, (_, i) => embedValue(focusId, i)),
    [focusId, embedDim],
  )

  const sameTokenCount = useMemo(() => {
    let n = 0
    for (const row of ids) {
      for (const id of row) if (id === focusId) n++
    }
    return n
  }, [focusId, ids])

  const isSameToken = (b: number, t: number) => ids[b]?.[t] === focusId

  return (
    <div className={styles.container}>
      <div className={styles.ambientGlow} />

      <div className={styles.controls}>
        <div className={styles.shapeMini} aria-label="Shape summary">
          <span className={styles.shapeToken}>X</span>
          <span className={styles.shapeBrackets}>
            [{batchSize}, {timeSteps}]
          </span>
          <span className={styles.shapeArrow} aria-hidden="true">
            →
          </span>
          <span className={styles.shapeToken}>X_emb</span>
          <span className={styles.shapeBrackets}>
            [{batchSize}, {timeSteps}, {embedDim}]
          </span>
        </div>
        <label className={styles.control}>
          <span className={styles.controlLabel}>B (batch)</span>
          <Slider
            wrap={false}
            min={1}
            max={5}
            step={1}
            value={batchSize}
            onValueChange={(v) => {
              const next = Math.round(v)
              setBatchSize(next)
              setFocus((f) => ({ ...f, b: clamp(f.b, 0, next - 1) }))
            }}
            ariaLabel="Batch size"
          />
          <span className={styles.controlValue}>{batchSize}</span>
        </label>

        <label className={styles.control}>
          <span className={styles.controlLabel}>T (positions)</span>
          <Slider
            wrap={false}
            min={2}
            max={8}
            step={1}
            value={timeSteps}
            onValueChange={(v) => {
              const next = Math.round(v)
              setTimeSteps(next)
              setFocus((f) => ({ ...f, t: clamp(f.t, 0, next - 1) }))
            }}
            ariaLabel="Time steps"
          />
          <span className={styles.controlValue}>{timeSteps}</span>
        </label>

        <label className={styles.control}>
          <span className={styles.controlLabel}>D (features)</span>
          <Slider
            wrap={false}
            min={4}
            max={16}
            step={1}
            value={embedDim}
            onValueChange={(v) => setEmbedDim(Math.round(v))}
            ariaLabel="Embedding dimension"
          />
          <span className={styles.controlValue}>{embedDim}</span>
        </label>

        <button
          type="button"
          className={styles.reshuffleBtn}
          onClick={() => setSeed((s) => s + 1)}
        >
          new batch
        </button>
      </div>

      <div className={styles.stage}>
        <div className={styles.card}>
          <div className={styles.cardTitle}>
            <span className={styles.cardKicker}>1</span> IDs <span className={styles.cardShape}>X[b, t]</span>
          </div>
          <div
            className={styles.grid}
            style={{ gridTemplateColumns: `repeat(${timeSteps}, minmax(0, 1fr))` }}
            aria-label="Input ID grid"
          >
            {ids.map((row, b) =>
              row.map((id, t) => {
                const active = b === focusB && t === focusT
                const same = isSameToken(b, t)
                return (
                  <button
                    key={`${b}-${t}`}
                    type="button"
                    className={`${styles.cell} ${active ? styles.active : ''} ${same ? styles.same : ''}`}
                    onClick={() => setFocus({ b, t })}
                    aria-label={`X[${b}, ${t}] = ${id} (${prettyChar(chars[b][t])})`}
                  >
                    <span className={styles.cellChar}>{prettyChar(chars[b][t])}</span>
                    <span className={styles.cellId}>{id}</span>
                  </button>
                )
              }),
            )}
          </div>
          <div className={styles.axisHint}>
            <span className={styles.axisTag}>B</span> goes down. <span className={styles.axisTag}>T</span> (position) goes right.
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardTitle}>
            <span className={styles.cardKicker}>2</span> lookup → vector <span className={styles.cardShape}>X_emb[b, t, :]</span>
          </div>
          <div className={styles.selection}>
            <div className={styles.selectionRow}>
              <span className={styles.selectionKey}>Selected</span>
              <span className={styles.selectionVal}>
                [b={focusB}, t={focusT}]
              </span>
            </div>
            <div className={styles.selectionRow}>
              <span className={styles.selectionKey}>ID</span>
              <span className={styles.selectionVal}>
                {focusId} <span className={styles.selectionChar}>({prettyChar(focusChar)})</span>
              </span>
            </div>
            <div className={styles.formula} aria-label="Lookup formula">
              X_emb[b, t, :] = E[X[b, t]]
            </div>
          <div className={styles.selectionHint}>Same ID → same row in E.</div>
          </div>

          <div className={styles.vectorInline} aria-label="Selected embedding vector">
            <div className={styles.vectorBarsBig} aria-hidden="true">
              {focusVec.map((v, i) => {
                const h = 14 + Math.abs(v) * 80
                return (
                  <div
                    key={i}
                    className={`${styles.coord} ${v >= 0 ? styles.pos : styles.neg}`}
                    style={{ height: `${h}%` }}
                  />
                )
              })}
            </div>
            <div className={styles.vectorHint}>
              That cell now holds <span className={styles.axisTag}>D</span> numbers. You usually never read them — you just
              multiply them by things.
            </div>
            <details className={`collapsible ${styles.vectorDetails}`}>
              <summary>Show the numeric values</summary>
              <div className={styles.valueGrid}>
                {focusVec.map((v, i) => (
                  <div key={i} className={`${styles.valueChip} ${v >= 0 ? styles.valueChipPos : styles.valueChipNeg}`}>
                    d{i}: {v.toFixed(2)}
                  </div>
                ))}
              </div>
            </details>
          </div>

          <div className={styles.detailNote}>
            This ID shows up <strong>{sameTokenCount}</strong> time{sameTokenCount === 1 ? '' : 's'} in the batch. Every one of those cells
            looks up the same row.
          </div>
        </div>
      </div>

      <details className={`collapsible ${styles.fullTensor}`}>
        <summary>Show the full tensor: X_emb[b, t, :]</summary>
        <div
          className={styles.grid}
          style={{ gridTemplateColumns: `repeat(${timeSteps}, minmax(0, 1fr))` }}
          aria-label="Embedding tensor grid"
        >
          {ids.map((row, b) =>
            row.map((id, t) => {
              const active = b === focusB && t === focusT
              const same = isSameToken(b, t)
              const vec = Array.from({ length: embedDim }, (_, i) => embedValue(id, i))
              return (
                <button
                  key={`${b}-${t}`}
                  type="button"
                  className={`${styles.cell} ${styles.embCell} ${active ? styles.active : ''} ${same ? styles.same : ''}`}
                  onClick={() => setFocus({ b, t })}
                  aria-label={`X_emb[${b}, ${t}, :] for token ${id}`}
                >
                  <div className={styles.vectorBars} aria-hidden="true">
                    {vec.map((v, i) => {
                      const h = 12 + Math.abs(v) * 70
                      return (
                        <div
                          key={i}
                          className={`${styles.coord} ${v >= 0 ? styles.pos : styles.neg}`}
                          style={{ height: `${h}%` }}
                        />
                      )
                    })}
                  </div>
                  <div className={styles.embBadge}>{prettyChar(VOCAB[id] ?? ' ')}</div>
                </button>
              )
            }),
          )}
        </div>
        <div className={styles.axisHint}>
          Each cell contains <span className={styles.axisTag}>D</span> numbers. Most of the time, you never look at them directly — you just
          multiply them by things.
        </div>
      </details>
    </div>
  )
}
