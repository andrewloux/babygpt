import { useState } from 'react'
import { Slider } from './Slider'
import styles from './TensorShapeViz.module.css'
import { VizCard } from './VizCard'

interface Stage {
  name: string
  shape: string
  values: string
  operation: string
}

export function TensorShapeViz() {
  const [tokenId, setTokenId] = useState(5)
  const vocabSize = 27
  const embedDim = 64

  // Generate example values for each stage
  const oneHot = Array(vocabSize)
    .fill(0)
    .map((_, i) => (i === tokenId ? 1 : 0))
  const embedding = [0.23, -0.15, 0.87, 0.42, -0.31, 0.09].concat(
    Array(embedDim - 6).fill('...')
  )
  const logits = [1.2, -0.5, 2.1, 0.3, -1.4, 0.8].concat(Array(vocabSize - 6).fill('...'))
  const probs = [0.12, 0.02, 0.31, 0.08, 0.01, 0.11].concat(Array(vocabSize - 6).fill('...'))

  const stages: Stage[] = [
    {
      name: 'Token ID',
      shape: 'scalar',
      values: String(tokenId),
      operation: '',
    },
    {
      name: 'One-Hot',
      shape: `(${vocabSize},)`,
      values: `[${oneHot.slice(0, 7).join(', ')}, ...]`,
      operation: 'index → binary vector',
    },
    {
      name: 'Embedding',
      shape: `(${embedDim},)`,
      values: `[${embedding.slice(0, 4).join(', ')}, ...]`,
      operation: 'E[token_id] or one_hot @ E',
    },
    {
      name: 'Logits',
      shape: `(${vocabSize},)`,
      values: `[${logits.slice(0, 4).join(', ')}, ...]`,
      operation: 'embedding @ Wout + b',
    },
    {
      name: 'Probabilities',
      shape: `(${vocabSize},)`,
      values: `[${probs.slice(0, 4).join(', ')}, ...]`,
      operation: 'softmax(logits)',
    },
  ]

  const [hoveredStage, setHoveredStage] = useState<number | null>(null)

  return (
    <VizCard title="The Forward Pass: Shapes at Each Stage" subtitle="Same data, different shapes">
      <div className={styles.container}>
        <div className={`panel-dark inset-box ${styles.tokenSelector}`}>
          <div className={styles.tokenHeader}>
            <div className={styles.tokenLabel}>Token ID</div>
            <div className={styles.tokenValue}>
              {tokenId} ('{String.fromCharCode(97 + (tokenId % 26))}')
            </div>
          </div>
          <Slider
            min={0}
            max={vocabSize - 1}
            step={1}
            value={tokenId}
            onValueChange={setTokenId}
            ariaLabel="Token ID"
          />
        </div>

        <div className={styles.pipeline}>
          {stages.map((stage, idx) => (
            <div key={stage.name} className={styles.stageWrapper}>
              <div
                className={`${styles.stage} inset-box ${hoveredStage === idx ? styles.highlighted : ''}`}
                onMouseEnter={() => setHoveredStage(idx)}
                onMouseLeave={() => setHoveredStage(null)}
              >
                <div className={styles.stageName}>{stage.name}</div>
                <div className={styles.stageShape}>{stage.shape}</div>
                <div className={styles.stageValues}>{stage.values}</div>
              </div>
              {idx < stages.length - 1 && (
                <div className={styles.arrow}>
                  <span className={styles.arrowHead}>↓</span>
                  <span className={styles.operation}>{stages[idx + 1].operation}</span>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className={`panel-dark inset-box ${styles.shapeNote}`}>
          <div className={styles.noteTitle}>Key insight</div>
          <div className={styles.noteText}>
            Every operation has a shape. The embedding table is <code>({vocabSize}, {embedDim})</code>, the output weights are{' '}
            <code>({embedDim}, {vocabSize})</code>. Matrix multiply rule: inner dimensions must match.
          </div>
        </div>
      </div>
    </VizCard>
  )
}
