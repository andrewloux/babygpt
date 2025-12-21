import { useState } from 'react'
import { Slider } from './Slider'
import styles from './AxiomViz.module.css'

const MAX_SCALAR = 3
const FILL_MAX_PCT = 82

export function AxiomViz() {
  const [scalar, setScalar] = useState(2)
  const [order, setOrder] = useState<'AB' | 'BA'>('AB')

  // Data units (Liquids)
  const valA = 25
  const valB = 15
  const total = valA + valB

  const mixFillPct = (scalar / MAX_SCALAR) * FILL_MAX_PCT
  const aScaledFillPct = (scalar * valA / (MAX_SCALAR * total)) * FILL_MAX_PCT
  const bScaledFillPct = (scalar * valB / (MAX_SCALAR * total)) * FILL_MAX_PCT

  const mixBaseFillPct = ((valA + valB) / total) * FILL_MAX_PCT

  return (
    <div className={styles.container}>
      <div className={styles.ambientGlow} />
      <div className={styles.header}>
        <div className={styles.headerText}>
          <h3 className={styles.title}>The Algebra of Attributes</h3>
          <p className={styles.subtitle}>Why simple math works on complex meanings.</p>
        </div>
        <span className={styles.figNum}>Fig. 2.3</span>
      </div>

      <div className={styles.panels}>

        {/* PANEL 1: Linearity (Amplification) */}
        <div className={`${styles.panel} ${styles.panelLinearity}`}>
          <div className={styles.panelHeader}>
            <div className={styles.badge}>Axiom 1</div>
            <h4 className={styles.panelTitle}>Linearity (Amplification)</h4>
            <p className={styles.panelDesc}>Scale the whole = scale each part.</p>
          </div>

          <div className={`${styles.vizArea} ${styles.vizGrid}`} aria-hidden="true">
            <div className={styles.vizSide}>
              <div className={styles.beaker}>
                <div
                  className={`${styles.liquid} ${styles.liquidMix}`}
                  style={{ height: `${mixFillPct}%` }}
                >
                  <span className={styles.liquidLabel}>{scalar.toFixed(1)}× mix</span>
                </div>
              </div>
              <div className={styles.formula}>{scalar.toFixed(1)} · (A + B)</div>
            </div>

            <div className={styles.eqSymbol}>=</div>

            <div className={styles.vizSide}>
              <div className={styles.beaker}>
                <div
                  className={`${styles.liquid} ${styles.liquidB}`}
                  style={{ height: `${bScaledFillPct}%` }}
                >
                  <span className={styles.liquidLabel}>{scalar.toFixed(1)}B</span>
                </div>
                <div
                  className={`${styles.liquid} ${styles.liquidA}`}
                  style={{ height: `${aScaledFillPct}%` }}
                >
                  <span className={styles.liquidLabel}>{scalar.toFixed(1)}A</span>
                </div>
              </div>
              <div className={styles.formula}>
                {scalar.toFixed(1)}A + {scalar.toFixed(1)}B
              </div>
            </div>
          </div>

        <div className={styles.controls}>
            <Slider
              wrap={false}
              min={1}
              max={3}
              step={0.1}
              value={scalar}
              onValueChange={setScalar}
              ariaLabel="Amplification"
            />
            <div className={styles.controlReadout}>
              Amplification: <span className={styles.readoutValue}>{scalar.toFixed(1)}×</span>
            </div>
          </div>

          <div className={styles.explanation}>
            Doubling the whole mixture doubles both ingredients. In vector terms: <strong>k·(A + B) = k·A + k·B</strong>.
            <br />
            Geometrically, scaling just stretches the arrow: same direction, bigger magnitude.
          </div>
        </div>


        {/* PANEL 2: Commutativity (Ordering) */}
        <div className={`${styles.panel} ${styles.panelCommutativity}`}>
          <div className={styles.panelHeader}>
            <div className={styles.badge}>Axiom 2</div>
            <h4 className={styles.panelTitle}>Commutativity (Ordering)</h4>
            <p className={styles.panelDesc}>A + B is the same concept as B + A.</p>
          </div>

          <div className={`${styles.vizArea} ${styles.vizCenter}`}>
            <div className={styles.beakerStage} aria-hidden="true">
              <div className={styles.beakerMeta}>Total: 120ml</div>
              <div className={`${styles.beaker} ${styles.beakerTall}`}>
                <div
                  key={order}
                  className={`${styles.liquid} ${styles.liquidMix} ${styles.liquidMixSwirl}`}
                  style={{ height: `${mixBaseFillPct}%` }}
                >
                  <span className={styles.liquidLabel}>A + B</span>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.controls}>
            <button
              className={styles.toggleBtn}
              onClick={() => setOrder(order === 'AB' ? 'BA' : 'AB')}
            >
              Order: {order === 'AB' ? 'Pour A then B' : 'Pour B then A'}
            </button>
          </div>

          <div className={styles.explanation}>
            Pouring “Redness” then “Blueness” makes the same Purple as pouring “Blueness” then “Redness”. After things mix,
            the beaker doesn’t remember the order. Vector addition works the same way.
          </div>

        </div>

      </div>
    </div>
  )
}
