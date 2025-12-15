import { useMemo, useState, useRef, useEffect } from 'react'
import styles from './DecoderDemo.module.css'

// --- Data & Logic ---

type Node = {
  id: string
  word: string
  acousticLog: number
  lmLog: number
  totalLog: number
  parentId: string | null
  stepIndex: number
  isBest?: boolean
}

// Fixed acoustic candidates per step
const STEPS_DATA = [
  {
    label: 'Start',
    candidates: [],
  },
  {
    label: 'Step 1 (Ambig.)',
    candidates: [
      { word: 'we', acoustic: 0.45 },
      { word: 'you', acoustic: 0.4 },
      { word: 'new', acoustic: 0.15 },
    ],
  },
  {
    label: 'Step 2',
    candidates: [
      { word: 'need', acoustic: 0.3 },
      { word: 'neat', acoustic: 0.4 },
      { word: 'knee', acoustic: 0.3 },
    ],
  },
  {
    label: 'Step 3',
    candidates: [
      { word: 'data', acoustic: 0.4 },
      { word: 'date', acoustic: 0.35 },
      { word: 'dada', acoustic: 0.25 },
    ],
  },
]

// Tiny LM
const LM: Record<string, Record<string, number>> = {
  '<s>': { we: 0.45, you: 0.35, new: 0.2 },
  we: { need: 0.7, neat: 0.05, knee: 0.02 },
  you: { need: 0.25, neat: 0.05, knee: 0.05 },
  new: { need: 0.15, neat: 0.15, knee: 0.1 },
  need: { data: 0.65, date: 0.1, dada: 0.03 },
  neat: { data: 0.06, date: 0.05, dada: 0.02 },
  knee: { data: 0.01, date: 0.01, dada: 0.005 },
}

function getLmProb(prev: string, next: string) {
  return LM[prev]?.[next] ?? 1e-6
}

function safeLog(p: number) {
  return Math.log(Math.max(1e-9, p))
}

// --- Component ---

