import { useId, useMemo, useState } from 'react'
import { Slider } from './Slider'
import { VizCard } from './VizCard'
import styles from './AxiomViz.module.css'

type Vec2 = { x: number; y: number }
type Pt = { x: number; y: number }

export function AxiomViz() {
  const [scalar, setScalar] = useState(2)
  const [order, setOrder] = useState<'AB' | 'BA'>('AB')
  const markerId = useId()

  const A: Vec2 = useMemo(() => ({ x: 1.2, y: 0.7 }), [])
  const B: Vec2 = useMemo(() => ({ x: 0.6, y: 1.4 }), [])
  const sum: Vec2 = useMemo(() => ({ x: A.x + B.x, y: A.y + B.y }), [A, B])

  const kA: Vec2 = useMemo(() => ({ x: scalar * A.x, y: scalar * A.y }), [A, scalar])
  const kB: Vec2 = useMemo(() => ({ x: scalar * B.x, y: scalar * B.y }), [B, scalar])
  const kSum: Vec2 = useMemo(() => ({ x: scalar * sum.x, y: scalar * sum.y }), [sum, scalar])

  const ORIGIN: Pt = { x: 22, y: 104 }
  const SCALE = 14

  const pt = (v: Vec2, origin: Pt = ORIGIN): Pt => ({
    x: origin.x + v.x * SCALE,
    y: origin.y - v.y * SCALE,
  })

  const addPt = (p: Pt, v: Vec2): Pt => ({
    x: p.x + v.x * SCALE,
    y: p.y - v.y * SCALE,
  })

  const sumPt = pt(sum)
  const kSumPt = pt(kSum)
  const aPt = pt(A)
  const bPt = pt(B)
  const kAPt = pt(kA)
  const kAEndThenB = addPt(kAPt, kB)
  const aEndThenB = addPt(aPt, B)
  const bEndThenA = addPt(bPt, A)

  const highlightAB = order === 'AB'

  return (
    <VizCard
      title="The Algebra of Attributes"
      subtitle="Two rules that make coordinate math legal"
      figNum="Fig. 2.3"
    >
      <div className={styles.container}>
        <div className={styles.grid} aria-label="Vector space axioms">
          <div className={`${styles.panel} panel-dark`}>
            <div className={styles.panelHeader}>
              <div className={styles.panelKicker}>Axiom 1</div>
              <h4 className={styles.panelTitle}>Linearity (scaling distributes)</h4>
              <p className={styles.panelDesc}>
                Scale the whole sum, or scale each part — you land in the same place.
              </p>
            </div>

            <div className={`${styles.equation} inset-box`} aria-label="Linearity equation">
              <span className={styles.equationLabel}>k·(A + B)</span>
              <span className={styles.equationEq}>=</span>
              <span className={styles.equationLabel}>k·A + k·B</span>
            </div>

            <div className={styles.controls} aria-label="Scale control">
              <div className={`${styles.sliderWrap} inset-box`}>
                <Slider
                  wrap={false}
                  min={1}
                  max={3}
                  step={0.1}
                  value={scalar}
                  onValueChange={setScalar}
                  ariaLabel="Scale factor k"
                />
              </div>
              <div className={styles.controlReadout}>
                k = <span className={styles.readoutValue}>{scalar.toFixed(1)}</span>
              </div>
            </div>

            <div className={styles.diagramRow} aria-label="Linearity diagrams">
              <div className={`${styles.miniDiagram} inset-box`}>
                <div className={styles.miniTitle}>Add → scale</div>
                <svg className={styles.svg} viewBox="0 0 150 120" role="img" aria-label="Add then scale diagram">
                  <defs>
                    <marker
                      id={`${markerId}-arrow`}
                      markerWidth="9"
                      markerHeight="9"
                      refX="8"
                      refY="4.5"
                      orient="auto"
                    >
                      <path d="M0,0 L0,9 L9,4.5 z" fill="context-stroke" />
                    </marker>
                  </defs>
                  <line x1={ORIGIN.x} y1={ORIGIN.y} x2={ORIGIN.x + 115} y2={ORIGIN.y} className={styles.axis} />
                  <line x1={ORIGIN.x} y1={ORIGIN.y} x2={ORIGIN.x} y2={ORIGIN.y - 92} className={styles.axis} />

                  <line
                    x1={ORIGIN.x}
                    y1={ORIGIN.y}
                    x2={aPt.x}
                    y2={aPt.y}
                    className={styles.vecA}
                    markerEnd={`url(#${markerId}-arrow)`}
                  />
                  <line
                    x1={ORIGIN.x}
                    y1={ORIGIN.y}
                    x2={bPt.x}
                    y2={bPt.y}
                    className={styles.vecB}
                    markerEnd={`url(#${markerId}-arrow)`}
                  />
                  <line
                    x1={ORIGIN.x}
                    y1={ORIGIN.y}
                    x2={sumPt.x}
                    y2={sumPt.y}
                    className={styles.vecSumGhost}
                    markerEnd={`url(#${markerId}-arrow)`}
                  />
                  <line
                    x1={ORIGIN.x}
                    y1={ORIGIN.y}
                    x2={kSumPt.x}
                    y2={kSumPt.y}
                    className={styles.vecResult}
                    markerEnd={`url(#${markerId}-arrow)`}
                  />
                  <text x={aPt.x + 4} y={aPt.y + 2} className={styles.labelA}>
                    A
                  </text>
                  <text x={bPt.x + 4} y={bPt.y + 2} className={styles.labelB}>
                    B
                  </text>
                  <text x={kSumPt.x + 4} y={kSumPt.y + 2} className={styles.labelResult}>
                    k(A+B)
                  </text>
                </svg>
              </div>

              <div className={`${styles.miniDiagram} inset-box`}>
                <div className={styles.miniTitle}>Scale → add</div>
                <svg className={styles.svg} viewBox="0 0 150 120" role="img" aria-label="Scale then add diagram">
                  <defs>
                    <marker
                      id={`${markerId}-arrow2`}
                      markerWidth="9"
                      markerHeight="9"
                      refX="8"
                      refY="4.5"
                      orient="auto"
                    >
                      <path d="M0,0 L0,9 L9,4.5 z" fill="context-stroke" />
                    </marker>
                  </defs>
                  <line x1={ORIGIN.x} y1={ORIGIN.y} x2={ORIGIN.x + 115} y2={ORIGIN.y} className={styles.axis} />
                  <line x1={ORIGIN.x} y1={ORIGIN.y} x2={ORIGIN.x} y2={ORIGIN.y - 92} className={styles.axis} />

                  <line
                    x1={ORIGIN.x}
                    y1={ORIGIN.y}
                    x2={kAPt.x}
                    y2={kAPt.y}
                    className={styles.vecA}
                    markerEnd={`url(#${markerId}-arrow2)`}
                  />
                  <line
                    x1={kAPt.x}
                    y1={kAPt.y}
                    x2={kAEndThenB.x}
                    y2={kAEndThenB.y}
                    className={styles.vecB}
                    markerEnd={`url(#${markerId}-arrow2)`}
                  />
                  <line
                    x1={ORIGIN.x}
                    y1={ORIGIN.y}
                    x2={kAEndThenB.x}
                    y2={kAEndThenB.y}
                    className={styles.vecResult}
                    markerEnd={`url(#${markerId}-arrow2)`}
                  />
                  <text x={kAPt.x + 4} y={kAPt.y + 2} className={styles.labelA}>
                    kA
                  </text>
                  <text x={kAEndThenB.x + 4} y={kAEndThenB.y + 2} className={styles.labelResult}>
                    kA+kB
                  </text>
                </svg>
              </div>
            </div>

            <p className={styles.note}>
              The picture looks like “stretching arrows,” but the real point is procedural: it doesn’t matter where you put the scale. That’s what lets us update embeddings with tiny nudges and have the algebra behave.
            </p>
          </div>

          <div className={`${styles.panel} panel-dark`}>
            <div className={styles.panelHeader}>
              <div className={styles.panelKicker}>Axiom 2</div>
              <h4 className={styles.panelTitle}>Commutativity (order doesn’t matter)</h4>
              <p className={styles.panelDesc}>
                Walk A then B, or B then A — you end at the same sum vector.
              </p>
            </div>

            <div className={`${styles.equation} inset-box`} aria-label="Commutativity equation">
              <span className={styles.equationLabel}>A + B</span>
              <span className={styles.equationEq}>=</span>
              <span className={styles.equationLabel}>B + A</span>
            </div>

            <div className={`${styles.bigDiagram} inset-box`} aria-label="Commutativity diagram">
              <div className={styles.bigHeader}>
                <div className={styles.bigTitle}>Head‑to‑tail addition</div>
                <button
                  type="button"
                  className={`${styles.toggleBtn} hover-lift focus-glow`}
                  onClick={() => setOrder(order === 'AB' ? 'BA' : 'AB')}
                >
                  highlight: {highlightAB ? 'A then B' : 'B then A'}
                </button>
              </div>
              <svg className={styles.svg} viewBox="0 0 150 120" role="img" aria-label="Commutativity head-to-tail diagram">
                <defs>
                  <marker
                    id={`${markerId}-arrow3`}
                    markerWidth="9"
                    markerHeight="9"
                    refX="8"
                    refY="4.5"
                    orient="auto"
                  >
                    <path d="M0,0 L0,9 L9,4.5 z" fill="context-stroke" />
                  </marker>
                </defs>
                <line x1={ORIGIN.x} y1={ORIGIN.y} x2={ORIGIN.x + 115} y2={ORIGIN.y} className={styles.axis} />
                <line x1={ORIGIN.x} y1={ORIGIN.y} x2={ORIGIN.x} y2={ORIGIN.y - 92} className={styles.axis} />

                {/* A then B */}
                <line
                  x1={ORIGIN.x}
                  y1={ORIGIN.y}
                  x2={aPt.x}
                  y2={aPt.y}
                  className={`${styles.vecA} ${highlightAB ? '' : styles.dimmed}`}
                  markerEnd={`url(#${markerId}-arrow3)`}
                />
                <line
                  x1={aPt.x}
                  y1={aPt.y}
                  x2={aEndThenB.x}
                  y2={aEndThenB.y}
                  className={`${styles.vecB} ${highlightAB ? '' : styles.dimmed}`}
                  markerEnd={`url(#${markerId}-arrow3)`}
                />

                {/* B then A */}
                <line
                  x1={ORIGIN.x}
                  y1={ORIGIN.y}
                  x2={bPt.x}
                  y2={bPt.y}
                  className={`${styles.vecB} ${highlightAB ? styles.dimmed : ''} ${styles.dashed}`}
                  markerEnd={`url(#${markerId}-arrow3)`}
                />
                <line
                  x1={bPt.x}
                  y1={bPt.y}
                  x2={bEndThenA.x}
                  y2={bEndThenA.y}
                  className={`${styles.vecA} ${highlightAB ? styles.dimmed : ''} ${styles.dashed}`}
                  markerEnd={`url(#${markerId}-arrow3)`}
                />

                <line
                  x1={ORIGIN.x}
                  y1={ORIGIN.y}
                  x2={sumPt.x}
                  y2={sumPt.y}
                  className={styles.vecResult}
                  markerEnd={`url(#${markerId}-arrow3)`}
                />
                <text x={sumPt.x + 4} y={sumPt.y + 2} className={styles.labelResult}>
                  A+B
                </text>
              </svg>
            </div>

            <p className={styles.note}>
              Addition is about an endpoint: the order changes the path, not the destination. That’s why “mixing” can be modeled as vector addition.
            </p>
          </div>
        </div>
      </div>
    </VizCard>
  )
}
