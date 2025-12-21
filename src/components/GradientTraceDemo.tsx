import { useState, useMemo } from 'react'
import { VizCard } from './VizCard'
import { StepDots } from './StepDots'
import styles from './GradientTraceDemo.module.css'

// Tiny vocab for demonstration: q, u, a
const VOCAB = ['q', 'u', 'a'] as const
const EMBED_DIM = 4

// Initial embeddings (carefully chosen so the math is illustrative)
const INITIAL_EMBEDDINGS: Record<string, number[]> = {
  q: [0.3, -0.2, 0.5, 0.1],
  u: [0.4, 0.3, -0.1, 0.2],
  a: [-0.2, 0.5, 0.3, -0.4],
}

function softmax(scores: number[]): number[] {
  const max = Math.max(...scores)
  const exps = scores.map((s) => Math.exp(s - max))
  const sum = exps.reduce((a, b) => a + b, 0)
  return exps.map((e) => e / sum)
}

function dotProduct(a: number[], b: number[]): number {
  return a.reduce((sum, val, i) => sum + val * b[i], 0)
}

function formatNum(n: number, decimals = 3): string {
  const formatted = n.toFixed(decimals)
  return n >= 0 ? ` ${formatted}` : formatted
}

function formatVec(v: number[], decimals = 2): string {
  return `[${v.map((n) => formatNum(n, decimals)).join(', ')}]`
}

interface StepData {
  title: string
  code: string[]
  output: string[]
  highlight?: number[]
}

