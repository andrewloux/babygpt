import { useMemo, useState } from 'react'
import styles from './NgramGraphViz.module.css'

const DEFAULT_CORPUS = ['cat sat', 'dog ran', 'a can', 'a cat']

const START = '<START>'
const END = '<END>'

type Edge = {
  from: string
  to: string
  prob: number
  count: number
}

type Node = {
  id: string
  label: string
  x: number
  y: number
  color: string
}

function tokenizeWords(s: string): string[] {
  return s
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean)
}

function formatNodeLabel(id: string): string {
  if (id === START) return 'START'
  if (id === END) return 'END'
  return id
}

function buildBigramModel(corpus: string[]): { nodes: string[]; edges: Edge[] } {
  const counts = new Map<string, Map<string, number>>()
  const allNodes = new Set<string>([START, END])

  for (const sentence of corpus) {
    const words = tokenizeWords(sentence)
    const tokens = [START, ...words, END]

    for (let i = 0; i < tokens.length - 1; i++) {
      const from = tokens[i]
      const to = tokens[i + 1]

      allNodes.add(from)
      allNodes.add(to)

      const inner = counts.get(from) ?? new Map<string, number>()
      inner.set(to, (inner.get(to) ?? 0) + 1)
      counts.set(from, inner)
    }
  }

  const edges: Edge[] = []
  for (const [from, nextCounts] of counts.entries()) {
    const total = Array.from(nextCounts.values()).reduce((a, b) => a + b, 0)
    for (const [to, count] of nextCounts.entries()) {
      edges.push({ from, to, count, prob: total === 0 ? 0 : count / total })
    }
  }

  edges.sort((a, b) => {
    if (a.from !== b.from) return a.from.localeCompare(b.from)
    if (b.count !== a.count) return b.count - a.count
    return a.to.localeCompare(b.to)
  })

  const nodes = Array.from(allNodes)
  nodes.sort((a, b) => {
    if (a === START) return -1
    if (b === START) return 1
    if (a === END) return 1
    if (b === END) return -1
    return a.localeCompare(b)
  })

  return { nodes, edges }
}

function computeLevels(nodes: string[], edges: Edge[]): Map<string, number> {
  const levels = new Map<string, number>()
  const outgoing = new Map<string, string[]>()

  for (const node of nodes) outgoing.set(node, [])
  for (const edge of edges) outgoing.get(edge.from)?.push(edge.to)

  const queue: string[] = [START]
  levels.set(START, 0)

  while (queue.length > 0) {
    const cur = queue.shift()
    if (!cur) continue

    const curLevel = levels.get(cur) ?? 0
    const next = outgoing.get(cur) ?? []
    for (const to of next) {
      if (to === END) continue // END is terminal; we place it at the far right separately
      if (!levels.has(to)) {
        levels.set(to, curLevel + 1)
        queue.push(to)
      }
    }
  }

  const max = Math.max(0, ...Array.from(levels.values()))
  for (const node of nodes) {
    if (node === END) continue
    if (!levels.has(node)) levels.set(node, max + 1)
  }

  levels.set(END, max + 2)
  return levels
}

