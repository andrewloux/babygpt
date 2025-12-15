import {
  Container,
  ChapterHeader,
  Section,
  Paragraph,
  Highlight,
  Term,
  Callout,
  MathBlock,
  OneHotViz,
  SoftmaxWidget,
  LossGraph,
  NeuralTrainingDemo,
  MatrixRowSelectViz,
  ChapterNav,
  Exercise
} from '../components'

export function Chapter2() {
  return (
    <Container>
      <ChapterHeader
        number="02"
        title="The Neural Network"
        subtitle="We stop counting and start hallucinating with math. Introducing vectors, weights, and the scorecard of shame."
      />

      {/* Section 2.1 */}
      <Section number="2.1" title="The Great Switcheroo">
        <Paragraph>
          In Chapter 1, we hit a wall. Counting every sequence requires storage larger than the universe.
        </Paragraph>
        <Paragraph>
          So we're going to pull a trick. Instead of <em>storing</em> the probabilities in a table, we're going to build a machine that <em>computes</em> them on the fly.
        </Paragraph>
        <Paragraph>
          This machine is a <Highlight>Neural Network</Highlight>. Specifically, we're building the simplest possible one: a <strong>Bigram Neural Network</strong>.
        </Paragraph>
        <Callout variant="info" title="The Goal">
          <p>Input: One character (e.g., "c")</p>
          <p>Output: A probability distribution for the next character (e.g., 50% "a", 30% "o", ...)</p>
          <p>Constraint: No lookup tables. Pure math.</p>
        </Callout>
      </Section>

      {/* Section 2.2 */}
      <Section number="2.2" title="Computers Are Math Nerds">
        <Paragraph>
          In Chapter 1, we converted "hello" into [3, 2, 4, 4, 5]. We have numbers! But here's the catch: these are just <Term>labels</Term>—indices that say "this is character #3, that is character #2". They're not <em>meaningful</em> numeric values. You can't multiply index 5 by a weight and get a sensible answer. The fact that 5 is bigger than 3 doesn't mean anything—they're just IDs we made up. To build a neural network that does actual math, we need to convert each index into a <Term>vector</Term> that represents the character's properties in a way that algebra can chew on.
        </Paragraph>
        <Paragraph>
          You can't multiply "c" by 5. Computers need numbers.
        </Paragraph>
        <Paragraph>
          We already turned characters into integers (0, 1, 2...). But integers have a secret problem: they imply order. Is "b" (1) half of "d" (2)? No. They are distinct categories.
        </Paragraph>
        <Paragraph>
          The solution is <Highlight>One-Hot Encoding</Highlight>. We represent each character as a vector of all zeros, except for a single '1' at its index.
        </Paragraph>
        <OneHotViz />
        <Paragraph>
          If your vocabulary has 27 characters, every input is a vector of length 27. It's sparse, it's clean, and it allows us to do linear algebra.
        </Paragraph>
      </Section>

      {/* Section 2.3 */}
      <Section number="2.3" title="The Weights (W)">
        <Paragraph>
          Here is the simplest neural network equation in the world:
        </Paragraph>
        <MathBlock 
          equation="logits = x @ W" 
          explanation={`"Output scores" = "Input vector" matrix-multiplied by "Weights"`}
        />
        <Paragraph>
          <Term>x</Term> is our one-hot input (1 × 27).
        </Paragraph>
        <Paragraph>
          <Term>W</Term> is our <Highlight>Weight Matrix</Highlight> (27 × 27).
        </Paragraph>
        <Paragraph>
          The result, <Term>logits</Term>, is a vector of 27 raw scores.
        </Paragraph>
        <Callout variant="insight" title="What is W?">
          <p>Think of W as a control panel with 27 × 27 = 729 knobs.</p>
          <p>If W[0][1] is high, it means "Input 0 (a) really likes Output 1 (b)".</p>
          <p>Initially, these knobs are set randomly. Our job is to turn them until the model predicts English instead of gibberish.</p>
        </Callout>
        <Paragraph>
          Here's the beautiful trick: when you multiply a one-hot vector by a matrix, you're not actually doing any multiplication. You're just <em>selecting a row</em>. Try it:
        </Paragraph>
        <MatrixRowSelectViz />
        <Paragraph>
          This is why one-hot encoding is so efficient in practice. The "matrix multiplication" is really just a lookup—grab the row corresponding to the input character. Those row values become the logits.
        </Paragraph>
      </Section>

      {/* Section 2.4 */}
      <Section number="2.4" title="The Squishification (Softmax)">
        <Paragraph>
          The output of our matrix multiplication (<code>logits</code>) can be anything. 5.2, -100.9, 0.0.
        </Paragraph>
        <Paragraph>
          But we need <strong>probabilities</strong>. They must be positive and sum to 1.0.
        </Paragraph>
        <Paragraph>
          Enter <Highlight>Softmax</Highlight>. It takes ugly numbers and squishes them into a beautiful probability distribution.
        </Paragraph>
        <MathBlock 
            equation="\text{Softmax}(x_i) = \frac{e^{x_i}}{\sum e^{x_j}}"
            explanation="Exponentiate to make positive, then divide by the sum to normalize."
        />
        <Paragraph>
          Try it yourself. See how a high logit dominates the probability mass:
        </Paragraph>
        <SoftmaxWidget />
      </Section>

      {/* Section 2.5 */}
      <Section number="2.5" title="The Scorecard of Shame (Loss)">
        <Paragraph>
          The model makes a guess. It says P("a") = 0.05.
        </Paragraph>
        <Paragraph>
          The actual next character was "a".
        </Paragraph>
        <Paragraph>
          The model was wrong. We need to punish it. We need a number that says <em>how bad</em> this guess was. This number is the <Highlight>Loss</Highlight>.
        </Paragraph>
        <Paragraph>
            We use <strong>Negative Log Likelihood (NLL)</strong>. It sounds scary, but it's just:
        </Paragraph>
        <MathBlock equation="Loss = -\log(P(\text{correct answer}))" explanation="If prob is 1.0, Loss is 0. If prob is 0.01, Loss is HUGE." />
        <LossGraph />
        <Paragraph>
            We only care about the probability assigned to the <em>correct</em> target. We want that probability to be 1.0 (Loss = 0). Anything else gets a penalty.
        </Paragraph>
      </Section>

      {/* Section 2.6 */}
      <Section number="2.6" title="Training (Gradient Descent)">
        <Paragraph>
            We have the components:
        </Paragraph>
        <ul>
            <li>Input (x)</li>
            <li>Weights (W)</li>
            <li>Softmax</li>
            <li>Loss (L)</li>
        </ul>
        <Paragraph>
            Now, the magic loop. We calculate the Loss. Then we ask: <Highlight>"How should I change W to make the Loss slightly lower?"</Highlight>
        </Paragraph>
        <Paragraph>
            Calculus gives us the <strong>Gradient</strong> (the direction of steepest ascent). We step in the <em>opposite</em> direction.
        </Paragraph>
        <NeuralTrainingDemo />
        <Paragraph>
            Watch the grid above. Initially, it's noise. As you step, the weights for the correct patterns (h→e, e→l, l→l, l→o) turn green. The model is learning the bigram structure of "hello".
        </Paragraph>
      </Section>

      <Section number="2.7" title="Exercises">
          <Exercise 
            number="2.1" 
            title="The Perfect Loss"
            solution={
                <p>If the model assigns P=1.0 to the correct answer, Loss = -log(1.0) = 0. This is the theoretical minimum.</p>
            }
          >
              <Paragraph>What is the lowest possible value for the Loss? What probability does the model need to assign to the correct target to achieve it?</Paragraph>
          </Exercise>
          <Exercise 
            number="2.2" 
            title="Random Guessing"
            solution={
                <>
                <p>If vocab size is 27, uniform probability is 1/27.</p>
                <p>Loss = -log(1/27) = -log(0.037) ≈ 3.29</p>
                <p>This is a great sanity check. If your loss starts around 3.3, your initialization is correct.</p>
                </>
            }
          >
              <Paragraph>If your model is totally untrained and guessing randomly (uniform distribution) with a vocabulary of 27 characters, what should the Loss be approx?</Paragraph>
          </Exercise>
      </Section>

      <ChapterNav 
        prev={{ href: '/', label: 'Chapter 1: The Meat Grinder' }}
        next={{ href: '/chapter-03', label: 'Chapter 3: The MLP' }} 
      />
    </Container>
  )
}
