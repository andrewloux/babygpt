import { useEffect, useMemo, useState } from 'react'
import styles from './KenLMDemo.module.css'

type Entry = {
  key: string
  prob: number
  backoff: number
}

type Slot = {
  key: string
  hash: bigint
  homeIndex: number
  prob: number
  backoff: number
}

type ProbeStep =
  | { index: number; kind: 'collision'; slot: Slot }
  | { index: number; kind: 'hit'; slot: Slot }
  | { index: number; kind: 'empty' }

type ProbeTrace = {
  query: string
  hash: bigint
  homeIndex: number
  steps: ProbeStep[]
  result: 'hit' | 'miss' | 'full'
}

const MAX_QUERY_CHARS = 20
const MEMORY_SIZE = 16

const FNV_OFFSET_BASIS_64 = 0xcbf29ce484222325n
const FNV_PRIME_64 = 0x100000001b3n

function fnv1a64(input: string): bigint {
  let hash = FNV_OFFSET_BASIS_64
  for (let i = 0; i < input.length; i++) {
    hash ^= BigInt(input.charCodeAt(i))
    hash = (hash * FNV_PRIME_64) & 0xffffffffffffffffn
  }
  return hash
}

function hex64(hash: bigint) {
  return hash.toString(16).padStart(16, '0')
}

function prettyHex64(hash: bigint) {
  const h = hex64(hash)
  return `0x${h.slice(0, 4)}…${h.slice(-4)}`
}

function normalizeQueryForInput(raw: string) {
  return raw
    .toLowerCase()
    .replace(/[^a-z ]/g, '')
    .replace(/\s+/g, ' ')
    .trimStart()
    .slice(0, MAX_QUERY_CHARS)
}

function normalizeQuery(raw: string) {
  return normalizeQueryForInput(raw).trim()
}

const INITIAL_ENTRIES: Entry[] = [
  { key: 'a can', prob: -1.6, backoff: -0.3 },
  { key: 'cat sat', prob: -0.7, backoff: -0.2 },
  { key: 'a cat', prob: -0.9, backoff: -0.2 },
  { key: 'the cat', prob: -0.5, backoff: -0.1 },
  { key: 'the cat ate', prob: -1.2, backoff: -0.4 },
  { key: 'dog ran', prob: -0.8, backoff: -0.2 },
  { key: 'the dog sat', prob: -1.9, backoff: -0.6 },
  { key: 'the dog ran', prob: -1.5, backoff: -0.5 },
]

const PRESETS = [
  { label: 'the cat ate', value: 'the cat ate' },
  { label: 'the cat', value: 'the cat' },
  { label: 'a cat', value: 'a cat' },
  { label: 'the dog', value: 'the dog' },
  { label: 'cat ran', value: 'cat ran' },
]

function buildTable(entries: Entry[]) {
  const table: Array<Slot | null> = Array.from({ length: MEMORY_SIZE }, () => null)

  for (const entry of entries) {
    const hash = fnv1a64(entry.key)
    const homeIndex = Number(hash % BigInt(MEMORY_SIZE))
    const slot: Slot = { key: entry.key, hash, homeIndex, prob: entry.prob, backoff: entry.backoff }

    for (let probe = 0; probe < MEMORY_SIZE; probe++) {
      const idx = (homeIndex + probe) % MEMORY_SIZE
      if (table[idx] === null) {
        table[idx] = slot
        break
      }
    }
  }

  return table
}

function computeTrace(query: string, table: Array<Slot | null>): ProbeTrace {
  const hash = fnv1a64(query)
  const homeIndex = Number(hash % BigInt(MEMORY_SIZE))
  const steps: ProbeStep[] = []

  for (let probe = 0; probe < MEMORY_SIZE; probe++) {
    const idx = (homeIndex + probe) % MEMORY_SIZE
    const slot = table[idx]

    if (slot === null) {
      steps.push({ index: idx, kind: 'empty' })
      return { query, hash, homeIndex, steps, result: 'miss' }
    }

    if (slot.key === query) {
      steps.push({ index: idx, kind: 'hit', slot })
      return { query, hash, homeIndex, steps, result: 'hit' }
    }

    steps.push({ index: idx, kind: 'collision', slot })
  }

  return { query, hash, homeIndex, steps, result: 'full' }
}

