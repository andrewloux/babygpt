import React, { useState } from 'react'
import styles from './AbstractionChainViz.module.css'

interface Station {
  id: string
  label: string
  sublabel: string
  example: string
  description: string
  icon: string
}

const stations: Station[] = [
  {
    id: 'colors',
    label: 'Colors',
    sublabel: 'Physical Reality',
    icon: '🎨',
    example: 'RGB(255, 128, 64)',
    description: 'Physical wavelengths of light hitting your retina. Concrete, measurable, but not yet mathematical.'
  },
  {
    id: 'coords1',
    label: 'Coordinates',
    sublabel: 'Measurement',
    icon: '📊',
    example: '[255, 128, 64]',
    description: 'Numbers that measure the physical reality. Now we have a vector in R³.'
  },
  {
    id: 'algebra',
    label: 'Algebra',
    sublabel: 'Operations',
    icon: '∑',
    example: 'A + B, αA',
    description: 'Vector addition and scalar multiplication. The rules that let us manipulate coordinates.'
  },
  {
    id: 'structure',
    label: 'Structure',
    sublabel: 'Linguistic Patterns',
    icon: '🔤',
    example: '"cat" → "cats"',
    description: 'Language has patterns like colors had wavelengths. Plural, tense, meaning relationships.'
  },
  {
    id: 'coords2',
    label: 'Coordinates',
    sublabel: 'Embeddings',
    icon: '🎯',
    example: '[0.2, -0.5, ..., 0.8]',
    description: 'Vectors in Rᵈ that capture linguistic structure. Same algebra, different domain.'
  }
]

export const AbstractionChainViz: React.FC = () => {
  const [activeStation, setActiveStation] = useState<string | null>(null)
  const [hoveredStation, setHoveredStation] = useState<string | null>(null)

  const displayStation = activeStation || hoveredStation

  return (
    <div className={styles.container}>
      <div className={styles.ambientGlow} />

      <div className={styles.card}>
        <div className={styles.header}>
          <div>
            <h3 className={styles.title}>The Abstraction Chain</h3>
            <p className={styles.subtitle}>From Physics to Embeddings</p>
          </div>
          <span className={styles.figNum}>Fig 2.1</span>
        </div>

        <div className={styles.subway}>
          <svg className={styles.rail} viewBox="0 0 1000 100" preserveAspectRatio="none">
            {/* Main rail line */}
            <line
              x1="50"
              y1="50"
              x2="950"
              y2="50"
              stroke="url(#railGradient)"
              strokeWidth="4"
              strokeLinecap="round"
            />

            {/* Gradient definition */}
            <defs>
              <linearGradient id="railGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(239, 68, 68, 0.3)" />
                <stop offset="25%" stopColor="rgba(139, 92, 246, 0.3)" />
                <stop offset="50%" stopColor="rgba(59, 130, 246, 0.3)" />
                <stop offset="75%" stopColor="rgba(16, 185, 129, 0.3)" />
                <stop offset="100%" stopColor="rgba(34, 197, 94, 0.3)" />
              </linearGradient>
            </defs>
          </svg>

          <div className={styles.stations}>
            {stations.map((station, index) => {
              const isActive = activeStation === station.id
              const isHovered = hoveredStation === station.id
              const isFinal = station.id === 'coords2'

              return (
                <div
                  key={station.id}
                  className={`${styles.stationWrapper} ${
                    isFinal ? styles.finalStation : ''
                  }`}
                  style={{ left: `${(index / (stations.length - 1)) * 100}%` }}
                >
                  <button
                    className={`${styles.station} ${
                      isActive ? styles.stationActive : ''
                    } ${isHovered ? styles.stationHovered : ''} ${
                      isFinal ? styles.stationFinal : ''
                    }`}
                    onClick={() => setActiveStation(isActive ? null : station.id)}
                    onMouseEnter={() => setHoveredStation(station.id)}
                    onMouseLeave={() => setHoveredStation(null)}
                    aria-label={`${station.label}: ${station.description}`}
                  >
                    <div className={styles.stationIcon}>{station.icon}</div>
                    {isFinal && <div className={styles.pulse} />}
                  </button>

                  <div className={styles.stationLabel}>
                    <div className={styles.stationName}>{station.label}</div>
                    <div className={styles.stationSub}>{station.sublabel}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {displayStation && (
          <div className={styles.detail}>
            <div className={styles.detailHeader}>
              <span className={styles.detailIcon}>
                {stations.find(s => s.id === displayStation)?.icon}
              </span>
              <span className={styles.detailTitle}>
                {stations.find(s => s.id === displayStation)?.label}
              </span>
            </div>

            <div className={styles.detailContent}>
              <div className={styles.detailExample}>
                <span className={styles.exampleLabel}>Example:</span>
                <code className={styles.exampleCode}>
                  {stations.find(s => s.id === displayStation)?.example}
                </code>
              </div>

              <p className={styles.detailDescription}>
                {stations.find(s => s.id === displayStation)?.description}
              </p>
            </div>
          </div>
        )}

        <div className={styles.footer}>
          <p className={styles.footerText}>
            The same mathematical machinery (<span className={styles.highlightAlgebra}>vectors + algebra</span>)
            works at both ends of the chain. Color mixing taught us the{' '}
            <span className={styles.highlightPattern}>pattern</span>, embeddings apply it to language.
          </p>
        </div>
      </div>
    </div>
  )
}