export function DecoderDemo() {
  const [beamWidth, setBeamWidth] = useState(2)
  const [lmWeight, setLmWeight] = useState(1.0)
  
  // Ref for drawing lines
  const containerRef = useRef<HTMLDivElement>(null)
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number; h: number }>>({})

  // 1. Calculate the entire Tree based on current settings
  const { columns, totalLookups } = useMemo(() => {
    let lookups = 0
    // Start node
    const root: Node = {
      id: 'root',
      word: '<s>',
      acousticLog: 0,
      lmLog: 0,
      totalLog: 0,
      parentId: null,
      stepIndex: 0,
    }

    const cols: { survivors: Node[]; pruned: Node[] }[] = []
    
    // Step 0: Just the root
    cols.push({ survivors: [root], pruned: [] })

    // Iterate steps
    let currentSurvivors = [root]

    for (let t = 1; t < STEPS_DATA.length; t++) {
      const candidatesData = STEPS_DATA[t].candidates
      const nextNodes: Node[] = []

      // Expand ALL survivors
      for (const parent of currentSurvivors) {
        // Count lookups: 1 LM lookup per candidate per parent
        lookups += candidatesData.length 

        for (const cand of candidatesData) {
          const lmP = getLmProb(parent.word === '<s>' && t === 1 ? '<s>' : parent.word, cand.word)
          const lmVal = safeLog(lmP)
          const acVal = safeLog(cand.acoustic)
          
          nextNodes.push({
            id: `${parent.id}-${cand.word}`,
            word: cand.word,
            acousticLog: parent.acousticLog + acVal,
            lmLog: parent.lmLog + lmVal,
            totalLog: (parent.acousticLog + acVal) + (lmWeight * (parent.lmLog + lmVal)),
            parentId: parent.id,
            stepIndex: t
          })
        }
      }

      // Sort by total score (descending)
      nextNodes.sort((a, b) => b.totalLog - a.totalLog)

      // Split into survivors and pruned
      const survivors = nextNodes.slice(0, beamWidth)
      const pruned = nextNodes.slice(beamWidth)

      cols.push({ survivors, pruned })
      currentSurvivors = survivors
    }

    // Mark best path
    if (cols.length > 0) {
      const lastCol = cols[cols.length - 1]
      if (lastCol.survivors.length > 0) {
        lastCol.survivors[0].isBest = true
        // Backtrack to mark best path? (Optional, visually simple to just mark end)
      }
    }

    return { columns: cols, totalLookups: lookups }
  }, [beamWidth, lmWeight])


  // 2. Measure node positions after render to draw lines
  useEffect(() => {
    if (!containerRef.current) return
    const newPos: Record<string, { x: number; y: number; h: number }> = {}
    
    // Find all node elements
    const nodes = containerRef.current.querySelectorAll('[data-node-id]')
    const containerRect = containerRef.current.getBoundingClientRect()

    nodes.forEach(node => {
      const rect = node.getBoundingClientRect()
      const id = node.getAttribute('data-node-id')
      if (id) {
        newPos[id] = {
          x: rect.left - containerRect.left,
          y: rect.top - containerRect.top,
          h: rect.height
        }
      }
    })
    setNodePositions(newPos)
  }, [columns, beamWidth]) // Re-run when data changes


  // Helper to get max score for bar scaling (per column)
  const getMinMax = (nodes: Node[]) => {
    if (!nodes.length) return { min: 0, max: 0 }
    const vals = nodes.map(n => n.totalLog)
    return { min: Math.min(...vals), max: Math.max(...vals) }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.title}>
          <span>🔦</span> Beam Search Visualizer
        </div>
        <div className={styles.stats}>
          <div className={styles.statItem}>Total LM Lookups: <strong>{totalLookups.toLocaleString()}</strong></div>
        </div>
      </div>

      <div className={styles.controls}>
        <div className={styles.controlGroup}>
          <div className={styles.label}>
            <span>Beam Width (K)</span>
            <span className={styles.value}>{beamWidth}</span>
          </div>
          <input
            type="range"
            className={styles.slider}
            min={1}
            max={5}
            value={beamWidth}
            onChange={e => setBeamWidth(Number(e.target.value))}
          />
        </div>
        <div className={styles.controlGroup}>
          <div className={styles.label}>
            <span>LM Weight</span>
            <span className={styles.value}>{lmWeight.toFixed(1)}</span>
          </div>
          <input
            type="range"
            className={styles.slider}
            min={0}
            max={3}
            step={0.5}
            value={lmWeight}
            onChange={e => setLmWeight(Number(e.target.value))}
          />
        </div>
      </div>

      <div className={styles.vizContainer} ref={containerRef}>
        {/* SVG Lines Layer */}
        <svg className={styles.svgOverlay}>
          {Object.entries(nodePositions).map(([id, pos]) => {
            // Find parent pos
            // We need the data to know parent ID
            // Quick lookup: find node in columns
            let node: Node | undefined
            for (const col of columns) {
              node = col.survivors.find(n => n.id === id) || col.pruned.find(n => n.id === id)
              if (node) break
            }
            if (!node || !node.parentId) return null
            
            const parentPos = nodePositions[node.parentId]
            if (!parentPos) return null

            // Draw Curve
            const startX = parentPos.x + 140 // rough width of column item
            const startY = parentPos.y + parentPos.h / 2
            const endX = pos.x
            const endY = pos.y + pos.h / 2
            
            // Highlight color if both are survivors? 
            // Actually simpler: if THIS node is pruned, line is grey. If survivor, line is blue.
            const isPruned = columns.some(c => c.pruned.some(p => p.id === id))
            const color = isPruned ? '#334155' : '#22d3ee'
            const opacity = isPruned ? 0.3 : 0.6
            const width = isPruned ? 1 : 2

            return (
              <path
                key={id}
                d={`M ${startX} ${startY} C ${startX + 50} ${startY}, ${endX - 50} ${endY}, ${endX} ${endY}`}
                fill="none"
                stroke={color}
                strokeWidth={width}
                opacity={opacity}
              />
            )
          })}
        </svg>

        {/* Columns */}
        {columns.map((col, stepIdx) => {
          // Determine scaling for bars in this column
          const allNodes = [...col.survivors, ...col.pruned]
          const { min, max } = getMinMax(allNodes)
          const range = max - min || 1

          return (
            <div key={stepIdx} className={styles.column}>
              <div className={styles.columnHeader}>{STEPS_DATA[stepIdx].label}</div>
              
              {/* Survivors */}
              {col.survivors.map(node => (
                <NodeCard 
                  key={node.id} 
                  node={node} 
                  type="survivor" 
                  min={min} 
                  range={range} 
                />
              ))}

              {/* Pruned (Limit to a few to save space if massive?) No, explicit list is good. */}
              {col.pruned.map(node => (
                <NodeCard 
                  key={node.id} 
                  node={node} 
                  type="pruned" 
                  min={min} 
                  range={range} 
                />
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function NodeCard({ node, type, min, range }: { node: Node, type: 'survivor' | 'pruned', min: number, range: number }) {
  // Normalize score for bar width (0 to 100%)
  // Scores are log probs (negative). Max is closest to 0 (e.g. -1). Min is very negative (e.g. -10).
  // width = (val - min) / (max - min)
  const widthPct = Math.max(5, ((node.totalLog - min) / range) * 100)

  return (
    <div 
      className={`${styles.node} ${styles[type]} ${node.isBest ? styles.best : ''}`}
      data-node-id={node.id}
    >
      <div className={styles.word}>
        <span>{node.word}</span>
        {node.isBest && <span>🏆</span>}
      </div>
      <div className={styles.score}>
        <span>Log: {node.totalLog.toFixed(2)}</span>
      </div>
      <div className={styles.barContainer}>
        <div className={styles.barFill} style={{ width: `${widthPct}%` }} />
      </div>
    </div>
  )
}