function layoutNodes(nodes: string[], edges: Edge[]): Node[] {
  const levels = computeLevels(nodes, edges)
  const maxLevel = Math.max(0, ...Array.from(levels.values()))

  const width = 700
  const height = 480
  const marginX = 60
  const marginY = 60

  const xStep = maxLevel === 0 ? 0 : (width - 2 * marginX) / maxLevel

  const byLevel = new Map<number, string[]>()
  for (const id of nodes) {
    const lvl = levels.get(id) ?? 0
    const arr = byLevel.get(lvl) ?? []
    arr.push(id)
    byLevel.set(lvl, arr)
  }

  for (const [lvl, arr] of byLevel.entries()) {
    arr.sort((a, b) => {
      if (a === START) return -1
      if (b === START) return 1
      if (a === END) return 1
      if (b === END) return -1
      return a.localeCompare(b)
    })
    byLevel.set(lvl, arr)
  }

  // Reduce edge crossings by ordering each "layer" based on where its incoming edges come from.
  // (A tiny barycentric pass: sort level L nodes by the average index of their parents in level L-1.)
  for (let lvl = 1; lvl <= maxLevel; lvl++) {
    const prev = byLevel.get(lvl - 1) ?? []
    const cur = byLevel.get(lvl) ?? []
    if (prev.length === 0 || cur.length === 0) continue

    const prevIndex = new Map<string, number>()
    for (let i = 0; i < prev.length; i++) prevIndex.set(prev[i], i)

    const scoreFor = (id: string): number => {
      const parents = edges
        .filter((e) => e.to === id && (levels.get(e.from) ?? 0) === lvl - 1)
        .map((e) => prevIndex.get(e.from))
        .filter((x): x is number => x !== undefined)
      if (parents.length === 0) return Number.POSITIVE_INFINITY
      const sum = parents.reduce((a, b) => a + b, 0)
      return sum / parents.length
    }

    const oldIndex = new Map<string, number>()
    for (let i = 0; i < cur.length; i++) oldIndex.set(cur[i], i)

    cur.sort((a, b) => {
      const sa = scoreFor(a)
      const sb = scoreFor(b)
      if (sa !== sb) return sa - sb
      return (oldIndex.get(a) ?? 0) - (oldIndex.get(b) ?? 0)
    })
    byLevel.set(lvl, cur)
  }

  const getColor = (id: string) => {
    if (id === START) return 'var(--accent-cyan)'
    if (id === END) return 'var(--accent-magenta)'
    return '#f97316'
  }

  const result: Node[] = []
  for (let lvl = 0; lvl <= maxLevel; lvl++) {
    const ids = byLevel.get(lvl) ?? []
    const k = ids.length
    const yStep = k === 0 ? 0 : (height - 2 * marginY) / (k + 1)

    for (let i = 0; i < ids.length; i++) {
      const id = ids[i]
      result.push({
        id,
        label: formatNodeLabel(id),
        x: marginX + xStep * lvl,
        y: marginY + yStep * (i + 1),
        color: getColor(id),
      })
    }
  }

  return result
}

function createPath(from: Node, to: Node, radius: number): string {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist === 0) return `M ${from.x} ${from.y} L ${to.x} ${to.y}`

  const nx = dx / dist
  const ny = dy / dist
  const startX = from.x + nx * radius
  const startY = from.y + ny * radius
  const endX = to.x - nx * radius
  const endY = to.y - ny * radius
  return `M ${startX} ${startY} L ${endX} ${endY}`
}

function labelPos(from: Node, to: Node, extraOffset: number): { x: number; y: number } {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist === 0) return { x: from.x, y: from.y }

  const nx = dx / dist
  const ny = dy / dist
  // Perpendicular offset keeps labels away from the edge; the extraOffset spreads
  // multiple outgoing labels so they don't sit on top of each other.
  const base = 46
  const offset = base + extraOffset
  const midX = (from.x + to.x) / 2 + ny * offset
  const midY = (from.y + to.y) / 2 - nx * offset
  return { x: midX, y: midY }
}

type NgramGraphVizProps = {
  corpus?: string[]
}