export function KenLMDemo() {
  const [rawQuery, setRawQuery] = useState('the cat ate')
  const query = useMemo(() => normalizeQuery(rawQuery), [rawQuery])
  const table = useMemo(() => buildTable(INITIAL_ENTRIES), [])

  // 0: idle, 1: hash computed, 2+: probing steps
  const [step, setStep] = useState(0)
  const [trace, setTrace] = useState<ProbeTrace | null>(null)

  useEffect(() => {
    setStep(0)
    setTrace(null)
  }, [query])

  const shownProbeSteps = trace ? Math.max(0, Math.min(step - 1, trace.steps.length)) : 0
  const shownSteps = trace ? trace.steps.slice(0, shownProbeSteps) : []
  const lastShownStep = shownSteps.length > 0 ? shownSteps[shownSteps.length - 1] : null
  const activeIndex = lastShownStep ? lastShownStep.index : null
  const isDone = trace ? step >= trace.steps.length + 1 : false

  const stepByIndex = useMemo(() => {
    const map = new Map<number, ProbeStep>()
    for (const s of shownSteps) map.set(s.index, s)
    return map
  }, [shownSteps])

  const nextStep = () => {
    if (step === 0) {
      if (query.length === 0) return
      const t = computeTrace(query, table)
      setTrace(t)
      setStep(1)
      return
    }

    if (!trace) return

    if (isDone) {
      setStep(0)
      setTrace(null)
      return
    }

    setStep((s) => s + 1)
  }

  const buttonLabel = step === 0 ? 'Trace Lookup' : isDone ? 'Reset' : 'Next Step'

  const statusLine = (() => {
    if (step === 0) return 'Pick a query, then trace the probes.'
    if (!trace) return ''
    if (step === 1) return `Hash("${trace.query}") → index ${trace.homeIndex}`
    if (!lastShownStep) return ''

    if (lastShownStep.kind === 'collision') {
      return `Index ${lastShownStep.index}: occupied by "${lastShownStep.slot.key}" → keep probing`
    }
    if (lastShownStep.kind === 'hit') {
      return `Index ${lastShownStep.index}: match → prob ${lastShownStep.slot.prob}, backoff ${lastShownStep.slot.backoff}`
    }

    return `Index ${lastShownStep.index}: empty → stop (not in table)`
  })()

  const probePath = trace
    ? trace.steps
        .slice(0, shownProbeSteps)
        .map((s) => s.index)
        .join(' → ')
    : ''

  return (
    <div className={styles.container}>
      <div className={styles.title}>KenLM / Linear Probing</div>
      <div className={styles.subtitle}>A tiny packed-array lookup, step by step</div>

      <div className={styles.layout}>
        <div className={styles.left}>
          <div className={styles.controls}>
            <label className={styles.queryLabel} htmlFor="kenlm-query">
              Query
            </label>
            <input
              id="kenlm-query"
              className={styles.queryInput}
              value={rawQuery}
              onChange={(e) => setRawQuery(normalizeQueryForInput(e.target.value))}
              placeholder="e.g. the cat ate"
              inputMode="text"
              autoComplete="off"
              spellCheck={false}
              maxLength={MAX_QUERY_CHARS}
            />

            <div className={styles.presetRow}>
              {PRESETS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  className={styles.presetBtn}
                  onClick={() => setRawQuery(p.value)}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <button className={styles.actionBtn} onClick={nextStep} disabled={query.length === 0}>
              {buttonLabel}
            </button>

            <div className={styles.status}>
              <div className={styles.statusLine}>{statusLine}</div>
              {trace && step >= 1 ? (
                <div className={styles.metaRow}>
                  <span className={styles.metaLabel}>hash64</span>
                  <span className={styles.metaValue} title={`0x${hex64(trace.hash)}`}>
                    {prettyHex64(trace.hash)}
                  </span>
                  <span className={styles.metaDivider} />
                  <span className={styles.metaLabel}>home</span>
                  <span className={styles.metaValue}>{trace.homeIndex}</span>
                </div>
              ) : null}
              {probePath ? <div className={styles.path}>path: {probePath}</div> : null}
            </div>

            <div className={styles.note}>
              Order stays intact because the hash is order-sensitive: <span className={styles.mono}>Hash("dog sat") ≠ Hash("sat dog")</span>.
            </div>
          </div>
        </div>

        <div className={styles.right}>
          <div className={styles.memoryTitle}>
            Packed Array (<span className={styles.mono}>{MEMORY_SIZE}</span> slots)
          </div>

          <div className={styles.memoryGrid}>
            {table.map((slot, i) => {
              const stepInfo = stepByIndex.get(i)
              const isActive = activeIndex === i
              const isVisited = stepInfo !== undefined

              const classes = [
                styles.slot,
                isVisited ? styles.visited : '',
                isActive ? styles.active : '',
                stepInfo?.kind === 'collision' ? styles.collision : '',
                stepInfo?.kind === 'hit' ? styles.hit : '',
                stepInfo?.kind === 'empty' ? styles.miss : '',
              ]
                .filter(Boolean)
                .join(' ')

              return (
                <div key={i} className={classes}>
                  <div className={styles.slotHeader}>
                    <span className={styles.slotIndex}>@ {i.toString().padStart(2, '0')}</span>
                    {slot && slot.homeIndex !== i ? (
                      <span className={styles.slotHome}>home {slot.homeIndex}</span>
                    ) : (
                      <span className={styles.slotHomeMuted}>home</span>
                    )}
                  </div>

                  {slot ? (
                    <>
                      <div className={styles.packedRow}>
                        <div className={styles.packedCell}>
                          <div className={styles.cellHeader}>
                            <span className={styles.cellLabel}>Hash (8B)</span>
                            <span className={styles.cellOffset}>@ +0x00</span>
                          </div>
                          <span className={`${styles.cellValue} ${styles.cellHighlight}`} title={`0x${hex64(slot.hash)}`}>
                            {prettyHex64(slot.hash)}
                          </span>
                        </div>

                        <div className={styles.packedCell}>
                          <div className={styles.cellHeader}>
                            <span className={styles.cellLabel}>Prob (4B)</span>
                            <span className={styles.cellOffset}>@ +0x08</span>
                          </div>
                          <span className={styles.cellValue}>{slot.prob.toFixed(1)}</span>
                        </div>

                        <div className={styles.packedCell}>
                          <div className={styles.cellHeader}>
                            <span className={styles.cellLabel}>Backoff (4B)</span>
                            <span className={styles.cellOffset}>@ +0x0C</span>
                          </div>
                          <span className={styles.cellValue}>{slot.backoff.toFixed(1)}</span>
                        </div>
                      </div>

                      <div className={styles.keyLine} title={slot.key}>
                        "{slot.key}"
                      </div>
                    </>
                  ) : (
                    <div className={styles.emptySlot}>(empty)</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
