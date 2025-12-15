import { useState } from 'react'
import styles from './SparseMarkovViz.module.css'

// Word-level example showing sparsity: "dog sat" fails even though BOTH words exist!
// We saw "cat sat" and "dog ran", but never "dog sat"

export function SparseMarkovViz() {
  const [active, setActive] = useState<string | null>(null)

  const isNodeHighlighted = (id: string) => {
    if (!active) return true
    if (id === active) return true
    // Show connected nodes
    if (active === 'dog') return id === 'ran' || id === 'sat'
    if (active === 'cat') return id === 'sat'
    if (active === 'ran') return id === 'dog'
    if (active === 'sat') return id === 'cat' || id === 'dog'
    return false
  }

  const isEdgeHighlighted = (from: string, to: string) => {
    if (!active) return true
    return active === from || active === to
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.badge}>Word-Level</span>
        <span className={styles.title}>The Sparsity Problem</span>
      </div>

      <svg viewBox="0 0 420 220" className={styles.svg}>
        <defs>
          <marker
            id="arrow-good"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#22c55e" />
          </marker>
          <marker
            id="arrow-bad"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#ef4444" />
          </marker>
        </defs>

        {/* Good edge: dog → ran */}
        <g opacity={isEdgeHighlighted('dog', 'ran') ? 1 : 0.15}>
          <path d="M 132 60 L 288 60" fill="none" stroke="#22c55e" strokeWidth="2.5" markerEnd="url(#arrow-good)" />
          <text x="210" y="42" textAnchor="middle" fill="#22c55e" fontSize="12" fontWeight="600" fontFamily="var(--font-mono)">✓ seen</text>
        </g>

        {/* Good edge: cat → sat */}
        <g opacity={isEdgeHighlighted('cat', 'sat') ? 1 : 0.15}>
          <path d="M 132 160 L 288 160" fill="none" stroke="#22c55e" strokeWidth="2.5" markerEnd="url(#arrow-good)" />
          <text x="210" y="178" textAnchor="middle" fill="#22c55e" fontSize="12" fontWeight="600" fontFamily="var(--font-mono)">✓ seen</text>
        </g>

        {/* Bad edge: dog → sat (both words exist, but transition doesn't!) */}
        <g opacity={isEdgeHighlighted('dog', 'sat') ? 0.8 : 0.15}>
          <path d="M 120 92 L 300 128" fill="none" stroke="#ef4444" strokeWidth="2" strokeDasharray="6 4" markerEnd="url(#arrow-bad)" />
          <text x="210" y="95" textAnchor="middle" fill="#ef4444" fontSize="12" fontWeight="600" fontFamily="var(--font-mono)">✗ never seen</text>
        </g>

        {/* "dog" node - top left */}
        <g
          transform="translate(100, 60)"
          opacity={isNodeHighlighted('dog') ? 1 : 0.2}
          style={{ cursor: 'pointer' }}
          onMouseEnter={() => setActive('dog')}
          onMouseLeave={() => setActive(null)}
        >
          <circle
            r="30"
            fill="var(--bg-primary)"
            stroke="#f97316"
            strokeWidth={active === 'dog' ? 4 : 3}
            style={{
              filter: active === 'dog' ? 'drop-shadow(0 0 12px #f97316)' : 'none',
              transition: 'all 0.2s ease'
            }}
          />
          <text textAnchor="middle" dominantBaseline="middle" fill="#f97316" fontSize="16" fontWeight="700" fontFamily="var(--font-mono)">dog</text>
        </g>

        {/* "cat" node - bottom left */}
        <g
          transform="translate(100, 160)"
          opacity={isNodeHighlighted('cat') ? 1 : 0.2}
          style={{ cursor: 'pointer' }}
          onMouseEnter={() => setActive('cat')}
          onMouseLeave={() => setActive(null)}
        >
          <circle
            r="30"
            fill="var(--bg-primary)"
            stroke="#f97316"
            strokeWidth={active === 'cat' ? 4 : 3}
            style={{
              filter: active === 'cat' ? 'drop-shadow(0 0 12px #f97316)' : 'none',
              transition: 'all 0.2s ease'
            }}
          />
          <text textAnchor="middle" dominantBaseline="middle" fill="#f97316" fontSize="16" fontWeight="700" fontFamily="var(--font-mono)">cat</text>
        </g>

        {/* "ran" node - top right */}
        <g
          transform="translate(320, 60)"
          opacity={isNodeHighlighted('ran') ? 1 : 0.2}
          style={{ cursor: 'pointer' }}
          onMouseEnter={() => setActive('ran')}
          onMouseLeave={() => setActive(null)}
        >
          <circle
            r="30"
            fill="var(--bg-primary)"
            stroke="#22c55e"
            strokeWidth={active === 'ran' ? 4 : 3}
            style={{
              filter: active === 'ran' ? 'drop-shadow(0 0 12px #22c55e)' : 'none',
              transition: 'all 0.2s ease'
            }}
          />
          <text textAnchor="middle" dominantBaseline="middle" fill="#22c55e" fontSize="16" fontWeight="700" fontFamily="var(--font-mono)">ran</text>
        </g>

        {/* "sat" node - bottom right */}
        <g
          transform="translate(320, 160)"
          opacity={isNodeHighlighted('sat') ? 1 : 0.2}
          style={{ cursor: 'pointer' }}
          onMouseEnter={() => setActive('sat')}
          onMouseLeave={() => setActive(null)}
        >
          <circle
            r="30"
            fill="var(--bg-primary)"
            stroke="#22c55e"
            strokeWidth={active === 'sat' ? 4 : 3}
            style={{
              filter: active === 'sat' ? 'drop-shadow(0 0 12px #22c55e)' : 'none',
              transition: 'all 0.2s ease'
            }}
          />
          <text textAnchor="middle" dominantBaseline="middle" fill="#22c55e" fontSize="16" fontWeight="700" fontFamily="var(--font-mono)">sat</text>
        </g>
      </svg>

      <p className={styles.caption}>
        "cat sat" works, "dog ran" works—but "dog sat"? Never seen together. P = 0.
      </p>
    </div>
  )
}