export function NgramGraphViz({ corpus = DEFAULT_CORPUS }: NgramGraphVizProps) {
  const [active, setActive] = useState<string | null>(null)

  const model = useMemo(() => buildBigramModel(corpus), [corpus])
  const nodes = useMemo(() => layoutNodes(model.nodes, model.edges), [model.nodes, model.edges])

  const nodeById = useMemo(() => {
    const m = new Map<string, Node>()
    for (const n of nodes) m.set(n.id, n)
    return m
  }, [nodes])

  const labelOffsets = useMemo(() => {
    // Spread labels for edges leaving the same node to reduce overlap.
    const byFrom = new Map<string, Edge[]>()
    for (const e of model.edges) {
      const list = byFrom.get(e.from) ?? []
      list.push(e)
      byFrom.set(e.from, list)
    }

    const offsets = new Map<string, number>()
    for (const [_from, list] of byFrom.entries()) {
      const sorted = [...list].sort((a, b) => {
        const ay = nodeById.get(a.to)?.y ?? 0
        const by = nodeById.get(b.to)?.y ?? 0
        return ay - by
      })
      const k = sorted.length
      const mid = (k - 1) / 2
      for (let i = 0; i < sorted.length; i++) {
        const e = sorted[i]
        offsets.set(`${e.from}→${e.to}`, (i - mid) * 14)
      }
    }
    return offsets
  }, [model.edges, nodeById])

  const isEdgeHighlighted = (from: string, to: string) => {
    if (!active) return true
    return active === from || active === to
  }

  const isNodeHighlighted = (id: string) => {
    if (!active) return true
    if (id === active) return true
    return model.edges.some((e) => (e.from === active && e.to === id) || (e.to === active && e.from === id))
  }

  const nodeRadius = 28

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleBlock}>
          <div className={styles.title}>A Markov chain from counts</div>
          <div className={styles.subtitle}>Word bigrams (n = 2) built from the toy corpus</div>
        </div>
        <div className={styles.badge}>STATE = 1 WORD</div>
      </div>

      <div className={styles.corpus}>
        <div className={styles.corpusLabel}>Training corpus</div>
        {corpus.map((s, i) => (
          <div key={`${i}-${s}`} className={styles.corpusLine}>
            {i + 1}. <code>{s}</code>
          </div>
        ))}
      </div>

      <svg viewBox="0 0 700 480" className={styles.svg} role="img" aria-label="Bigram Markov chain graph">
        <defs>
          <marker
            id="ngram-arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--text-muted)" />
          </marker>
          <marker
            id="ngram-arrow-active"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--accent-cyan)" />
          </marker>
        </defs>

        {model.edges.map((edge, i) => {
          const from = nodeById.get(edge.from)
          const to = nodeById.get(edge.to)
          if (!from || !to) return null

          const highlighted = isEdgeHighlighted(edge.from, edge.to)
          const isActive = active === edge.from
          const showLabel = active !== null && edge.from === active

          const path = createPath(from, to, nodeRadius)
          const extraOffset = labelOffsets.get(`${edge.from}→${edge.to}`) ?? 0
          const pos = labelPos(from, to, extraOffset)

          return (
            <g key={`${edge.from}-${edge.to}-${i}`} opacity={highlighted ? 1 : 0.12}>
              <path
                d={path}
                fill="none"
                stroke={isActive ? 'var(--accent-cyan)' : 'var(--text-muted)'}
                strokeWidth={isActive ? 3 : 2}
                markerEnd={isActive ? 'url(#ngram-arrow-active)' : 'url(#ngram-arrow)'}
              />
              <text
                x={pos.x}
                y={pos.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className={styles.edgeLabel}
                fill={isActive ? 'var(--accent-cyan)' : 'var(--text-secondary)'}
                fontSize="13"
                fontWeight="700"
                fontFamily="var(--font-mono)"
                opacity={showLabel ? 1 : 0}
              >
                {edge.prob.toFixed(2)}
              </text>
            </g>
          )
        })}

        {nodes.map((node) => {
          const highlighted = isNodeHighlighted(node.id)
          const isActive = active === node.id

          return (
            <g
              key={node.id}
              transform={`translate(${node.x}, ${node.y})`}
              opacity={highlighted ? 1 : 0.18}
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setActive(node.id)}
              onMouseLeave={() => setActive(null)}
            >
              <circle
                r={nodeRadius}
                fill="var(--bg-primary)"
                stroke={node.color}
                strokeWidth={isActive ? 4 : 3}
                style={{
                  filter: isActive ? `drop-shadow(0 0 12px ${node.color})` : 'none',
                  transition: 'all 0.2s ease',
                }}
              />
              <text
                textAnchor="middle"
                dominantBaseline="middle"
                fill={node.color}
                fontSize={node.label.length > 4 ? 12 : 14}
                fontWeight="800"
                fontFamily="var(--font-mono)"
              >
                {node.label}
              </text>
            </g>
          )
        })}
      </svg>

      <div className={styles.caption}>
        Hover a node to highlight its outgoing edges (and reveal the probabilities). Each arrow label is{' '}
        <em>P(next word | current word)</em>, estimated from counts.
      </div>
    </div>
  )
}
