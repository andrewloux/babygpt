import { useMemo } from 'react'

import {
  ChapterHeader,
  ChapterMap,
  ChapterNav,
  CodeBlock,
  Container,
  MathBlock,
  Paragraph,
  Section,
  Term,
  WorkedExample,
  WorkedNote,
  WorkedStep,
} from '../../components'

import { BabyLearner } from './BabyLearner'
import { TrainingDemo } from './TrainingDemo'

export function Chapter3() {
  const learner = useMemo(() => new BabyLearner(5, 3), [])

  const inputIdx = 0 // 'a'
  const targetIdx = 1 // 'b'

  const forward = useMemo(() => {
    const { logits, probs } = learner.forward(inputIdx)
    const loss = learner.loss(targetIdx)
    return { logits, probs, loss }
  }, [learner, inputIdx, targetIdx])

  const check = useMemo(() => learner.checkGradient(inputIdx, targetIdx), [learner, inputIdx, targetIdx])

  const fmt = (n: number) => n.toFixed(3)
  const vecFmt = (v: number[]) => `[${v.map(fmt).join(', ')}]`

  return (
    <Container>
      <ChapterHeader
        number="03"
        title="The Engine Room"
        subtitle="We follow the numbers: forward pass, loss, and a gradient check."
      />

      <ChapterMap
        title="Chapter 3 Map"
        steps={[
          { to: '3.1', title: 'The Loop', description: 'Forward → loss → backward → step.' },
          { to: '3.2', title: 'One Example', description: 'Trace one training pair: a → b.' },
          { to: '3.3', title: 'Gradient Check', description: 'Wiggle one weight and see if calculus agrees.' },
        ]}
      />

      <Section number="3.1" title="The Loop">
        <Paragraph>
          Training is a loop: we predict, we score how wrong we were, then we nudge the parameters so the same mistake is less likely next time.
        </Paragraph>
        <Paragraph>Here’s the loop in its smallest usable form:</Paragraph>
        <CodeBlock lang="text">{`1) Forward:  ids -> logits -> probs
2) Score:    loss = -log(probs[target])
3) Backward: gradients tell which numbers increase loss
4) Step:     nudge numbers opposite the gradient`}</CodeBlock>
      </Section>

      <Section number="3.2" title="One Example (a → b)">
        <Paragraph>
          We’ll use a tiny learner with <Term>V=5</Term> tokens and embedding size <Term>D=3</Term>, so we can see every value without squinting.
        </Paragraph>

        <WorkedExample title="Forward pass">
          <WorkedStep n="1">
            <Paragraph>
              Lookup: <Term>e = E[a]</Term>. One row, <Term>D</Term> numbers.
            </Paragraph>
            <MathBlock equation={String.raw`e = E[${inputIdx}] = ${vecFmt(learner.E[inputIdx])}`} />
          </WorkedStep>
          <WorkedStep n="2">
            <Paragraph>
              Logits: <Term>ℓ = eW + b</Term>.
            </Paragraph>
            <CodeBlock lang="text">{`logits = ${vecFmt(forward.logits)}`}</CodeBlock>
          </WorkedStep>
          <WorkedStep n="3" final>
            <Paragraph>
              Softmax turns logits into <Term>P(next)</Term>. Loss is the negative log-probability of the true next token.
            </Paragraph>
            <CodeBlock lang="text">{`probs = ${vecFmt(forward.probs)}
loss = ${forward.loss.toFixed(4)}`}</CodeBlock>
          </WorkedStep>
        </WorkedExample>

        <Paragraph>
          Now we do that again and again, nudging parameters so the loss tends to go down:
        </Paragraph>
        <TrainingDemo />
      </Section>

      <Section number="3.3" title="Gradient Check (the honesty test)">
        <Paragraph>
          Finite differences are a simple way to keep ourselves honest: wiggle one parameter and measure how the loss changes.
        </Paragraph>
        <MathBlock equation={String.raw`\frac{\partial L}{\partial \theta} \approx \frac{L(\theta+\epsilon)-L(\theta-\epsilon)}{2\epsilon}`} />
        <WorkedExample title="Check one weight">
          <WorkedStep n="1" final>
            <CodeBlock lang="text">{`Param: ${check.param}
Analytic: ${check.analytic.toExponential(4)}
Numeric:  ${check.numeric.toExponential(4)}
Diff:     ${check.diff.toExponential(4)}
Result:   ${check.passed ? 'PASS' : 'FAIL'}`}</CodeBlock>
            <WorkedNote>
              If these match, we’re watching our math line up with a real “wiggle the knob” measurement.
            </WorkedNote>
          </WorkedStep>
        </WorkedExample>
      </Section>

      <ChapterNav prev={{ href: '/chapter-02', label: 'Chapter 2: The Map' }} />
    </Container>
  )
}

