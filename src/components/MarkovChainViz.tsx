import { useState } from 'react'
import styles from './MarkovChainViz.module.css'

// Shows how "dog sat" can be reconstructed from character transitions
// even though we never saw "dog sat" as a phrase in our corpus
// Corpus: "cat sat", "dog ran", "a can", "a cat"
const nodes = [
  { id: 'd', x: 70, y: 80, color: '#f97316' },
  { id: 'o', x: 170, y: 80, color: '#f97316' },
  { id: 'g', x: 270, y: 80, color: '#f97316' },
  { id: ' ', label: '␣', x: 370, y: 140, color: '#a855f7' },
  { id: 's', x: 270, y: 200, color: '#22c55e' },
  { id: 'a', x: 170, y: 200, color: '#22c55e' },
  { id: 't', x: 70, y: 200, color: '#22c55e' },
]

// Transitions with real probabilities from corpus "cat sat", "dog ran", "a can", "a cat"
const edges = [
  { from: 'd', to: 'o', prob: 1.0 },   // d only in "dog"
  { from: 'o', to: 'g', prob: 1.0 },   // o only in "dog"
  { from: 'g', to: ' ', prob: 1.0 },   // g only in "dog "
  { from: ' ', to: 's', prob: 0.25 },  // space→s (1 of 4 spaces)
  { from: 's', to: 'a', prob: 1.0 },   // s only in "sat"
  { from: 'a', to: 't', prob: 0.43 },  // a→t is 3/7
]

function getNode(id: string) {
  return nodes.find(n => n.id === id)
}

function segmentEndpoints(
  from: { x: number; y: number },
  to: { x: number; y: number },
  radius: number,
) {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist === 0) {
    return {
      startX: from.x,
      startY: from.y,
      endX: to.x,
      endY: to.y,
      nx: 0,
      ny: 0,
    }
  }

  const nx = dx / dist
  const ny = dy / dist
  return {
    startX: from.x + nx * radius,
    startY: from.y + ny * radius,
    endX: to.x - nx * radius,
    endY: to.y - ny * radius,
    nx,
    ny,
  }
}

// Create a curved path between two points
function createPath(from: { x: number; y: number }, to: { x: number; y: number }, curve: number = 0) {
  // Shorten to not overlap nodes (radius 28)
  const r = 32
  const { startX, startY, endX, endY, nx, ny } = segmentEndpoints(from, to, r)

  if (curve === 0) {
    return `M ${startX} ${startY} L ${endX} ${endY}`
  }

  // Quadratic curve
  const midX = (startX + endX) / 2 - ny * curve
  const midY = (startY + endY) / 2 + nx * curve
  return `M ${startX} ${startY} Q ${midX} ${midY} ${endX} ${endY}`
}

function getLabelPos(from: { x: number; y: number }, to: { x: number; y: number }, _curve: number = 0) {
  const r = 32
  const { startX, startY, endX, endY, nx, ny } = segmentEndpoints(from, to, r)

  // Perpendicular offset to keep labels away from edges.
  const perpOffset = 46
  const midX = (startX + endX) / 2 + ny * perpOffset
  const midY = (startY + endY) / 2 - nx * perpOffset
  return { x: midX, y: midY }
}

export function MarkovChainViz() {
  const [active, setActive] = useState<string | null>(null)

  const isHighlighted = (fromId: string, toId: string) => {
    if (!active) return true
    return fromId === active || toId === active
  }

  const isNodeHighlighted = (id: string) => {
    if (!active) return true
    if (id === active) return true
    return edges.some(e => (e.from === active && e.to === id) || (e.to === active && e.from === id))
  }

  return (
    <div className={styles.container}>
      <svg viewBox="0 0 440 280" className={styles.svg}>
        <defs>
          <marker
            id="arrow"
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
            id="arrow-active"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#f97316" />
          </marker>
        </defs>

        {/* Edges */}
        {edges.map((edge, i) => {
          const from = getNode(edge.from)
          const to = getNode(edge.to)
          if (!from || !to) return null

          const highlighted = isHighlighted(edge.from, edge.to)
          const isActive = active === edge.from

          // Determine curve direction for bidirectional edges
          let curve = 0
          const hasReverse = edges.some(e => e.from === edge.to && e.to === edge.from)
          if (hasReverse) {
            curve = edge.from < edge.to ? 40 : -40
          }

          const path = createPath(from, to, curve)
          const labelPos = getLabelPos(from, to, curve)

          return (
            <g key={i} opacity={highlighted ? 1 : 0.15}>
              <path
                d={path}
                fill="none"
                stroke={isActive ? '#f97316' : 'var(--text-muted)'}
                strokeWidth={isActive ? 3 : 2}
                markerEnd={isActive ? 'url(#arrow-active)' : 'url(#arrow)'}
              />
              <text
                x={labelPos.x}
                y={labelPos.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className={styles.edgeLabel}
                fill={isActive ? '#f97316' : 'var(--text-secondary)'}
                fontSize="14"
                fontWeight="600"
                fontFamily="var(--font-mono)"
              >
                {edge.prob.toFixed(2)}
              </text>
            </g>
          )
        })}

        {/* Nodes */}
        {nodes.map(node => {
          const highlighted = isNodeHighlighted(node.id)
          const isActive = active === node.id

          return (
            <g
              key={node.id}
              transform={`translate(${node.x}, ${node.y})`}
              opacity={highlighted ? 1 : 0.2}
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setActive(node.id)}
              onMouseLeave={() => setActive(null)}
            >
              <circle
                r="28"
                fill="var(--bg-primary)"
                stroke={node.color}
                strokeWidth={isActive ? 4 : 3}
                style={{
                  filter: isActive ? `drop-shadow(0 0 12px ${node.color})` : 'none',
                  transition: 'all 0.2s ease'
                }}
              />
              <text
                textAnchor="middle"
                dominantBaseline="middle"
                fill={node.color}
                fontSize="22"
                fontWeight="700"
                fontFamily="var(--font-mono)"
              >
                {node.label || node.id}
              </text>
            </g>
          )
        })}
      </svg>

      <p className={styles.caption}>
        The <span style={{ color: '#a855f7', fontWeight: 600 }}>Space</span> node is the mechanical bridge. It connects the end of "dog" to the start of "sat", allowing us to generate a phrase that never appeared in the training data.
      </p>
    </div>
  )
}