export function GradientTraceDemo() {
  const [currentStep, setCurrentStep] = useState(0)
  const [learningRate] = useState(0.1)

  // Compute all the values we'll show
  const computed = useMemo(() => {
    const E = { ...INITIAL_EMBEDDINGS }
    const context = 'q'
    const target = 'u'

    // Step 1: Lookup context embedding
    const contextEmbed = E[context]

    // Step 2: Compute scores (dot products)
    const scores: Record<string, number> = {}
    for (const char of VOCAB) {
      scores[char] = dotProduct(contextEmbed, E[char])
    }

    // Step 3: Apply softmax
    const scoreArray = VOCAB.map((c) => scores[c])
    const probs = softmax(scoreArray)
    const probMap: Record<string, number> = {}
    VOCAB.forEach((c, i) => {
      probMap[c] = probs[i]
    })

    // Step 4: Compute loss
    const loss = -Math.log(probMap[target])

    // Step 5: Compute predicted centroid
    const centroid = Array(EMBED_DIM).fill(0)
    VOCAB.forEach((c, i) => {
      for (let d = 0; d < EMBED_DIM; d++) {
        centroid[d] += probs[i] * E[c][d]
      }
    })

    // Step 6: Compute gradient (centroid - target embedding)
    const gradient = centroid.map((c, i) => c - E[target][i])

    // Step 7: Update context embedding
    const newContextEmbed = contextEmbed.map((v, i) => v - learningRate * gradient[i])

    // Step 8: Verify improvement
    const newScores: Record<string, number> = {}
    for (const char of VOCAB) {
      newScores[char] = dotProduct(newContextEmbed, E[char])
    }
    const newScoreArray = VOCAB.map((c) => newScores[c])
    const newProbs = softmax(newScoreArray)
    const newProbMap: Record<string, number> = {}
    VOCAB.forEach((c, i) => {
      newProbMap[c] = newProbs[i]
    })
    const newLoss = -Math.log(newProbMap[target])

    return {
      context,
      target,
      contextEmbed,
      E,
      scores,
      probs,
      probMap,
      loss,
      centroid,
      gradient,
      newContextEmbed,
      newProbMap,
      newLoss,
    }
  }, [learningRate])

  const steps: StepData[] = [
    {
      title: 'Step 1: Look up the context embedding',
      code: [
        "# Training example: context='q', target='u'",
        "# (We're teaching the model that 'qu' is common)",
        '',
        '# Look up the embedding for context character',
        "context_embed = E['q']",
      ],
      output: [
        "E['q'] = " + formatVec(computed.contextEmbed),
        '',
        '# This 4-dimensional vector represents "q"',
        '# Our goal: adjust it so it predicts "u" better',
      ],
    },
    {
      title: 'Step 2: Compute scores via dot product',
      code: [
        '# Score each character by dot product with context',
        'scores = {}',
        'for char in vocab:',
        '    scores[char] = dot(context_embed, E[char])',
      ],
      output: [
        `dot(E['q'], E['q']) = ${formatNum(computed.scores.q)}`,
        `dot(E['q'], E['u']) = ${formatNum(computed.scores.u)}`,
        `dot(E['q'], E['a']) = ${formatNum(computed.scores.a)}`,
        '',
        "# 'q' scores highest with itself (unsurprising)",
        "# 'u' is what we want to predict",
      ],
    },
    {
      title: 'Step 3: Apply softmax to get probabilities',
      code: ['# Turn scores into probabilities', 'probs = softmax(scores)'],
      output: [
        `P('q') = ${(computed.probMap.q * 100).toFixed(1)}%`,
        `P('u') = ${(computed.probMap.u * 100).toFixed(1)}%  ← should be higher!`,
        `P('a') = ${(computed.probMap.a * 100).toFixed(1)}%`,
        '',
        "# The model thinks 'u' has only " + (computed.probMap.u * 100).toFixed(0) + '% chance',
        "# We know 'u' is correct, so this is wrong",
      ],
    },
    {
      title: 'Step 4: Compute the loss',
      code: [
        '# Cross-entropy loss: -log(probability of correct answer)',
        "loss = -log(probs['u'])",
      ],
      output: [
        `loss = -log(${computed.probMap.u.toFixed(3)})`,
        `     = ${computed.loss.toFixed(3)}`,
        '',
        '# High loss = bad prediction',
        '# If P("u") were 1.0, loss would be 0',
        '# If P("u") were tiny, loss would be huge',
      ],
    },
    {
      title: 'Step 5: Compute the predicted centroid',
      code: [
        '# Where does the model THINK the answer is?',
        '# Weighted average of all embeddings by probability',
        'centroid = sum(prob[c] * E[c] for c in vocab)',
      ],
      output: [
        `centroid = ${(computed.probMap.q * 100).toFixed(0)}% × E['q']`,
        `         + ${(computed.probMap.u * 100).toFixed(0)}% × E['u']`,
        `         + ${(computed.probMap.a * 100).toFixed(0)}% × E['a']`,
        '',
        '= ' + formatVec(computed.centroid),
        '',
        '# This is the "center of mass" of predictions',
      ],
    },
    {
      title: 'Step 6: Compute the gradient',
      code: [
        '# The gradient is beautifully simple:',
        '# gradient = centroid - E[target]',
        '#',
        '# "Where the model thinks" minus "where it should go"',
      ],
      output: [
        'centroid   = ' + formatVec(computed.centroid),
        "E['u']     = " + formatVec(computed.E.u),
        '─────────────────────────────',
        'gradient   = ' + formatVec(computed.gradient),
        '',
        '# This tells us: how to nudge the context',
        '# embedding so it points more toward "u"',
      ],
    },
    {
      title: 'Step 7: Update the context embedding',
      code: [
        '# Gradient descent: step in the opposite direction',
        'learning_rate = 0.1',
        "E['q'] -= learning_rate * gradient",
      ],
      output: [
        "E['q'] before = " + formatVec(computed.contextEmbed),
        'gradient      = ' + formatVec(computed.gradient),
        '',
        "E['q'] after  = " + formatVec(computed.newContextEmbed),
        '',
        '# The embedding shifted slightly',
        '# Did it help? Let\'s check...',
      ],
    },
    {
      title: 'Step 8: Verify the improvement',
      code: [
        '# Run forward pass again with updated embedding',
        'new_probs = softmax(dot(new_context_embed, E))',
        "new_loss = -log(new_probs['u'])",
      ],
      output: [
        'BEFORE:',
        `  P('u') = ${(computed.probMap.u * 100).toFixed(1)}%`,
        `  loss   = ${computed.loss.toFixed(3)}`,
        '',
        'AFTER:',
        `  P('u') = ${(computed.newProbMap.u * 100).toFixed(1)}%  ← increased!`,
        `  loss   = ${computed.newLoss.toFixed(3)}  ← decreased!`,
        '',
        '✓ One step made the model slightly better at',
        '  predicting "u" after seeing "q"',
      ],
    },
  ]

  const step = steps[currentStep]

  return (
    <VizCard
      title="Gradient Descent: Step by Step"
      subtitle="Trace one training step through the computation"
      figNum="Fig. 2.10"
    >
      <StepDots
        className={styles.stepIndicator}
        count={steps.length}
        current={currentStep}
        onSelect={setCurrentStep}
        variant="numbered"
        ariaLabel="Step navigation"
      />

        <div className={styles.stepTitle}>{step.title}</div>

        <div className={styles.panels}>
          <div className={styles.codePanel}>
            <div className={styles.panelHeader}>Code</div>
            <pre className={styles.code}>
              {step.code.map((line, i) => (
                <div key={i} className={styles.codeLine}>
                  {line}
                </div>
              ))}
            </pre>
          </div>

          <div className={styles.outputPanel}>
            <div className={styles.panelHeader}>Output</div>
            <pre className={styles.output}>
              {step.output.map((line, i) => (
                <div
                  key={i}
                  className={`${styles.outputLine} ${line.includes('←') ? styles.highlight : ''}`}
                >
                  {line}
                </div>
              ))}
            </pre>
          </div>
        </div>

        <div className={styles.controls}>
          <button
            className={styles.navBtn}
            onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
            disabled={currentStep === 0}
            aria-label="Previous step"
            type="button"
          >
            ← Previous
          </button>
          <span className={styles.stepCount} aria-live="polite" aria-atomic="true">
            {currentStep + 1} / {steps.length}
          </span>
          <button
            className={styles.navBtn}
            onClick={() => setCurrentStep((s) => Math.min(steps.length - 1, s + 1))}
            disabled={currentStep === steps.length - 1}
            aria-label="Next step"
            type="button"
          >
            Next →
          </button>
        </div>

        <div className={styles.resetRow}>
          <button className={styles.resetBtn} onClick={() => setCurrentStep(0)} type="button" aria-label="Reset to first step">
            ↺ Start Over
          </button>
        </div>
    </VizCard>
  )
}
