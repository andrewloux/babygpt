import {
  Container,
  ChapterHeader,
  Section,
  Paragraph,
  Highlight,
  Term,
  Callout,
  MathBlock,
  NgramExamples,
  SparsityViz,
  defaultSparsityData,
  CorridorDemo,
} from './components'

function App() {
  return (
    <Container>
      <ChapterHeader
        number="01"
        title="The Meat Grinder"
        subtitle="Raw text walks in wearing poetry and vibes. Our model only eats integers. This is where we build the digestive tract."
      />

      <Section number="1.1" title="Probability First">
        <Paragraph>
          Before we touch a single line of code, we need to understand what a language
          model actually <em>is</em>. Not the hype version. The math version.
        </Paragraph>

        <Callout variant="insight" title="The Core Insight">
          <p>
            A language model is just a function that takes some context and outputs a
            probability distribution over the vocabulary. All the complexity you'll see
            later—all the matrix multiplications and nonlinearities and clever
            tricks—exists solely to make this function produce good distributions.
          </p>
          <p>
            Context in → probability distribution out. Everything else is implementation
            details.
          </p>
        </Callout>
      </Section>

      <Section number="1.2" title="The Problem With Sequences">
        <Paragraph>
          Text isn't one token. It's a <em>sequence</em> of tokens. The word "cat" is
          three events happening in order: <Term>c</Term>, then <Term>a</Term>, then{' '}
          <Term>t</Term>.
        </Paragraph>

        <MathBlock
          equation="P(x₁, x₂, x₃, ..., xₜ)"
          explanation='"What\'s the probability of seeing x₁ AND x₂ AND x₃... all in that exact order?"'
        />

        <Paragraph>
          We need a <Highlight>decomposition strategy</Highlight>—break the joint
          probability into smaller pieces.
        </Paragraph>

        <Paragraph>
          These smaller pieces have a name: <Term>n-grams</Term>. An n-gram is just a
          chunk of n consecutive characters:
        </Paragraph>

        <NgramExamples />

        <Callout variant="info" title="The Sparsity Cure">
          <p>
            Shorter contexts appear <em>exponentially</em> more often than longer ones:
          </p>
          <SparsityViz rows={defaultSparsityData} />
          <p>
            <strong>The insight:</strong> Instead of asking "how often did this exact
            10-character sequence appear?" (answer: probably never), we ask "given the
            last few characters, what usually comes next?"
          </p>
        </Callout>

        <Paragraph>
          So decomposition cures sparsity. But <em>how</em> do we actually factor the
          joint probability into a product of these shorter pieces? Here's the geometric
          intuition.
        </Paragraph>

        <CorridorDemo />

        <Paragraph>
          This isn't a trick or a formula to memorize. It's <em>forced</em> by the
          geometry of how sequences unfold. If you thought carefully about paths through
          possibility space, you'd inevitably invent it yourself.
        </Paragraph>
      </Section>

      <Section number="1.3" title="The Chain Rule">
        <MathBlock
          equation="P(A, B) = P(A) × P(B | A)"
          explanation='"The probability of A and B" = "probability of A" × "probability of B given A already happened"'
        />

        <Paragraph>
          This telescopes for longer sequences:
        </Paragraph>

        <MathBlock
          equation="P(x₁, x₂, ..., xₜ) = P(x₁) × P(x₂|x₁) × P(x₃|x₁,x₂) × ... × P(xₜ|x₁,...,xₜ₋₁)"
          explanation="The joint probability is the product of all conditional probabilities."
        />

        <Callout variant="insight" title="Why This Is Huge">
          <p>
            We just turned an impossible problem (store 27¹⁰⁰ probabilities) into a
            tractable one (learn a function that computes P(next | context)).
          </p>
          <p>
            A language model doesn't need to memorize every possible sequence. It just
            needs to be really good at answering one question: "given what you've seen so
            far, what comes next?"
          </p>
        </Callout>
      </Section>
    </Container>
  )
}

export default App
