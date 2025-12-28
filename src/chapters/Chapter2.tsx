import { useState } from 'react'

import {
  Container,
  ChapterHeader,
  Section,
  SectionLink,
  Paragraph,
  Highlight,
  Term,
  Callout,
  ChapterMap,
  MathBlock,
  MathInline,
  Cite,
  Citations,
  CodeBlock,
  CodeWalkthrough,
  Step,
  CodeChallenge,
  WorkedExample,
  WorkedStep,
  WorkedNote,
  WorkedValue,
  MatrixRowSelectViz,
  CharacterClusterViz,
  ContextExplosionViz,
  DotProductViz,
  TensorShapeBuilder,
  Invariants,
  InvariantItem,
  Exercise,
  ChapterNav,
  GrassmannViz,
  AxiomViz,
  AbstractionChainViz,
  GradientDescentViz,
  DiscreteContinuousViz,
  EmbeddingInspector,
  SoftmaxWidget,
  SoftmaxBarsViz,
  SamplingConvergenceViz,
  SoftmaxSimplexViz,
  SoftmaxLandscapeViz,
  GradientTraceDemo,
  GeometricDotProductViz,
  CrossEntropyViz,
  EmbeddingGradientViz,
  TrainingDynamicsViz,
  OneHotViz,
  NeuralTrainingDemo,
  DerivativeViz,
  GradientStepViz,
  SoftmaxNudgeViz,
  ChainOfBlameViz,
  TensorShapeViz,
} from '../components'

const DEFAULT_SHARED_CORPUS = `It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.

The quick brown fox jumps over the lazy dog.`

export function Chapter2() {
  const [corpus, setCorpus] = useState(DEFAULT_SHARED_CORPUS)
  const [charA, setCharA] = useState('a')
  const [charB, setCharB] = useState('e')
  const [pStep1, setPStep1] = useState(0.5)
  const [pStep2, setPStep2] = useState(0.25)

  return (
    <Container>
      <ChapterHeader
        number="02"
        title="The Map"
        subtitle="Token IDs are just name tags. Let's draw a map (embeddings) so the model can tell what's near what."
      />

      <ChapterMap
        title="Chapter 2 Map"
        steps={[
          {
            to: '2.1',
            title: "Grassmann's Insight",
            description: 'Abstract objects can be coordinates (colors → language). This is the basic move embeddings use.',
          },
          {
            to: '2.2',
            title: 'The Reuse Question',
            description: "Context explosion — the scaling limit we're trying to beat.",
          },
          {
            to: '2.3',
            title: 'What Can We Measure?',
            description: <>Define similarity: tokens that predict similar next tokens should be close.</>,
          },
          {
            to: '2.4',
            title: 'The Embedding Table',
            description: (
              <>
                Store <Term>D</Term> numbers per token. Lookup = row selection.
              </>
            ),
          },
          {
            to: '2.5',
            title: 'The Embedding Lookup',
            description: 'Row selection via one-hot vectors: E[ix].',
          },
          {
            to: '2.6',
            title: 'Dot Product',
            description: 'A similarity score you can compute (and differentiate).',
          },
          {
            to: '2.7',
            title: 'Softmax',
            description: 'Converts raw scores to a probability distribution.',
          },
          {
            to: '2.8',
            title: 'Tensors',
            description: 'Shape bookkeeping: [B, T] → [B, T, D].',
          },
          {
            to: '2.9',
            title: 'Synthesis',
            description: 'The pipeline: IDs → vectors → logits → probabilities.',
          },
          {
            to: '2.10',
            title: 'Training (Overview)',
            description: 'Predict → score → nudge → repeat.',
          },
          {
            to: '2.11',
            title: 'Cross-Entropy',
            description: 'A single scoreboard: average surprise.',
          },
          {
            to: '2.12',
            title: 'Gradients',
            description: 'The steering signal: which way is downhill?',
          },
          {
            to: '2.13',
            title: 'The Training Loop',
            description: 'Put it together: a minimal embedding model.',
          },
          {
            to: '2.14',
            title: 'What Training Discovers',
            description: 'Noise becomes neighborhoods (because prediction demands it).',
          },
          {
            to: '2.15',
            title: 'Exercises',
            description: 'Do each step once, slowly.',
          },
        ]}
      />

      <Section number="2.1" title="Grassmann's Insight">
        <Paragraph>
          In Chapter 1, we built a system that memorizes. Feed it <Term>"cat sat on the"</Term>, and it retrieves what it knows about <Term>"cat sat on the"</Term>. But ask about <Term>"dog sat on the"</Term> — a context it hasn't stored — and it has nothing. The system
          doesn’t represent similarity: in its world, <Term>'cat'</Term> and <Term>'dog'</Term> are just different keys. There's no structure connecting them, no way for knowledge to flow from one to the other.
        </Paragraph>
        <Paragraph>
          The mechanism: a hash table maps strings to addresses. Hash(<Term>"cat sat"</Term>) might produce 47,923. Hash(<Term>"dog sat"</Term>) might produce 8,301,457. Those integers are just memory slots — there's no "nearby" slot 47,924 that represents something similar. Addresses are storage locations, not coordinates in a space. Change one letter in the input and the hash jumps to a completely unrelated integer. The data structure has no concept of distance.
        </Paragraph>
        <Paragraph>
          What we need is a representation where tokens aren't just labels — they're <strong>locations</strong>. Where <Term>'cat'</Term> and <Term>'dog'</Term> being nearby isn't a metaphor but a geometric fact. Where learning about one automatically teaches you something about
          its neighbors. That's the shift from memorization to generalization: from a lookup table to a map.
        </Paragraph>
        <Paragraph>
          Here's the smallest "embedding language model" you can build. It's just a few boxes wired together:
        </Paragraph>
        <ol>
          <li>
            <strong>Start with an ID:</strong> a token <Term>x</Term> has an integer index <Term>ix</Term>.
          </li>
          <li>
            <strong>Lookup coordinates:</strong> grab a row from the embedding table: <Term>e_x = E[ix]</Term>.
          </li>
          <li>
            <strong>Make a guess:</strong> turn that vector into scores for the next token (logits).
          </li>
          <li>
            <strong>Normalize:</strong> convert logits into probabilities with <Term>softmax</Term>.
          </li>
          <li>
            <strong>Train:</strong> nudge <Term>E</Term> (and the output weights) so the true next token gets more probability next time.
          </li>
        </ol>
        <Paragraph>
          Under the hood, this is also a scaling limit: the number of possible contexts explodes exponentially. We can't store them all. We need a way to <strong>compress</strong> infinite variations of language into something finite.
        </Paragraph>
        <Paragraph>
          Here’s the stumbling block: what would we even measure? The letter <Term>'q'</Term> has no wavelength, no mass, no temperature. It's a shape humans agreed would represent a sound—arbitrary by design. You might try measuring something intrinsic: the ASCII code? That's also arbitrary—someone assigned <Term>'a'=97</Term> in 1963. The pixel pattern? Fonts vary endlessly, and anyway <Term>'q'</Term> looks like <Term>'g'</Term> but they behave nothing alike in text. Every path leads nowhere because you're looking <em>inside</em> the symbol for a number that doesn't exist. The symbol is empty. It has no essence to extract.
        </Paragraph>
        <Paragraph>
          So where could coordinates possibly come from?
        </Paragraph>
        <Paragraph>
          In 1844, a schoolteacher in Stettin had an insight that wouldn't be fully understood for 120 years: <strong>abstract relationships can be coordinates.</strong>
        </Paragraph>
        <Paragraph>
          His point was broader than physics: if you can measure relationships, you can build coordinates. Colors, sounds, and linguistic patterns can all live in a space where "near" and "far" mean something.
        </Paragraph>
        <Paragraph>
          His name was Hermann Grassmann. He wasn't a university professor with a lab and research funding. He taught high school, studied theology, and did mathematics on the side because he couldn't help himself.<Cite n={1} />
        </Paragraph>
        <Paragraph>
          The question that drives this entire chapter: <strong>What if language works the same way as colors?</strong>
        </Paragraph>

        <Paragraph>
          In 1853, Grassmann published a paper correcting Helmholtz — the most famous physicist of the age. Helmholtz had assumed that mixing yellow and blue light would make green, the way paints do.
        </Paragraph>
        <Paragraph>
          Grassmann identified the category error.
        </Paragraph>
        <Paragraph>
          Mixing paint is <strong>destruction</strong>. A pigment's color is the light it <em>doesn't</em> absorb — everything else gets swallowed. Yellow pigment reflects yellow and absorbs blue. Blue pigment reflects blue and absorbs red. Mix them, and their absorptions combine:
          blue is gone, red is gone, and green — the one wavelength both happen to reflect — is all that's left.
        </Paragraph>
        <Paragraph>
          Mixing light is <strong>construction</strong>. Light is waves, and waves are additive — they superpose. Yellow and blue wavelengths coexist in the same space. Both hit the retina simultaneously: yellow triggers one set of receptors, blue triggers another. The brain receives
          both signals at once and reads the combination as white.
        </Paragraph>
        <Paragraph>
          He wasn't guessing. He derived the laws of colorimetry we still use today — proving that the messy, subjective experience of "seeing color" maps cleanly onto a 3‑dimensional vector space.
        </Paragraph>
        <Paragraph>
          This was the radical move: take something that seems irreducibly qualitative — the experience of redness — and give it coordinates. Once you have coordinates, you unlock geometry. You can measure distances. You can interpolate. You can average. Coordinates turn intuition
          into computation.
        </Paragraph>
        <MathBlock
          equation={String.raw`\text{Purple} = 0.5 \cdot \text{Red} + 0.5 \cdot \text{Blue}`}
          explanation="This is an algebra of attributes: you can average properties (redness), not identities ('red' the token). Grassmann showed that this kind of add-and-scale math works for more than just light."
        />
        <Callout variant="info" title="How colors turn into numbers">
          <Paragraph>
            The coefficients come from a matching experiment. Put a target color patch on one side, give yourself a few "primaries" on the other, and turn the knobs until both patches look the same.
          </Paragraph>
          <Paragraph>
            Those knob settings are the coordinates. You aren't discovering what color "is" inside the patch — you're building a repeatable measurement: <em>how much of each basis light reproduces this experience?</em>
          </Paragraph>
          <Paragraph>
            Once you have that, you can compare, interpolate, and do geometry on colors — because you've turned a sensation into a stable vector of numbers.
          </Paragraph>
        </Callout>
        <Paragraph>
          He called it the <em>Ausdehnungslehre</em> — literally "theory of extension." The name looks scary. The move is simple: once something has coordinates, you can do coordinate math on it.
        </Paragraph>
        <Paragraph>
          Grassmann got his numbers from matching — adjust knobs until patches look the same, read the settings. We get ours from counting: for each character, measure what tends to come next, and how often.
        </Paragraph>
        <Paragraph>
          That gives you a new move: take a weighted average. Slide <Term>t</Term> below and watch the blend. In "Colors" mode it’s purple showing up. In "Characters" mode you're blending two next‑character distributions from Chapter 1 and watching the model's bets morph smoothly.
        </Paragraph>
        <GrassmannViz />
        <Paragraph>
          Colors aren't numbers. They're sensory experiences. Characters aren't numbers either — they're symbols. But both can be treated as coordinates in a space where <em>blending makes sense</em>. Purple is "half red, half blue."
        </Paragraph>
        <Paragraph>
          Here’s the part that matters for language: if you blend <Term>'q'</Term> and <Term>'u'</Term>, you're really saying “take a mixture of their predictive habits.” For each candidate next character <Term>x</Term>, the blended predictor assigns:
        </Paragraph>
        <MathBlock equation={String.raw`P(x \mid \text{mix}) = (1-t)\,P(x\mid q) + t\,P(x\mid u)`} />
        <Paragraph>
          That’s why the bars in the demo slide smoothly instead of snapping.
        </Paragraph>

        <Paragraph>
          Why does this work? Two properties make the algebra possible:
        </Paragraph>
        <AxiomViz />
        <Paragraph>
          If the operations you care about obey these rules, you’re allowed to model your “attribute bundles” as a <em>vector space</em>.
          The objects themselves aren’t secretly vectors — we’re choosing a coordinate system that makes mixing and scaling behave predictably.
        </Paragraph>
        <Paragraph>
          The missing piece is always: <em>what are the attributes?</em> For colors, they were literally knob settings from a matching
          experiment. For characters, we use something just as measurable: the distribution of what tends to come next. That fingerprint is already a vector (one coordinate per possible next character). We can compute it directly from counts.
        </Paragraph>
        <Paragraph>
          One important clarification before we get carried away: the character <Term>'q'</Term> isn't "a vector." It's still just a
          symbol. The vector is the little bundle of numbers we decide to represent it with.
        </Paragraph>
        <Paragraph>
          We'll use one piece of notation throughout the chapter:
        </Paragraph>
        <ul>
          <li>
            <strong><Term>E</Term>:</strong> the embedding table (a matrix). One row per token/character, each row containing <Term>D</Term>{' '}
            learned numbers.
          </li>
          <li>
            <strong><Term>E[c]</Term>:</strong> “row lookup” — grab the row for token <Term>c</Term>.
          </li>
          <li>
            <strong><Term>e_c</Term>:</strong> shorthand for that row: <Term>e_c = E[c]</Term>.
          </li>
        </ul>
        <MathBlock equation={String.raw`e_q = E['q'] \qquad e_u = E['u']`} explanation="Example: the learned coordinates we assign to 'q' and 'u'." />
        <Callout variant="info" title="What actually lives in the space?">
          <ol>
            <li>
              <strong>Symbol:</strong> <Term>'q'</Term> (discrete)
            </li>
            <li>
              <strong>ID:</strong> <Term>stoi['q'] = 17</Term> (example name tag)
            </li>
            <li>
              <strong>Embedding:</strong> <Term>e_q = [0.2, -1.3, ...]</Term> (coordinates we can move)
            </li>
          </ol>
          <Paragraph>
            Only the third thing is a point in the vector space. The first two just tell us which row to grab consistently.
          </Paragraph>
        </Callout>
        <Paragraph>
          When we blend things in the demo, we're blending <em>coordinates</em>, not identities. "Half red + half blue" makes sense
          because redness is an attribute. Same move here: a blend of <Term>e_q</Term> and <Term>e_u</Term> is just "somewhere between
          their learned attributes."
        </Paragraph>
        <Paragraph>
          And we can already say something concrete about what training will try to do. In English text, <Term>'q'</Term> is usually followed by{' '}
          <Term>'u'</Term>. That means the model will repeatedly see contexts where “the <Term>q</Term> row should score the <Term>u</Term> row
          highly,” and the learned coordinates tend to move so that <Term>e_q</Term> and <Term>e_u</Term> play nicely together.
        </Paragraph>
        <Paragraph>
          And this is where the "continuous" part starts to matter. Integer IDs can only jump: 17 → 18. There's no "a tiny bit more
          like <Term>'u'</Term>." In a vector space, you can move one millimeter — add a tiny <Term>ε</Term> to one coordinate — and get a
          nearby point.
        </Paragraph>
        <Paragraph>
          But "nearby" isn't automatically "better." A vector space gives you a steering wheel; it doesn't pick the destination.
          We still need two things: a target (what counts as a good prediction) and a scoreboard (a number that goes down when we improve).
        </Paragraph>

        <Paragraph>
          Grassmann showed that colors — subjective, ineffable things — could become
          coordinates. But here's the deeper move: you don't need to know what a color{' '}
          <strong>is</strong> to know what it <strong>does</strong>. You measure how
          it behaves, and the behavior <em>is</em> the structure.
        </Paragraph>
        <Paragraph>
          Almost a century later, the linguist J.R. Firth crystallized this same
          insight for language: <em>"You shall know a word by the company it keeps."</em>{' '}
          Not by its etymology, not by some essence locked inside — by its patterns
          of use. The distributional hypothesis: meaning emerges from context.
        </Paragraph>
        <Paragraph>
          Here's the test. Imagine a Martian lands with a calculator but no dictionary.
          They can't ask what <Term>'q'</Term> means. They can't look it up. But they
          can <em>count</em>. And after enough English text, they'd discover something:{' '}
          <Term>'q'</Term> is desperate. It reaches for <Term>'u'</Term> like nothing
          else in the alphabet. No one told them. The counts show it.
        </Paragraph>
        <Paragraph>
          That's structure from behavior. The Martian never learned what{' '}
          <Term>'q'</Term> means. They didn't need to.
        </Paragraph>
        <Paragraph>
          Here's the chain — click each station to see the idea at that level:
        </Paragraph>
        <AbstractionChainViz />

        <Paragraph>
          So here's what Grassmann's work gives us — it's the foundational thesis for this entire chapter:
        </Paragraph>
        <Paragraph>
          <strong>If colors can be coordinates — if you can ask "how far is purple from red?" and get a meaningful answer — we can do the same with characters.</strong>
        </Paragraph>
        <Paragraph>
          That's the claim embeddings lean on: abstract things can have measurable relationships, and those relationships can be encoded as geometry. Once you have coordinates, you can compare points — and you can adjust them.
        </Paragraph>
        <Paragraph>
          But there's a problem we need to solve first. Even if we accept that characters <em>can</em> have coordinates, we still need to answer: <strong>why do we need them?</strong> What breaks if we try to keep using the lookup tables from Chapter 1?
        </Paragraph>
        <Paragraph>
          <strong>Training</strong> is a loop: make a prediction, score it, nudge the coordinates, repeat.
        </Paragraph>
        <Citations
          title="Grassmann sources"
          items={[
            {
              n: 1,
              href: 'https://mathshistory.st-andrews.ac.uk/Biographies/Grassmann/',
              label: 'MacTutor — Hermann Günther Grassmann (biography + reception + later influence)',
            },
            {
              n: 2,
              href: "https://en.wikipedia.org/wiki/Grassmann%27s_law",
              label: "Grassmann's law (linguistics) — overview + examples",
            },
            {
              n: 3,
              href: 'https://mathshistory.st-andrews.ac.uk/Extras/Grassmann_1844/',
              label: 'Grassmann (1844) — Foreword extract (MacTutor translation)',
            },
            {
              n: 4,
              href: 'https://mathshistory.st-andrews.ac.uk/Extras/Grassmann_1862/',
              label: 'Grassmann (1862) — Foreword extract (MacTutor translation)',
            },
            {
              n: 5,
              href: 'https://en.wikipedia.org/wiki/Hermann_Grassmann',
              label: 'Hermann Grassmann — biography + publishing letter ("waste paper") + linguistics work',
            },
          ]}
        />
        <Callout variant="insight" title="From Colors to Characters: The Same Move">
          <Paragraph>
            Grassmann's move: you can't measure what a color IS, so measure what you have to DO to match it. Knob settings become coordinates.
          </Paragraph>
          <Paragraph>
            Our move is the same: you can't measure what a character IS, so measure what it DOES—what tends to follow it. Count successors across a corpus and you get <Term>P(next|c)</Term>, a distribution over 27 characters. Call this the <strong>fingerprint</strong>: 27 numbers that capture how the character behaves in context.
          </Paragraph>
          <Paragraph>
            That fingerprint IS coordinates—characters with similar fingerprints are functionally similar. But for real vocabularies, the fingerprint would be 50,000 numbers. Unwieldy. So we learn a <strong>compressed</strong> representation: the embedding, 64 numbers that preserve the similarity structure. Training finds the compression.
          </Paragraph>
          <Paragraph>
            <Highlight>Behavior becomes geometry.</Highlight>
          </Paragraph>
        </Callout>
      </Section>

      <Section number="2.2" title="The Reuse Question">
        <Paragraph>
          Chapter 1 gave us a working model (n‑grams), but it had a sharp limit: <strong>every context was an island.</strong>
        </Paragraph>
        <Paragraph>
          Picture this: you've seen <Term>"the cat"</Term> ten thousand times in your training data. You know <em>exactly</em>{' '}
          what tends to follow <Term>"the cat"</Term> — maybe <Term>"sat"</Term>, <Term>"ran"</Term>, <Term>"meowed"</Term>.
        </Paragraph>
        <Paragraph>
          Now the text shows you <Term>"a cat"</Term> for the first time.
        </Paragraph>
        <Paragraph>
          In a lookup-table n‑gram, <Term>"the "</Term> and <Term>"a "</Term> are separate contexts. The model looks up <Term>"a cat"</Term>,
          finds nothing, and (in a pure lookup table) has to guess from something shorter. Everything it learned about{' '}
          <Term>"the cat"</Term> stays trapped there, because the model has no notion of distance between contexts.
        </Paragraph>
        <Paragraph>
          You see the same thing with rare strings: <Term>supercalifragilisticexpialidocious</Term> is made of ordinary letters, but most longer contexts inside it are ones you'll never have seen in your tiny corpus. In a pure lookup table, "new context" just means "empty row."
        </Paragraph>
        <Paragraph>
          This is what <strong>independent learning</strong> looks like: if you haven't seen a specific context before, you have no direct evidence for it. And as contexts get longer, "never seen this before" becomes the default state.
        </Paragraph>
        <Paragraph>
          We need a way to <strong>share information</strong>. We need reusable parts.
        </Paragraph>
        <Paragraph>
          The solution is to stop memorizing <em>contexts</em> and start modeling <em>tokens</em>. Instead of a giant table of answers for every possible situation, we store one shared vector per token.
        </Paragraph>
        <Paragraph>
          Here’s what embeddings buy you — the honest win: <strong>shared memory</strong>. One learned vector for <Term>'cat'</Term> is reused everywhere <Term>'cat'</Term> appears: <Term>"the cat"</Term>, <Term>"a cat"</Term>, <Term>"fat cat"</Term>, etc. Every training example that touches <Term>'cat'</Term> pushes on the <em>same</em> few numbers.
        </Paragraph>
        <Paragraph>
          If two tokens end up with similar vectors (say <Term>'cat'</Term> and <Term>'dog'</Term>), then any <em>model</em> that uses those vectors smoothly tends to treat them similarly. But a context is a <em>sequence</em>, not a token — so we still need a rule for how to combine multiple token vectors into one prediction. (That’s the next problem we’ll solve.)
        </Paragraph>
        <Paragraph>
          The compression is direct:
        </Paragraph>
        <ul>
          <li>
            <strong>Lookup table:</strong> <Term>V<sup>T</sup></Term> entries (one per context).
          </li>
          <li>
            <strong>Embedding table:</strong> <Term>V</Term> entries (one per token).
          </li>
        </ul>
        <Paragraph>
          With a vocabulary of 27 characters and context length 3, that's 19,683 entries versus 27. One embedding does the work of thousands of lookup-table rows — because tokens appear in many contexts.
        </Paragraph>
        <Paragraph>
          You can call that a "portable identity," but mechanically it's just shared memory: whenever the text contains <Term>'a'</Term>, the model consults the same row of numbers. It's not an intrinsic property of the symbol — it's a learned summary of how the symbol behaves in this prediction game.
        </Paragraph>
        <Paragraph>
          Here's the shift:
        </Paragraph>
        <ul>
          <li>
            <strong>Chapter 1:</strong> one probability distribution for every possible context (explodes).
          </li>
          <li>
            <strong>Chapter 2:</strong> one shared vector per token (reusable).
          </li>
        </ul>
        <Paragraph>
          Slide the context length up and watch how the "memorize everything" strategy runs into a scaling limit, while the "reusable parts"
          strategy stays efficient:
        </Paragraph>
        <ContextExplosionViz />
        <Paragraph>
          In this chapter, that reusable part is an <em>embedding table</em>: one learnable vector per token. It gives the model a place to store information about <Term>'a'</Term> or <Term>'b'</Term> that applies <em>everywhere</em>, not just in one specific context.
        </Paragraph>
        <Paragraph>
          But this raises a deeper question. Token IDs are just integers — arbitrary labels. For example, <Term>stoi['q'] = 17</Term> and{' '}
          <Term>stoi['u'] = 21</Term> tell us nothing about whether <Term>'q'</Term> and <Term>'u'</Term> are similar — yet in English, <Term>'q'</Term> is almost always followed by <Term>'u'</Term>.
        </Paragraph>
        <Paragraph>
          We need a representation where distance actually means something: <em>coordinates</em> in a space where nearby things behave similarly.
        </Paragraph>
        <Paragraph>
          <strong>The question:</strong> can we treat characters as points in a coordinate space? If we can, what should the coordinates mean?
        </Paragraph>

      </Section>

      <Section number="2.3" title="What Can We Measure?">
        <Paragraph>
          Before we talk about <em>how</em> to store information about tokens, we need to answer a more fundamental question: <strong>what information should we store?</strong>
        </Paragraph>
        <Paragraph>
          <strong>Two characters should be close if they predict similar next characters.</strong>
        </Paragraph>
        <Paragraph>
          Why this definition? Because we're building a <strong>language model</strong>, not a thesaurus. The model's job is to predict the next token. Two characters are "the same" for prediction purposes if they make the same predictions. Semantic similarity doesn't matter — predictive role is everything.
        </Paragraph>
        <Paragraph>
          If you had to bet money on what comes next after seeing <Term>'a'</Term> versus <Term>'e'</Term>, you'd offer similar odds. That's measurable. That's the geometry we're after.
        </Paragraph>
        <Callout variant="info" title="The target is computable">
          <Paragraph>
            <strong>Step 1: Compute the fingerprint.</strong> For each character <Term>c</Term>, count what follows it — this is the same conditional probability we built in Chapter 1 (Section 1.1.5):
          </Paragraph>
          <MathBlock
            equation={String.raw`P(\text{next}=x \mid c) = \frac{\text{count}(c \to x)}{\text{count}(c)}`}
            explanation="For each possible next character x, divide 'how often x follows c' by 'how often c appears'. This gives a 27-dimensional probability vector per character."
          />
          <Paragraph>
            <strong>Step 2: Compute fingerprint similarity.</strong> Two characters are "behaviorally similar" if their fingerprints overlap:
          </Paragraph>
          <MathBlock
            equation={String.raw`\text{sim}(a, e) = \sum_{i} P(i \mid a) \cdot P(i \mid e)`}
            explanation="The dot product of two fingerprints. High when both characters tend to precede the same next-characters."
          />
          <Paragraph>
            <strong>Step 3: The target.</strong> We want the learned embeddings to reflect this:
          </Paragraph>
          <MathBlock
            equation={String.raw`\text{dot}(E[a], E[e]) \approx \text{dot}(P(\cdot \mid a), P(\cdot \mid e))`}
            explanation="Make embedding similarity correlate with fingerprint similarity. We make one computable thing match another computable thing."
          />
        </Callout>
        <Paragraph>
          If after 'a' you often see 'n', 't', 's', and after 'e' you also often see 'n', 't', 's' — then 'a' and 'e' should be nearby. That's not philosophy. That's a rule you can compute.
        </Paragraph>
        <Paragraph>
          For each character <Term>c</Term>, we can build a "role vector": the distribution <Term>P(next | c)</Term>. Characters with similar role vectors should be close in embedding space. This is the ground truth we're aiming for.
        </Paragraph>
        <Paragraph>
          The visualization below breaks this down. It shows the "Fingerprint" of each character (what tends to follow it).
        </Paragraph>
        <CharacterClusterViz
          corpus={corpus}
          onCorpusChange={setCorpus}
          selectedA={charA}
          onChangeA={setCharA}
          selectedB={charB}
          onChangeB={setCharB}
        />
        <Paragraph>
          That similarity score isn't random. It's computed from the full{' '}
          <Term>P(next | c)</Term> fingerprints (all 27 probabilities) using the corpus above. The plot is just a 2‑D slice so a human can look at it.
        </Paragraph>
      </Section>

      <Section number="2.4" title="Vectors Are Just Storage">
        <Paragraph>
          Now we know <em>what</em> we want to capture: the <Term>P(next | c)</Term> fingerprint. The question is: <em>how</em> do we store it?
        </Paragraph>
        <Paragraph>
          We give every token a vector. Vectors fix a fundamental problem with integers.
        </Paragraph>
        <Paragraph>
          <strong>Integers are like Proper Nouns (Identities).</strong> <Term>stoi['cat'] = 17</Term> is just a unique name tag. It tells you <em>which</em> one it is, but nothing about <em>what</em> it is. You can't compare 'John' and 'Alice' just by looking at their names. John is Person #457. Alice is Person #203. The number 254 separating them? Meaningless.
        </Paragraph>
        <Paragraph>
          The naive first step is <Term>one-hot encoding</Term>: turn each integer into a vector of 0s with a single 1 at the token's index. But this is just the identity problem in disguise—the vectors are orthogonal (zero overlap), so "similar" tokens have identical dot products (zero) as "different" ones.
        </Paragraph>
        <OneHotViz />
        <Paragraph>
          <strong>Vectors are like Adjectives (Attributes).</strong> A vector is a list of measurable qualities: <Term>[Furry, Small, Living]</Term>. Now you can ask: how similar is John to Alice? Compare their <em>attributes</em>. John = [tall, quiet, left-handed]. Alice = [tall, quiet, right-handed]. They're similar on two dimensions, different on one. You can measure that.
        </Paragraph>
        <Paragraph>
          This shift—from "Who are you?" (<strong>Name</strong>) to "What are you like?" (<strong>Adjectives</strong>)—is what makes learning possible. Integers can't learn because there's no operation that moves 17 toward 42. There's no "slightly more" in discrete label space.
        </Paragraph>
        <Paragraph>
          Vectors live in continuous space. You can nudge them by tiny amounts. Tiny nudges add up. That's the entire reason they’re worth the trouble.
        </Paragraph>
        <DiscreteContinuousViz />
        <Paragraph>
          But why are we allowed to do this? Why should tokens have coordinates?
        </Paragraph>
        <Paragraph>
          Tokens have properties you can measure: <strong>statistical ones</strong>. <Term>apple</Term> has a high probability of appearing near <Term>eat</Term>. <Term>king</Term> appears near <Term>throne</Term>. Those relationships are numbers you can count.
        </Paragraph>

        <Paragraph>
          But why should these counts become coordinates? Try this: take the distribution for <Term>'a'</Term> and the distribution for <Term>'e'</Term>. Both often precede <Term>'n'</Term> — "an", "en". Average their vectors. The result has a high value in the "followed-by-n" slot. It predicts like something between <Term>'a'</Term> and <Term>'e'</Term>. That's not an accident — averaging vectors averaged the predictions.
        </Paragraph>

        <Paragraph>
          The dot product works too: high overlap between two vectors means both tokens predict similar next-characters. The geometry comes from the counts. Move in a direction, and predictions change in a corresponding way.
        </Paragraph>

        <Paragraph>
          But coordinates need to live somewhere persistent.
        </Paragraph>
        <Paragraph>
          Picture a table with one row per token. The row for <Term>'a'</Term> holds its coordinates — 64 numbers. When <Term>'a'</Term> appears in <Term>"cat"</Term>, we read that row. When <Term>'a'</Term> appears in <Term>"apple"</Term>, we read the same row. When training adjusts those numbers, it writes back to that row.
        </Paragraph>
        <Paragraph>
          If we have that, something important happens: evidence about <Term>'a'</Term> can accumulate. Whatever the model learns
          about <Term>'a'</Term> in one sentence comes along the next time <Term>'a'</Term> shows up somewhere else. No more
          one‑context islands.
        </Paragraph>
        <ul>
          <li><strong>Store:</strong> one coordinate vector per token (reusable everywhere).</li>
          <li><strong>Retrieve:</strong> given a token ID, grab its vector in one step.</li>
        </ul>
        <Paragraph>
          The simplest structure that does this is just a matrix.
        </Paragraph>
        <ul>
          <li><strong>Rows:</strong> one for every unique character in our vocabulary (27 of them).</li>
          <li><strong>Columns:</strong> the coordinate slots for that character (let's say 64 numbers).</li>
        </ul>
        <Paragraph>
          That's a <Term>27 × 64</Term> table. People usually call it an <strong>embedding table</strong>.
        </Paragraph>
        <CodeBlock filename="embeddings.py">{`import numpy as np

vocab_size = 27      # rows: one for each token
embed_dim = 64       # columns: how many attributes per token

# The filing cabinet:
E = np.random.randn(vocab_size, embed_dim).astype(np.float32)`}</CodeBlock>
        <Paragraph>
          Meet <Term>E</Term>: our first piece of <strong>shared memory</strong>. One row per character, one little bundle of coordinates per row.
        </Paragraph>
        <Paragraph>
          Sixty-four dimensions. You can't picture it. Nobody can. But the math doesn't care what you can picture — it works anyway. Every character lives at a single point in this impossible space, and somehow, through training, the characters that behave similarly end up as neighbors.
        </Paragraph>

        <Paragraph>
          Two quick grounding points before we talk about "meaning":
        </Paragraph>
        <ul>
          <li>
            <strong>Size:</strong> <Term>27 × 64</Term> float32s is <Term>6,912 bytes</Term> total (about 6.8 KB).
          </li>
          <li>
            <strong>Initialization:</strong> those bytes start as random noise. Training is what turns "noise in RAM" into "a map you can use."
          </li>
        </ul>

        <Callout variant="info" title="Why 64 dimensions?">
          <Paragraph>
            The fingerprint <Term>P(next|c)</Term> has 27 numbers, but we are not copying that vector. We just need a space where dot products track fingerprint overlap. Extra dimensions give gradient descent slack: enough room to arrange tokens so their similarities line up, without forcing the model to memorize full distributions. Around 64 works for this tiny vocabulary; fewer cramps, many more just waste parameters.
          </Paragraph>
        </Callout>

        <Paragraph>
          The "adjectives" metaphor can feel a little unfair here, because right now it really is just 64 numbers.
        </Paragraph>
        <Paragraph>
          One concrete way to see "attributes" emerge is to pick a <em>direction</em> in embedding space and score each character by how much it points that way. (Like "vowel‑ish" or "space‑ish.")
        </Paragraph>
        <EmbeddingInspector corpus={corpus} />
        <Paragraph>
          Don't overtrust any one axis. A model can rotate the space and keep the same information as a <em>direction</em>, not a named column. The point is simpler: training turns those 6,912 bytes into a structured table you can probe.
        </Paragraph>

        <Callout variant="warning" title="Symmetry breaking: why random init matters">
          <Paragraph>
            If every embedding row starts identical, the model can't tell tokens apart. Every context produces the same logits, so softmax is uniform:
          </Paragraph>
          <MathBlock
            equation={String.raw`\text{softmax}([k,\ldots,k]) = \left[\frac{1}{V},\ldots,\frac{1}{V}\right]`}
            explanation="Here V is the vocabulary size."
          />
          <Paragraph>
            When all rows are the same, every row receives the same update. The symmetry never breaks, so nothing can specialize. Random initialization breaks the tie — then the data can pull different characters in different directions.
          </Paragraph>
        </Callout>

        <Paragraph>
          That smallness is the point. A full <Term>P(next | context)</Term> table needs <Term>V<sup>T</sup></Term> contexts and <Term>V</Term> outcomes — <Term>V<sup>T+1</sup></Term> numbers.
          For <Term>V = 27</Term> and <Term>T = 8</Term>, that's <Term>27<sup>9</sup> ≈ 7.6×10<sup>12</sup></Term> values.
          An embedding model with <Term>D = 64</Term> stores <Term>V×D = 1,728</Term> numbers (tied embeddings), or about twice that if you keep separate output weights. Either way: <strong>billions</strong> of times smaller — exponential becomes linear.
        </Paragraph>
        <Paragraph>
          Right now it's random, which means it has no structure yet. But it's <em>consistent</em> randomness: every time the text contains <Term>'a'</Term>, you fetch the same row, so all the evidence about <Term>'a'</Term> keeps piling into the same 64 slots.
        </Paragraph>
        <Paragraph>
          So the "no more islands" win is built into the data structure: the same row gets reused in every context. If the model learns something useful about <Term>'q'</Term> in one place, that information comes along the next time <Term>'q'</Term> shows up somewhere else.
        </Paragraph>
        <Paragraph>
          The matrix starts as noise. Training is what turns it into a map: it nudges rows so tokens with similar next‑character fingerprints end up nearby.
          To talk about training, we need one last mechanical piece: how an integer ID selects a row from <Term>E</Term>.
        </Paragraph>

      </Section>

      <Section number="2.5" title="The Embedding Lookup">
        <Paragraph>
          Mechanically, an embedding layer is surprisingly simple. It's just a <Term>lookup table</Term>.
        </Paragraph>
        <CodeBlock filename="lookup.py">{`# stoi maps characters to ids. Example:
ix = stoi['h']

# A single embedding vector (shape [embed_dim])
x = E[ix]`}</CodeBlock>
        <Paragraph>
          To create a rigorous link between "Identity" (Integer) and "Attributes" (Vector), we need a translator. That translator is the <strong>One-Hot Vector</strong>.
        </Paragraph>
        <Paragraph>
          It is the simplest possible vector: a list of zeros with a single <Term>1</Term> at the index of the character we want.
          <br />
          For ID 3 (in a vocab of 5): <Term>[0, 0, 0, 1, 0]</Term>.
        </Paragraph>
        <Paragraph>
          Why do this? Because matrix multiplication is just a weighted sum of rows. Multiply the one‑hot vector by the Embedding Table <Term>E</Term>:
        </Paragraph>
        <MathBlock
          equation={String.raw`\begin{aligned}
[0,0,0,1,0]\cdot E &= 0\cdot \text{Row}_0 + 0\cdot \text{Row}_1 + 0\cdot \text{Row}_2 + 1\cdot \text{Row}_3 + 0\cdot \text{Row}_4 \\
&= \text{Row}_3
\end{aligned}`}
          explanation="Only one weight is 1, so only one row survives."
        />
        <Paragraph>
          The result is exactly <Term>Row_3</Term>. A one-hot vector is a mathematical "selector switch."
        </Paragraph>
        <MathBlock
          equation={String.raw`\begin{bmatrix} 0 & 1 & 0 \end{bmatrix} \cdot \begin{bmatrix} a & b \\ c & d \\ e & f \end{bmatrix} = \begin{bmatrix} c & d \end{bmatrix}`}
          explanation="The 1 'activates' the second row. The 0s 'silence' the others."
        />
      </Section>

      <Section number="2.5.1" title="Row Selection (You Can See It)">
        <Paragraph>
          This demo uses a tiny character vocabulary so you can watch the lookup happen.
        </Paragraph>
        <MatrixRowSelectViz />
        <Paragraph>
          We call it a "lookup," but you can write it as <Term>xᵀW</Term>. That's just a linear layer. The one‑hot vector
          decides which row gets credit — and which row gets gradients — when we start training.
        </Paragraph>
        <Paragraph>
          Why does this matter for training? If the input is <Term>'c'</Term> (index 3), the output is <Term>E[3]</Term>. Rows 0, 1, 2, 4... don't appear in the computation. If the prediction is wrong, the only numbers you can adjust to fix it are the 64 values in row 3. Changing row 0 wouldn't change the output — row 0 wasn't used. The one-hot isolates which row is responsible.
        </Paragraph>
      </Section>

      <Section number="2.5.2" title="Do the Lookup (NumPy)">
        <Paragraph>
          In real code, you don't loop over tokens and do 64 multiplications by hand. You just index the table.
        </Paragraph>
        <CodeChallenge phase="2.5.2" title="Batch embedding lookup">
          <CodeChallenge.Setup>
            <CodeBlock filename="lookup_batch.py">{`import numpy as np

vocab_size = 27
embed_dim = 64

E = np.random.randn(vocab_size, embed_dim).astype(np.float32)

# Two examples, context length 4 (shape [B=2, T=4])
X = np.array([
  [3, 2, 4, 4],
  [2, 4, 4, 5],
], dtype=np.int64)`}</CodeBlock>
          </CodeChallenge.Setup>
          <CodeChallenge.Prompt>
            <Paragraph>
              Write one line that turns token IDs <code>X</code> (shape <Term>[2, 4]</Term>) into embeddings (shape{' '}
              <Term>[2, 4, 64]</Term>) using <code>E</code>.
            </Paragraph>
          </CodeChallenge.Prompt>
          <CodeChallenge.Solution>
            <CodeChallenge.Answer>
              <CodeBlock>{`X_emb = E[X]
print(X_emb.shape)  # (2, 4, 64)`}</CodeBlock>
            </CodeChallenge.Answer>
            <Paragraph>
              This is NumPy's "fancy indexing". It performs the lookup for every ID in <code>X</code> simultaneously. The new embedding dimension just appears on the last axis.
            </Paragraph>
          </CodeChallenge.Solution>
        </CodeChallenge>
      </Section>

          <Section number="2.6" title="Measuring Similarity: Overlap (Dot Product)">
            <Paragraph>
              Earlier we gave every character a "fingerprint": a full distribution <Term>P(next | c)</Term>.
            </Paragraph>
            <Paragraph>
              Now we need one concrete question we can compute: do these two fingerprints put probability mass on the{' '}
              <em>same</em> next characters?
            </Paragraph>

          <WorkedExample title="A tiny overlap calculation">
            <WorkedStep n="1">
              <Paragraph>
                Shrink the universe. Pretend there are only three possible next characters: <Term>'a'</Term>, <Term>'b'</Term>, and space <Term>␣</Term>.
              </Paragraph>
              <Paragraph>
                Two contexts give two next‑character distributions:
              </Paragraph>
              <MathBlock equation={String.raw`p(A) = [0.7,\; 0.2,\; 0.1] \qquad p(B) = [0.6,\; 0.1,\; 0.3]`} />
            </WorkedStep>
            <WorkedStep n="2">
              <Paragraph>
                Now do the "two weighted dice" thought experiment: roll once from A and once from B. They match only if they land on the same symbol.
              </Paragraph>
              <MathBlock
                equation={String.raw`P(\text{match}) = (0.7\cdot 0.6) \;+\; (0.2\cdot 0.1) \;+\; (0.1\cdot 0.3) \;=\; 0.47`}
                explanation="One term per symbol. Multiply, then add."
              />
            </WorkedStep>
            <WorkedStep n="3" final>
              <Paragraph>
                Scale back up to a real vocabulary: it's the same sum, just longer:
              </Paragraph>
              <MathBlock equation={String.raw`P(\text{match}) = \sum_i p_i(A)\,p_i(B)`} />
              <WorkedNote>
                That's the dot product formula in disguise. For probability vectors, <Term>p(A)·p(B)</Term> is literally <Term>P(match)</Term>.
              </WorkedNote>
            </WorkedStep>
          </WorkedExample>

            <MathBlock
              equation={String.raw`a \cdot b = \sum_{i=1}^{D} a_i b_i`}
              explanation="Same sum: multiply matching coordinates, then add them up."
            />

            <Callout variant="insight" title="Grassmann's geometry made concrete">
              <Paragraph>
                This is Grassmann's insight from <SectionLink to="2.1">Section 2.1</SectionLink>, made usable. The dot product is the "projection"
                tool: a single number that says how aligned two vectors are.
              </Paragraph>
            </Callout>

        <Paragraph>
          Before we go further, let's see what the dot product actually <em>looks like</em>. Drag the arrows below:
        </Paragraph>

        <GeometricDotProductViz />

        <Paragraph>
          That's the geometric view: the dot product measures how much one vector <em>projects onto</em> (casts a shadow onto) another. Parallel vectors have high dot products; perpendicular vectors have zero; opposite vectors have negative.
        </Paragraph>

        <Paragraph>
          Now here's the connection to probability: when A and B are probability distributions (like our character fingerprints), the "shadow" interpretation becomes "overlap" — how much probability mass lands in the same places.
        </Paragraph>

        <Paragraph>
          So why does this particular sum show up everywhere? Because it plays perfectly with the only move we've allowed
          ourselves so far: <em>linear mixing</em>. If you blend vectors, dot products blend too:
        </Paragraph>
        <MathBlock
          equation={String.raw`(\alpha a + \beta b)\cdot c = \alpha(a\cdot c) + \beta(b\cdot c)`}
          explanation="Similarity of a blend = blend of similarities."
        />
        <Paragraph>
          Concrete example: suppose <Term>'a'</Term> has similarity 0.7 to <Term>'n'</Term>, and <Term>'e'</Term> has similarity 0.5 to <Term>'n'</Term>. What's the similarity of their average to <Term>'n'</Term>? You already know: it's 0.6. The formula says so. You don't have to build the averaged vector and recompute — the answer falls out from what you already measured.
        </Paragraph>

        <Paragraph>
          One dot product is one similarity score. Stack vectors into matrices and you can compute a whole grid of scores at
          once — that's just matrix multiplication. (We'll use that trick constantly.)
        </Paragraph>

        <Paragraph>
          You'll also hear about <Term>cosine similarity</Term>. It's the dot product after you normalize both vectors to
          length 1 — same comparison, but with magnitude factored out.
        </Paragraph>

        <Paragraph>
          In the widget below, we're dotting two <em>probability vectors</em>, so every coordinate is non‑negative and the score
          is pure overlap. Later, learned embeddings aren't probabilities: coordinates can go negative, dot products can cancel,
          and "agreement vs conflict" becomes something the model can represent by direction.
        </Paragraph>

        <Callout variant="insight" title="Pause and predict">
          <Paragraph>
            Before you look at the visualization: which pair do you expect to have <strong>higher overlap</strong> — <Term>'a'</Term> and <Term>'e'</Term>, or <Term>'a'</Term> and <Term>'q'</Term>?
          </Paragraph>
          <Paragraph>
            Think about what tends to follow each character. Do <Term>'a'</Term> and <Term>'e'</Term> share common successors? What about <Term>'a'</Term> and <Term>'q'</Term>?
          </Paragraph>
        </Callout>

        <DotProductViz
          corpus={corpus}
          showCorpusEditor={false}
          charA={charA}
          charB={charB}
          onCharAChange={setCharA}
          onCharBChange={setCharB}
        />
        <CodeBlock filename="dot.py">{`import numpy as np

score = float(np.dot(a, b))`}</CodeBlock>
        <Paragraph>
          One small grounding point: if two vectors are basically "uniform noise", the dot product has a predictable
          baseline. For a uniform distribution over <Term>V</Term> characters, every coordinate is:
        </Paragraph>
        <MathBlock equation={String.raw`p_i = \frac{1}{V}`} />
        <MathBlock equation={String.raw`p \cdot p = \sum_i p_i^2 = \frac{1}{V}`} />
        <Paragraph>
          That's why the gauge shows a <Term>1/V</Term> marker.
        </Paragraph>

        <Callout variant="info" title="Why dot products show up everywhere">
          <Paragraph>
            You could measure similarity lots of ways, but dot product is the workhorse because it hits three practical constraints at once:
          </Paragraph>
          <ul>
            <li>
              <strong>Differentiable:</strong> <Term>∂(a·b)/∂a = b</Term> gives clean gradients.
            </li>
            <li>
              <strong>Linear-friendly:</strong> <Term>(a+b)·c = a·c + b·c</Term>, so it composes cleanly when we mix and stack vectors.
            </li>
            <li>
              <strong>Fast:</strong> multiply‑accumulate is the GPU primitive.
            </li>
          </ul>
          <Paragraph>
            In transformers, attention scores are (scaled) dot products for the same reason: it’s a cheap, trainable way to ask “how aligned are these two vectors?”
          </Paragraph>
        </Callout>
      </Section>

      <Section number="2.7" title="From Scores to Probabilities (Softmax)">
        <Paragraph>
          We have a problem. The dot product gives us <strong>logits</strong>: raw numbers like <Term>-5</Term>, <Term>0.2</Term>, or <Term>14</Term>.
        </Paragraph>
        <Paragraph>
          But Chapter 1 established a hard rule: the model must output a <strong>probability distribution</strong>. The numbers must be between 0 and 1, and they must sum to exactly 1.
        </Paragraph>
        <Paragraph>
          Why do we use <strong>softmax</strong>? Why not something simpler? Let's build it from first principles.
        </Paragraph>
        <Paragraph>
          We want to take “scores” and turn them into “bets” — a set of numbers that add up to 1, so we can say what the model thinks is likely next.
        </Paragraph>

        <Paragraph>
          The annoying part is that logits don’t behave like probabilities:
        </Paragraph>
        <ul>
          <li><strong>They can be negative.</strong> A logit of <Term>-5</Term> is allowed. A probability of <Term>-5</Term> is not.</li>
          <li><strong>They don’t sum to anything.</strong> A valid distribution has a hard “budget” of 1.</li>
          <li>
            <strong>We want smoothness.</strong> If you nudge a logit by a tiny amount, the probability should change by a tiny amount. (Hard rules like “take the max” are brittle.)
          </li>
        </ul>
        <Paragraph>
          So let’s try a few naive ideas and watch them break.
        </Paragraph>
        <Paragraph>
          <strong>Naive idea #1: divide by the sum.</strong> Suppose the scores are <Term>[2, -3, 4]</Term>. The sum is <Term>3</Term>, so you get <Term>[0.66, -1.0, 1.33]</Term>. Negative “probabilities” and values above 1. Not allowed.
        </Paragraph>
        <Paragraph>
          <strong>Naive idea #2: clamp negatives to 0, then normalize.</strong> This avoids negative outputs, but it introduces a weird bias: once something hits 0, it can get “stuck” there (and ties become common). It also makes the mapping very sensitive to arbitrary thresholds.
        </Paragraph>
        <Paragraph>
          <strong>Naive idea #3: shift everything up, then normalize.</strong> You can add a constant until all scores are positive, then divide by the sum. The problem is: <em>which constant?</em> Different shifts produce different probability ratios, so we’ve smuggled in a free parameter that changes the answer.
        </Paragraph>
        <Paragraph>
          What we want is a way to (1) make everything positive, without arbitrary clipping, and (2) make gaps in score show up as gaps in “bet size”.
        </Paragraph>
        <Paragraph>
          The exponential does exactly that. It turns any real number into a positive number, and it turns score differences into odds:
          <Term>{' '}exp(a) / exp(b) = exp(a − b)</Term>. A small gap becomes a multiplicative ratio.
        </Paragraph>
        <Paragraph>
          There's a deeper reason why the exponential is the right choice. When two events are independent, their probabilities multiply: <Term>P(A and B) = P(A) × P(B)</Term>. But their scores add: <Term>score(A and B) = score(A) + score(B)</Term>. We need a function that turns sums into products — that is, <Term>f(x + y) = f(x) · f(y)</Term>.
        </Paragraph>
        <Paragraph>
          Under mild regularity assumptions, the exponential is the unique function with this property. That’s why <Term>exp</Term> is the standard bridge between additive scores and multiplicative probabilities.
        </Paragraph>

        <MathBlock
          equation={String.raw`\text{Softmax}(x_i) = \frac{e^{x_i}}{\sum_{j} e^{x_j}}`}
          explanation="Take each score x_i and turn it into a positive weight with e^{x_i}. Then divide by the total weight so everything sums to 1. (Weights → probabilities.)"
        />

        <Paragraph>
          One important detail, because it shows up in both the math and the code: softmax only cares about <em>differences</em>. If you add the same constant to every logit, the probabilities stay exactly the same.
        </Paragraph>
        <Paragraph>
          That gives us permission to pick a convenient constant. In code, we almost always subtract the max logit so the largest exponent is <MathInline equation={String.raw`e^{0}=1`} /> and nothing overflows.
        </Paragraph>

        <Callout variant="info" title="Softmax differences → stable code">
          <Paragraph>
            Softmax is shift‑invariant — adding the same constant to every logit does nothing:
          </Paragraph>
          <MathBlock
            equation={String.raw`\text{Softmax}(x_i + c) = \frac{e^{x_i + c}}{\sum_j e^{x_j + c}} = \text{Softmax}(x_i)`}
            explanation="The same exp(c) factor appears in every term, so it cancels."
          />
          <Paragraph>
            So we choose a constant that makes the computation safe. In practice:
          </Paragraph>
          <MathBlock
            equation={String.raw`\text{Softmax}(x_i) = \frac{e^{x_i - m}}{\sum_{j} e^{x_j - m}} \quad \text{where } m = \max_j x_j`}
            explanation="Same probabilities, but now every exponent is ≤ 1."
          />
        </Callout>

        <WorkedExample title="Numerical stability: the overflow that max-subtraction prevents">
          <WorkedStep n="1">
            <Paragraph>
              Take logits like <MathInline equation={String.raw`[100,\;0,\;-100]`} />. The probabilities are extremely concentrated on the first
              entry — but the <em>computation</em> still needs to behave.
            </Paragraph>
          </WorkedStep>
          <WorkedStep n="2">
            <Paragraph>
              If you naively compute <MathInline equation={String.raw`e^{100}`} /> in floating point, you’re living dangerously. In <Term>float32</Term>, <MathInline equation={String.raw`e^{100}`} /> is already huge; by <MathInline equation={String.raw`e^{1000}`} /> you overflow to <Term>∞</Term>.
            </Paragraph>
          </WorkedStep>
          <WorkedStep n="3" final>
            <Paragraph>
              Max-subtraction rewrites the same softmax with safer numbers:
              <MathInline equation={String.raw`[100,\;0,\;-100] - 100 = [0,\;-100,\;-200]`} />.
              Now the biggest exponent is <MathInline equation={String.raw`e^{0}=1`} />, and everything else is ≤ 1.
            </Paragraph>
            <WorkedNote>
              This isn’t a hack. It’s the same probabilities — we’re just choosing a constant that makes the computation well-behaved.
            </WorkedNote>
          </WorkedStep>
        </WorkedExample>

        <CodeBlock filename="stable_softmax.py">{`import numpy as np

def softmax(z):
    z = z - z.max()           # subtract max for stability
    e = np.exp(z)
    return e / e.sum()

def log_softmax(z):
    z = z - z.max()
    logZ = np.log(np.exp(z).sum())  # log-sum-exp (simple form)
    return z - logZ`}</CodeBlock>
        <Callout variant="warning" title="Numerical stability is not optional">
          <Paragraph>
            One batch with large logits can overflow <Term>exp</Term>, produce <Term>NaN</Term>, and poison every parameter through backprop.
            The fix is one line: <Term>z = z - z.max()</Term>.
          </Paragraph>
        </Callout>

        <WorkedExample title="Softmax by hand (3 logits)">
          <WorkedStep n="1">
            <Paragraph>
              Pick a tiny logit vector: <MathInline equation={String.raw`\ell=[2,\,-3,\,4]`} /> with <MathInline equation={String.raw`T=1`} />. The max is <MathInline equation={String.raw`m=4`} />.
            </Paragraph>
          </WorkedStep>
          <WorkedStep n="2">
            <Paragraph>
              Subtract the max (safe numerics, same probabilities):{' '}
              <MathInline equation={String.raw`\ell'=\ell-m=[-2,\,-7,\,0]`} />.
            </Paragraph>
          </WorkedStep>
          <WorkedStep n="3">
            <Paragraph>
              Exponentiate: <MathInline equation={String.raw`e^{-2}\approx 0.135`} />, <MathInline equation={String.raw`e^{-7}\approx 0.00091`} />, <MathInline equation={String.raw`e^{0}=1`} />.
            </Paragraph>
          </WorkedStep>
          <WorkedStep n="4" final>
            <Paragraph>
              Normalize by the sum <MathInline equation={String.raw`S\approx 1.136`} />:
              <MathInline equation={String.raw`p\approx [0.119,\;0.0008,\;0.880]`} />.
            </Paragraph>
            <WorkedNote>
              Almost all the mass lands on the largest logit. Nothing “mystical” happened — we just turned score gaps into odds, then renormalized.
            </WorkedNote>
          </WorkedStep>
        </WorkedExample>

        <Paragraph>
          Drag the sliders below. Two things happen:
        </Paragraph>
        <ol>
          <li><strong>No negatives:</strong> Even if you drag a logit to -5, the probability is just small, not negative.</li>
          <li><strong>Winner takes all:</strong> Because of the exponential, the highest logit quickly dominates the others. We'd like the <em>max</em>, but we need it to be "soft" (differentiable) so we can train it. Hence: <strong>Softmax</strong>.</li>
        </ol>
        <SoftmaxWidget />
        <Paragraph>
          One extra knob you'll see in basically every LLM API is <Term>temperature</Term>. It's just a scale on the logits before softmax:
        </Paragraph>
        <MathBlock
          equation={String.raw`\text{Softmax}_T(x_i) = \frac{e^{x_i / T}}{\sum_j e^{x_j / T}}`}
          explanation="Low T sharpens the distribution. High T flattens it."
        />
        <Callout variant="insight" title="Pause and predict">
          <Paragraph>
            If you <strong>decrease</strong> temperature (T → 0), what happens to the probability distribution? Does it get <em>sharper</em> (more concentrated on the winner) or <em>flatter</em> (more uniform)?
          </Paragraph>
          <Paragraph>
            Hint: look at the formula. What happens to the exponent gaps when you divide by a smaller T?
          </Paragraph>
        </Callout>
        <Paragraph>
          In the widget above, try sliding <Term>T</Term> down toward <Term>0.1</Term> and up toward <Term>5</Term>. You're not changing which logit is biggest — you're changing how aggressively softmax concentrates probability mass on the winner.
        </Paragraph>

        <WorkedExample title="Temperature sharpens (same logits, different T)">
          <WorkedStep n="1">
            <Paragraph>
              Reuse the shifted logits from above: <MathInline equation={String.raw`\ell'=[-2,\,-7,\,0]`} />.
              With <MathInline equation={String.raw`T=0.5`} />, we divide by <MathInline equation={String.raw`T`} /> so the gaps double:
              <MathInline equation={String.raw`\ell'/T=[-4,\,-14,\,0]`} />.
            </Paragraph>
          </WorkedStep>
          <WorkedStep n="2" final>
            <Paragraph>
              Exponentiate and normalize:
              <MathInline equation={String.raw`e^{-4}\approx 0.018`} />, <MathInline equation={String.raw`e^{-14}\approx 8\times 10^{-7}`} />, <MathInline equation={String.raw`e^{0}=1`} />
              → <MathInline equation={String.raw`p\approx [0.018,\;0.0000008,\;0.982]`} />.
            </Paragraph>
            <WorkedNote>
              The ratio view makes the rule obvious: <MathInline equation={String.raw`\frac{p_i}{p_j}=\exp\!\left(\frac{\ell_i-\ell_j}{T}\right)`} />. Lower <MathInline equation={String.raw`T`} /> makes the same logit gaps explode into larger odds.
            </WorkedNote>
          </WorkedStep>
        </WorkedExample>

        <Paragraph>
          If the word <Term>temperature</Term> feels oddly physical here, that's because it is. Boltzmann discovered this same "exponentiate and normalize" pattern in 1877 when modeling how particles distribute across energy states.<Cite n={7} /><Cite n={8} /> The connection runs deep: in physics, low energy means high probability; in ML, high score means high probability. Swap the sign and you get the same formula.
        </Paragraph>
        <Paragraph>
          Boltzmann was doing this before anyone could watch atoms directly — he argued you could infer the invisible from statistics.<Cite n={9} /> Einstein's 1905 Brownian-motion analysis helped prove him right.<Cite n={10} /> The mathematics outlived the controversy.
        </Paragraph>
        <Paragraph>
          Before we jump into the triangle view, let’s make softmax feel mechanical: three scores in, three probabilities out.
          Try the tiny challenge below — it forces you to think in ratios, not vibes.
        </Paragraph>

        <SoftmaxBarsViz />

        <Paragraph>
          To make this geometry visible, we’ll temporarily shrink the universe to three options. The set of all valid 3‑way probability distributions is a triangle called the <Term>probability simplex</Term>: corners are certainty, the center is uniform. Softmax moves you around inside this triangle as you change logits and temperature.
        </Paragraph>

        <SoftmaxSimplexViz />

        <Paragraph>
          Watch how temperature pulls the point around: low <Term>T</Term> drives toward corners (certainty), high <Term>T</Term> drifts toward the center (uncertainty). Same logits, different confidence.
        </Paragraph>

        <Paragraph>
          The simplex is “probability space” — it shows every valid distribution you could end up with. Sometimes it’s helpful to flip the view and look at softmax itself as a function: take two logit gaps, and ask what probability comes out.
        </Paragraph>
        <SoftmaxLandscapeViz />

        <Paragraph>
          There’s a reason we care about “smoothness” and not just “a way to normalize.” Later, we’re going to train by nudging numbers so a score goes down. A smooth probability map is something you can differentiate — which means it can tell you which way is uphill.
        </Paragraph>

        <Paragraph>
          One more useful intuition for temperature:
        </Paragraph>
        <ul>
          <li><strong>T → 0:</strong> The model becomes a greedy argmax. Only the highest-logit token has any probability mass.</li>
          <li><strong>T = 1:</strong> Sample according to the raw logits.</li>
          <li><strong>T → ∞:</strong> Everything flattens toward uniform.</li>
        </ul>
        <Paragraph>
          The distribution is what the model believes. Sampling is how you turn that belief into an actual next token. Click <strong>Draw 100</strong> a few times and watch the empirical histogram converge.
        </Paragraph>
        <SamplingConvergenceViz />
        <Paragraph>
          One detail that clears up a lot of confusion: temperature is mostly a <strong>sampling knob</strong>. You apply it at inference time by rescaling logits before softmax. It doesn’t add knowledge or remove knowledge — it changes how willing you are to take second‑best options.
        </Paragraph>
        <Paragraph>
          During training, we usually keep <Term>T</Term> fixed (often <Term>1</Term>) and let the model learn the logits themselves. At inference, temperature is you deciding how sharp you want those learned preferences to be.
        </Paragraph>
        <Paragraph>
          Axiomatic view: maximum‑entropy under constraints leads to an exponential family — softmax, with a temperature‑like scale. <Cite n={11} />
        </Paragraph>

        <Paragraph>
          We've been working with single examples: one context, one prediction, one loss. Real training runs batches — many examples at once. Before we get to training, let's set up the notation for that.
        </Paragraph>
      </Section>

      <Section number="2.8" title="Tensors: Batching Patterns">
        <Paragraph>
          Up to now, we've been drawing everything as "one sequence." But real data comes as a pile of sequences, and we want one notation that covers all of them.
        </Paragraph>
        <Paragraph>
          The mental picture is a spreadsheet: rows are examples, columns are token positions.
        </Paragraph>
        <Paragraph>
          So we stack <Term>B</Term> sequences (a batch), each of length <Term>T</Term>, into a table of token IDs: <Term>[B, T]</Term>.
          After embedding lookup, each ID becomes a <Term>D</Term>-dimensional vector, so the table grows a new axis: <Term>[B, T, D]</Term>.
          That's a tensor here: same idea, more axes.
        </Paragraph>
        <Paragraph>
          Click any cell in the grid. The <em>same</em> token ID always points to the <em>same</em> row in <Term>E</Term> — even when it appears in different places in the batch.
        </Paragraph>
        <TensorShapeBuilder />
        <Paragraph>
          Why do we care about batching? Two reasons: <strong>speed</strong> and <strong>stability</strong>.
        </Paragraph>
        <Paragraph>
          Speed: GPUs are designed for parallel operations on large arrays. Processing 64 examples at once is barely slower than processing 1 — but you get 64× more learning signal per forward pass. Without batching, training would take weeks instead of hours.
        </Paragraph>
        <Paragraph>
          Stability: each training example pulls the parameters in a slightly different direction. If you update after every single example, the path is noisy — you zigzag toward the goal. Averaging gradients over a batch smooths the signal. The update points more consistently downhill.
        </Paragraph>
        <Paragraph>
          From here on, we'll keep seeing these three letters: <Term>B</Term> (how many examples), <Term>T</Term> (context length), and <Term>D</Term> (features per token). They're the shape of everything that flows through the model.
        </Paragraph>
      </Section>

      <Section number="2.9" title="Synthesis: From Counts to Coordinates">
        <Paragraph>
          Let's trace the path we've taken — and why each step was needed:
        </Paragraph>
        <ol>
          <li>
            <strong>Foundation (2.1):</strong> Grassmann showed that if an object supports consistent mixing and scaling, you can represent it with coordinates and do geometry on it. We borrow that move: represent each token with a vector so “near/far” and interpolation mean something precise. (The symbol isn’t a vector; the embedding is the coordinate representation.)
          </li>
          <li>
            <strong>Problem (2.2):</strong> The <Term>(vocab_size)<sup>T</sup></Term> scaling limit. This pressure is why we need sharing: one
            reusable representation per token, instead of one table per context.
          </li>
          <li>
            <strong>Target (2.3):</strong> Sharing only helps if we know what “similar” should mean. Our ground truth is computable: tokens with
            similar <Term>P(next | token)</Term> should be close.
          </li>
          <li>
            <strong>Data structure (2.4):</strong> Once we know what we want to learn, we need somewhere to store it: an embedding table with one
            <Term>D</Term>-dimensional row per token.
          </li>
          <li>
            <strong>Mechanics (2.5):</strong> To use that table, we need row selection from IDs: <Term>E[ix]</Term>. One-hot vectors are a way to
            write “pick this row” as ordinary matrix multiplication.
          </li>
          <li>
            <strong>Similarity (2.6):</strong> After lookup, we need a score that compares vectors and plays nicely with gradients. Dot product is
            the simplest workhorse.
          </li>
          <li>
            <strong>Softmax (2.7):</strong> Scores aren’t probabilities. Softmax turns them into a valid distribution so we can train on log‑probability.
          </li>
          <li>
            <strong>Batching (2.8):</strong> Real training runs many examples and many positions at once. Tensors are just the shape bookkeeping for
            <Term>[B, T] → [B, T, D]</Term>.
          </li>
        </ol>

        <Invariants title="Chapter 2 Invariants">
          <InvariantItem>We replace giant context tables with shared, reusable number tables (matrices).</InvariantItem>
          <InvariantItem>Token IDs are just labels; integer distance is meaningless.</InvariantItem>
          <InvariantItem>Embeddings give tokens a learnable geometry — Grassmann's insight that abstract objects can be coordinates, now applied to language.</InvariantItem>

          <InvariantItem>"Similar" means "similar predictive role" — the ground truth is computable from corpus statistics.</InvariantItem>
          <InvariantItem>Embedding lookup is row selection: <Term>E[ix]</Term>.</InvariantItem>
          <InvariantItem>Embedding adds a feature dimension: <Term>[B, T]</Term> → <Term>[B, T, D]</Term>.</InvariantItem>
          <InvariantItem>Dot product is the main similarity metric — it's how we compare tokens.</InvariantItem>
          <InvariantItem>Softmax converts raw dot products (logits) into a valid probability distribution.</InvariantItem>
          <InvariantItem>Training repeatedly nudges those numbers based on prediction error.</InvariantItem>
        </Invariants>
        <Paragraph>
          We now have the map. But right now, <Term>E</Term> is random — characters scattered arbitrarily in space. Next we make it meaningful:{' '}
          <strong>how does random become meaningful?</strong>
        </Paragraph>
      </Section>

      <Section number="2.10" title="How Training Works">
        <Paragraph>
          Right now, <Term>E</Term> is random. Here's what happens when we train:
        </Paragraph>
        <ol>
          <li><strong>Initialize:</strong> Random coordinates. Characters are scattered arbitrarily in embedding space.</li>
          <li><strong>Predict:</strong> The model uses these coordinates to predict the next token. It's wrong.</li>
          <li><strong>Measure:</strong> We compute how wrong it was (the loss).</li>
          <li><strong>Nudge:</strong> We adjust the coordinates slightly to make the prediction better next time.</li>
          <li><strong>Repeat:</strong> Thousands of times. Millions of times.</li>
        </ol>
        <Paragraph>
          <em>Watch a tiny weight matrix learn. Click "Train Step" to see how the weights change:</em>
        </Paragraph>
        <NeuralTrainingDemo />
        <Paragraph>
          Concretely: the model outputs a probability distribution for the next character. The training data then reveals what actually came next. The loss is the negative log‑probability the model assigned to the truth. If the model gave the truth a tiny probability, the loss is large.
        </Paragraph>

        <Paragraph>
          Before we dive into how gradients steer the update, let's make the forward pass concrete. Every operation transforms data with a specific shape:
        </Paragraph>

        <TensorShapeViz />

        <Paragraph>
          So we have a scoreboard (<Term>loss</Term>). Now we need a steering wheel: a rule that says how to change the numbers to make that score go down.
        </Paragraph>
      </Section>

      <Section number="2.11" title="The Scoreboard (Cross-Entropy)">
        <Callout variant="info" title="How Do We Measure Quality?">
          <Paragraph>
            Now that we can assign probabilities, we get something rare in ML: a clean score.
          </Paragraph>
          <Paragraph>
            Take a piece of text. Walk through it left-to-right. At each position, ask the model for a distribution over the next character, then look at just one number: the probability it assigned to the character that actually happened.
          </Paragraph>
          <Paragraph>
            <strong>Step 1: Measure surprise for one prediction.</strong> Surprise is <Term>-log₂(probability)</Term>. If the model assigned P=0.5 to the correct character:
          </Paragraph>
          <MathBlock equation={String.raw`\text{surprise} = -\log_2(0.5) = 1 \text{ bit}`} />
          <Paragraph>
            If it was more confident (P=0.9), surprise is lower. If it was caught off guard (P=0.1), surprise is higher.
          </Paragraph>
          <Paragraph>
            <strong>Step 2: Average over all predictions.</strong> We have N characters to predict. Sum up all the surprises and divide by N:
          </Paragraph>
          <MathBlock equation={String.raw`H = \frac{1}{N}\bigl(\text{surprise}_1 + \text{surprise}_2 + \cdots + \text{surprise}_N\bigr)`} />
          <WorkedExample title="Two steps → average surprise (try your own numbers)">
            <WorkedStep n="1">
              <Paragraph>
                Pick two “probability of the truth” values:{' '}
                <WorkedValue
                  ariaLabel="probability for step one"
                  label="p₁"
                  value={pStep1}
                  min={0.01}
                  max={0.99}
                  step={0.05}
                  format={(v) => v.toFixed(2)}
                  onValueChange={setPStep1}
                />
                <WorkedValue
                  ariaLabel="probability for step two"
                  label="p₂"
                  value={pStep2}
                  min={0.01}
                  max={0.99}
                  step={0.05}
                  format={(v) => v.toFixed(2)}
                  onValueChange={setPStep2}
                />
              </Paragraph>
            </WorkedStep>
            <WorkedStep n="2" final>
              <Paragraph>
                Surprises (in bits):{' '}
                <code>s₁ = −log₂(p₁) = {(-Math.log2(pStep1)).toFixed(2)}</code>,{' '}
                <code>s₂ = −log₂(p₂) = {(-Math.log2(pStep2)).toFixed(2)}</code>.
              </Paragraph>
              <Paragraph>
                Average surprise:{' '}
                <code>H = (s₁ + s₂)/2 = {(((-Math.log2(pStep1)) + (-Math.log2(pStep2))) / 2).toFixed(2)} bits</code>.
              </Paragraph>
              <WorkedNote>
                Perplexity is just <code>2^H</code>. Here that’s{' '}
                <code>{Math.pow(2, (((-Math.log2(pStep1)) + (-Math.log2(pStep2))) / 2)).toFixed(2)}</code> “equally-likely choices” on average.
              </WorkedNote>
            </WorkedStep>
          </WorkedExample>
          <Paragraph>
            That's the cross-entropy (also called NLL when you sum it up instead of averaging).<Cite n={13} /> We can’t compute the true entropy of English directly — what we can compute is: “how surprised was <em>our model</em> on held‑out text?”
          </Paragraph>
        </Callout>

        <Paragraph>
          Shannon's insight was operational: information is surprise.<Cite n={12} /> We'll measure that surprise as <Term>surprise(p) = -log₂(p)</Term>. If you have a good model of English, it assigns high probability to what actually comes next, so it isn't surprised very often. If you have a terrible model, every prediction is a shock.
        </Paragraph>
        <Paragraph>
          The log isn’t decoration. Independent events multiply, and log is the bridge that turns “multiply probabilities” into “add scores”:
        </Paragraph>
        <MathBlock
          equation={String.raw`\text{Surprise}(A \text{ and } B) = -\log(P(A)\cdot P(B)) = -\log P(A) + (-\log P(B))`}
          explanation="This additivity is why log-loss composes cleanly across a whole sequence."
        />
        <Paragraph>
          And cross‑entropy is trainable. Accuracy is a step function (right/wrong), so its gradient is zero almost everywhere. Cross‑entropy is smooth: it still gives a learning signal when you’re barely right or confidently wrong.
        </Paragraph>
        <Paragraph>
          <strong>Cross-entropy is average surprise.</strong> Walk left‑to‑right. At each step, look at the probability the model gave to what actually happened next, take <Term>-log₂</Term>, and average. Lower means fewer shocks.<Cite n={13} />
        </Paragraph>

        <Callout variant="info" title="Concrete numbers">
          <Paragraph>
            Using <Term>-log₂(p)</Term> (bits):
          </Paragraph>
          <ul>
            <li><strong>p = 0.03</strong> → loss ≈ <strong>5.06 bits</strong> — very wrong (gave truth 3%).</li>
            <li><strong>p = 0.50</strong> → loss = <strong>1.00 bit</strong> — uncertain (a coin flip).</li>
            <li><strong>p = 0.90</strong> → loss ≈ <strong>0.15 bits</strong> — pretty good (90% confident).</li>
            <li><strong>p = 0.99</strong> → loss ≈ <strong>0.014 bits</strong> — excellent (nearly certain).</li>
          </ul>
        </Callout>

        <Paragraph>
          <strong>The scoreboard:</strong> Cross-entropy is the <em>only</em> thing we minimize. Every other concept — gradient, learning, structure — derives from reducing this number.
        </Paragraph>

        <CrossEntropyViz />
      </Section>

      <Section number="2.12" title="The Steering Wheel (Gradients)">
        <Paragraph>
          Start in one dimension, where you can actually picture it. Suppose the loss is a simple curve like <MathInline equation={String.raw`L(x)=x^2`} />. If you're at <MathInline equation={String.raw`x=2`} />, moving right makes <MathInline equation={String.raw`L`} /> bigger and moving left makes it smaller. That “which direction makes the loss go up if I nudge the knob?” fact is the <em>slope</em>.
        </Paragraph>
        <DerivativeViz />
        <Paragraph>
          Now take that slope idea and apply it to one of the model’s real knobs: a score for the true token. The widget below holds everything else fixed so you can feel what “one gradient step” is trying to do.
        </Paragraph>
        <GradientStepViz />
        <Paragraph>
          Now give yourself two knobs instead of one: <MathInline equation={String.raw`x`} /> and <MathInline equation={String.raw`y`} />. There’s a slope in the <MathInline equation={String.raw`x`} /> direction and a slope in the <MathInline equation={String.raw`y`} /> direction. Put those together and you get an arrow that points “most uphill” in the plane. That arrow is the <strong>gradient</strong>.
        </Paragraph>
        <Paragraph>
          A real model has millions of knobs, so we can’t draw the arrow — but the idea is the same. The gradient is “for every knob, how much would the loss increase if I nudged it upward?” If we want the loss to go down, we step in the opposite direction.
        </Paragraph>
        <Paragraph>
          One more ingredient: the learning rate <MathInline equation={String.raw`\eta`} />. It's the step size — how far we dare to move each update. Too small and training crawls. Too big and you bounce past good solutions.
        </Paragraph>

        <Callout variant="warning" title="Learning rate failure modes">
          <Paragraph>
            <strong>Too high (η = 10):</strong> The loss oscillates wildly or explodes to infinity. Each step overshoots the minimum, bouncing back and forth across the valley — or flies off entirely. You'll see loss jump: <Term>2.1 → 4.7 → 0.8 → nan</Term>.
          </Paragraph>
          <Paragraph>
            <strong>Too low (η = 0.0001):</strong> The loss barely moves. After 1000 epochs you've gone from <Term>3.30</Term> to <Term>3.28</Term>. Technically descending, but you'll die of old age first.
          </Paragraph>
          <Paragraph>
            <strong>Just right (η = 0.1 to 1.0 for small models):</strong> The loss decreases steadily without wild swings. Finding this takes experimentation — there's no formula, just "try a value, watch the loss curve, adjust."
          </Paragraph>
          <CodeBlock filename="lr_comparison.py">{`# Same model, same data, different learning rates:
# lr = 10.0:   epoch 1: 2.1, epoch 2: 847.3, epoch 3: nan
# lr = 0.0001: epoch 100: 3.29, epoch 500: 3.27, epoch 1000: 3.25
# lr = 0.1:    epoch 100: 2.4,  epoch 500: 1.8,  epoch 1000: 1.5`}</CodeBlock>
        </Callout>

        <Paragraph>
          There's one last bridge we need before this becomes a working training loop: a concrete gradient for the model's
          real knobs. For logits (the scores before softmax), that gradient has a famously simple shape: <Term>p − y</Term>.
          The widget below builds that up by measurement: nudge one score by <Term>ε</Term> and watch the loss respond.
        </Paragraph>
        <SoftmaxNudgeViz />
        <Paragraph>
          That tells us the “blame signal” for the logits. Next question: how does that blame reach the actual parameters —
          the embedding row and the weights — so they move in the right direction?
        </Paragraph>
        <ChainOfBlameViz />
        <Paragraph>
          In symbols, we write “the gradient of the loss” as <MathInline equation={String.raw`\nabla\text{loss}`} />. The update rule is just “step downhill”:
        </Paragraph>
        <MathBlock
          equation={String.raw`\text{parameters} \leftarrow \text{parameters} - \eta \cdot \nabla \text{loss}`}
          explanation="Gradient descent: move downhill on the loss."
        />

        <Paragraph>
          Here’s a “minimum viable language model” in code. One embedding lookup, one linear layer, one softmax, one loss, one update:
        </Paragraph>
        <CodeWalkthrough filename="tiny_embedding_lm.py" lang="python">
          <Step code="import numpy as np">
            Import NumPy so we can write the core moves as vector math: dot products, outer products, and shapes.
          </Step>
          <Step code="vocab = ['e', 'a', 'i']">
            A toy vocabulary: three tokens, so nothing hides.
          </Step>
          <Step code="stoi = {ch: i for i, ch in enumerate(vocab)}">
            Map tokens to integer IDs. (The IDs are just addresses.)
          </Step>
          <Step code="V = len(vocab)">
            Vocabulary size (<code>V = 3</code>).
          </Step>
          <Step code="D = 4">
            Embedding dimension: each token gets <code>D</code> learnable numbers.
          </Step>
          <Step code="rng = np.random.default_rng(0)">
            Fix a seed so the walkthrough is repeatable.
          </Step>
          <Step code="E = 0.01 * rng.standard_normal((V, D))">
            Embedding table <code>E</code>, shape <code>(V, D)</code>. Start as tiny noise.
          </Step>
          <Step code="Wout = 0.01 * rng.standard_normal((D, V))">
            Output weights <code>Wout</code>, shape <code>(D, V)</code>. Map a <code>D</code>-vector to <code>V</code> logits.
          </Step>
          <Step code="b = np.zeros(V)">
            Bias <code>b</code>, shape <code>(V,)</code>.
          </Step>
          <Step code="def softmax(z):">
            Softmax: logits in → probabilities out.
          </Step>
          <Step code="    z = z - z.max()">
            Stability: softmax only cares about differences, so we can subtract the max safely.
          </Step>
          <Step code="    e = np.exp(z)">
            Exponentiate to make everything positive.
          </Step>
          <Step code="    return e / e.sum()">
            Normalize to a distribution (sums to 1).
          </Step>
          <Step code="x = 'e'">
            Context token: what we just saw.
          </Step>
          <Step code="y = 'a'">
            Target token: what actually came next.
          </Step>
          <Step code="ix = stoi[x]">
            Convert the context token to an ID.
          </Step>
          <Step code="iy = stoi[y]">
            Convert the target token to an ID.
          </Step>
          <Step code="e_x = E[ix]">
            Lookup: select one row (shape <code>(D,)</code>).
          </Step>
          <Step code="logits = e_x @ Wout + b">
            Scores for each candidate next token (shape <code>(V,)</code>).
          </Step>
          <Step code="p = softmax(logits)">
            Convert scores to probabilities.
          </Step>
          <Step code="loss = -np.log(p[iy])">
            Cross‑entropy for one example: the surprise of the true token.
          </Step>
          <Step code="dlogits = p.copy()">
            Start the backward pass at the logits.
          </Step>
          <Step code="dlogits[iy] -= 1">
            The clean result: <code>dlogits = p − y</code> (where <code>y</code> is one‑hot).
          </Step>
          <Step code="dWout = np.outer(e_x, dlogits)">
            Gradient for <code>Wout</code>.
          </Step>
          <Step code="db = dlogits">
            Gradient for the bias.
          </Step>
          <Step code="dEix = dlogits @ Wout.T">
            Gradient for the selected embedding row.
          </Step>
          <Step code="lr = 0.1">
            Learning rate: step size.
          </Step>
          <Step code="Wout -= lr * dWout">
            Update <code>Wout</code>.
          </Step>
          <Step code="b -= lr * db">
            Update <code>b</code>.
          </Step>
          <Step code="E[ix] -= lr * dEix">
            Key detail: only <code>E[ix]</code> moves — the one row we actually looked up in the forward pass.
          </Step>
        </CodeWalkthrough>
      </Section>

      <Section number="2.13" title="The Training Loop">
        <Paragraph>
          Cross-entropy consumes a probability and spits out a score. But where does the probability come from? It's manufactured by a <strong>forward pass</strong>: the chain of operations that turns "I just saw <Term>q</Term>" into "here are my 27 bets on what's next."
          The simplest version:
        </Paragraph>
        <ol>
          <li>
            <strong>Lookup:</strong> given context character <Term>c</Term>, fetch its embedding <Term>e_c = E[c]</Term>
          </li>
          <li>
            <strong>Score:</strong> for each candidate next character <Term>j</Term>, compute <Term>score_j = e_c · E[j]</Term>
          </li>
          <li>
            <strong>Softmax:</strong> convert scores to probabilities <Term>p = softmax(scores)</Term>
          </li>
          <li>
            <strong>Loss:</strong> <Term>L = -log(p[actual])</Term> where <Term>actual</Term> is what really came next
          </li>
        </ol>
        <Paragraph>
          In this "tied embeddings" setup, <Term>E</Term> plays both roles: it's the lookup table <em>and</em> the set of candidate targets.
        </Paragraph>

        <Paragraph>Here's the punchline gradient for one training example. We'll derive it next:</Paragraph>
        <MathBlock
          equation={String.raw`\frac{\partial L}{\partial E[c]} = \underbrace{\sum_j p_j \cdot E[j]}_{\text{predicted centroid}} \;-\; \underbrace{E[\text{actual}]}_{\text{actual embedding}}`}
          explanation="Gradient = (where your probabilities say the answer 'is') minus (where the answer actually was)."
        />

        <Paragraph>
          That formula might look abstract. Let's watch it work on real numbers — step through one complete training update:
        </Paragraph>

        <Callout variant="insight" title="Pause and predict">
          <Paragraph>
            The model just predicted poorly — it gave the <em>wrong</em> answer high probability. Which direction should the context embedding move: <strong>toward</strong> the correct answer's embedding, or <strong>away</strong> from it?
          </Paragraph>
          <Paragraph>
            Think about what the dot product does. If you want the correct answer to score higher next time...
          </Paragraph>
        </Callout>

        <GradientTraceDemo />

        <Paragraph>
          One training example gives one small nudge. Do this across a corpus — millions of updates — and the embedding table gradually turns into neighborhoods that reflect the statistics.
        </Paragraph>

        <WorkedExample title="Reading the gradient (in plain terms)">
          <WorkedStep n="1">
            <Paragraph>
              <strong>Predicted centroid.</strong> First take a probability‑weighted average of candidate embeddings:
            </Paragraph>
            <MathBlock equation={String.raw`\hat{e} = \sum_j p_j \cdot E[j]`} />
            <Paragraph>
              If you're confident, the average collapses onto one row. If you're uncertain, it stays a blend.
            </Paragraph>
          </WorkedStep>
          <WorkedStep n="2">
            <Paragraph>
              <strong>The gap.</strong> The centroid is where your probability mass pointed — a weighted average of all candidate embeddings, weighted by how much probability you gave each one. <Term>E[actual]</Term> is where the answer actually was. If these two points differ, you were wrong. The gradient is the vector between them: (where you pointed) − (where you should have pointed).
            </Paragraph>
          </WorkedStep>
          <WorkedStep n="3">
            <Paragraph>
              <strong>Why does closing this gap help?</strong> Go back to how scoring works. The score for candidate <Term>j</Term> is <Term>E[context] · E[j]</Term>. A dot product. What makes a dot product big? When two vectors point in similar directions. What makes it small? When they point in different directions.
            </Paragraph>
          </WorkedStep>
          <WorkedStep n="4">
            <Paragraph>
              <strong>So the fix is geometric.</strong> Right now, <Term>E[context]</Term> is closer to the wrong answers than to the right one — that's why they got higher scores. To fix this, move <Term>E[context]</Term> toward <Term>E[actual]</Term>. As it gets closer, the dot product <Term>E[context] · E[actual]</Term> grows. Higher dot product → higher score → higher probability on the right answer.
            </Paragraph>
          </WorkedStep>
          <WorkedStep n="5">
            <Paragraph>
              <strong>And away from the mistakes.</strong> Moving toward <Term>E[actual]</Term> simultaneously moves away from the wrong candidates you over-weighted. Their dot products shrink. Their probabilities drop. One motion fixes both problems: boost the right answer, suppress the wrong ones.
            </Paragraph>
          </WorkedStep>
          <WorkedStep n="6" final>
            <Paragraph>
              <strong>The update rule.</strong> The gradient points from truth toward your prediction (uphill — the direction of increasing loss). We go the opposite way:
            </Paragraph>
            <MathBlock
              equation={String.raw`E[c] \leftarrow E[c] - \eta \cdot \frac{\partial L}{\partial E[c]}`}
              explanation="Subtract the gradient: move away from your prediction, toward the truth."
            />
          </WorkedStep>
        </WorkedExample>

        <WorkedExample title="Why neighborhoods form">
          <WorkedStep n="1">
            <Paragraph>
              <strong>One training example is one tug.</strong> The corpus contains <Term>"qu"</Term>. Context is <Term>'q'</Term>, answer is <Term>'u'</Term>. If the model gave <Term>'u'</Term> low probability, the gradient tugs <Term>E['q']</Term> toward <Term>E['u']</Term>. One pair produces one tug.
            </Paragraph>
          </WorkedStep>
          <WorkedStep n="2">
            <Paragraph>
              <strong>Each character accumulates tugs.</strong> Over the whole corpus, <Term>'q'</Term> gets tugged toward <Term>'u'</Term> thousands of times (because "qu" is everywhere). It also gets tugged toward <Term>'a'</Term> when "qa" appears, toward <Term>'i'</Term> when "qi" appears — but mostly toward <Term>'u'</Term>. The embedding for <Term>'q'</Term> ends up near the weighted average of its targets, weighted by how often each pairing occurred.
            </Paragraph>
          </WorkedStep>
          <WorkedStep n="3">
            <Paragraph>
              <strong>Similar tugs → similar endpoints.</strong> Now consider <Term>'a'</Term> and <Term>'e'</Term>. They're not identical, but they share patterns. Both precede <Term>'n'</Term> often ("an", "en"). Both precede <Term>'r'</Term> ("ar", "er"). Both precede <Term>'t'</Term> ("at", "et"). The set of targets pulling on <Term>'a'</Term> overlaps heavily with the set pulling on <Term>'e'</Term>.
            </Paragraph>
          </WorkedStep>
          <WorkedStep n="4">
            <Paragraph>
              <strong>The destination is determined by the tugs.</strong> Imagine two people start at random spots in a city. Person A is told: go toward the library, the coffee shop, the park. Person B is told: go toward the library, the bookstore, the park. They never meet. Nobody says "you two are similar." But they end up in the same neighborhood — because they were pulled toward overlapping destinations.
            </Paragraph>
          </WorkedStep>
          <WorkedStep n="5" final>
            <Paragraph>
              <strong>Structure emerges from prediction.</strong> We never labeled "'a' is like 'e'." We only asked the model to predict. But prediction requires positioning: to predict similar things, you need to be in a similar place. The geometry isn't imposed — it's discovered. The model finds it because it's the only way to do the job.
            </Paragraph>
          </WorkedStep>
        </WorkedExample>

        <Callout variant="info" title="Tied embeddings: one matrix, two roles">
          <Paragraph>
            You can use two tables: <Term>E_context</Term> (for lookups) and <Term>E_target</Term> (for scoring candidates). Tying sets{' '}
            <Term>E_context = E_target = E</Term>. It cuts parameters and often works well.
          </Paragraph>
          <Paragraph>
            With tying, each row learns from both roles: “move me toward what follows me” (context updates) and “be a good target for what precedes me” (target updates). The final geometry balances both forces.
          </Paragraph>
        </Callout>

        <Callout variant="info" title="Derivation: why the gradient has the form (predicted − actual)">
          <Paragraph>
            Softmax + cross‑entropy gives the clean “blame signal” at the logits:<Cite n={14} />
          </Paragraph>
          <MathBlock
            equation={String.raw`\frac{\partial L}{\partial \text{score}_j} = p_j - \mathbf{1}_{j=\text{actual}}`}
            explanation="(what you predicted) minus (what was true)."
          />
          <Paragraph>
            The score is a dot product, so its derivative points straight to the candidate vector:
          </Paragraph>
          <MathBlock
            equation={String.raw`\text{score}_j = E[c]\cdot E[j] \quad\Rightarrow\quad \frac{\partial \text{score}_j}{\partial E[c]} = E[j]`}
            explanation="Derivative of a dot product w.r.t. one vector is the other vector."
          />
          <Paragraph>
            Chain rule gives the centroid form:
          </Paragraph>
          <MathBlock
            equation={String.raw`\frac{\partial L}{\partial E[c]} = \sum_j \left(p_j - \mathbf{1}_{j=\text{actual}}\right)\! \cdot E[j] = \left(\sum_j p_j\cdot E[j]\right) - E[\text{actual}]`}
            explanation="This is the “predicted centroid minus actual” vector."
          />
        </Callout>

        <Callout variant="info" title="Matrix view: the model is learning a low-rank next-token table">
          <Paragraph>
            In this minimal tied‑embedding model, the full score table is a matrix of dot products:
          </Paragraph>
          <MathBlock equation={String.raw`S[c, j] = E[c]\cdot E[j] \qquad\Rightarrow\qquad S = EE^T`} />
          <Paragraph>
            Softmax turns each row of <Term>S</Term> into a next‑token distribution:
          </Paragraph>
          <MathBlock equation={String.raw`P_{\text{model}}(\text{next}=j \mid c) = \text{softmax}(S[c, :])_j`} />
          <Paragraph>
            A raw count table is <Term>V×V</Term>. An embedding table is <Term>V×D</Term>. When <Term>D \ll V</Term>, you’re forcing that big table through a low‑rank bottleneck — which is the whole point of “compression by geometry.” This family idea shows up all over classic NLP (e.g. Word2Vec).<Cite n={6} />
          </Paragraph>
        </Callout>

        <CodeChallenge phase="2.13.1" title="Compute the gradient by hand">
          <CodeChallenge.Setup>
            <CodeBlock filename="gradient_challenge.py">{`import numpy as np

# Simplified 2D example so you can verify by hand
context_embedding = np.array([0.5, 0.8])        # E['a']
actual_embedding = np.array([0.2, 0.3])          # E['t']

# All character embeddings (shape [6, 2])
all_embeddings = np.array([
    [0.5, 0.8],  # 'a'
    [0.6, 0.7],  # 'e'
    [0.2, 0.3],  # 't'
    [0.3, 0.4],  # 'n'
    [0.4, 0.3],  # 's'
    [0.9, 0.1],  # 'q'
])

# Softmax probabilities (what the model predicted)
# These come from: softmax([dot(context_embedding, E[i]) for i in all chars])
probabilities = np.array([0.25, 0.28, 0.15, 0.18, 0.10, 0.04])`}</CodeBlock>
          </CodeChallenge.Setup>
          <CodeChallenge.Prompt>
            <Paragraph>
              Implement the gradient formula we just derived. Remember: the gradient is <Term>predicted_centroid − actual_embedding</Term>.
            </Paragraph>
            <Paragraph>
              The predicted centroid is the probability-weighted average of all embeddings:
            </Paragraph>
            <MathBlock equation={String.raw`\hat{e} = \sum_j p_j \cdot E[j]`} />
          </CodeChallenge.Prompt>
          <CodeChallenge.Solution>
            <CodeChallenge.Answer>
              <CodeBlock>{`def compute_gradient(context_embedding, actual_embedding, all_embeddings, probabilities):
    """
    Compute the gradient of cross-entropy loss with respect to the context embedding.

    Args:
        context_embedding: Current embedding for the context character (shape: [D])
        actual_embedding: Embedding of the actual next character (shape: [D])
        all_embeddings: All character embeddings (shape: [vocab_size, D])
        probabilities: Softmax output (shape: [vocab_size])

    Returns:
        gradient: The gradient ∂L/∂E[context] (shape: [D])
    """
    # Step 1: Compute the predicted centroid (weighted average)
    predicted_centroid = np.sum(probabilities[:, None] * all_embeddings, axis=0)
    # Alternative: predicted_centroid = all_embeddings.T @ probabilities

    # Step 2: The gradient is predicted_centroid minus actual_embedding
    gradient = predicted_centroid - actual_embedding

    return gradient

# Test it
gradient = compute_gradient(context_embedding, actual_embedding, all_embeddings, probabilities)
print(f"Gradient: {gradient}")
print(f"Gradient shape: {gradient.shape}")
print(f"Gradient magnitude: {np.linalg.norm(gradient):.3f}")

# Verify the computation manually for the first dimension:
# predicted_centroid[0] = 0.25*0.5 + 0.28*0.6 + 0.15*0.2 + 0.18*0.3 + 0.10*0.4 + 0.04*0.9
#                       = 0.125 + 0.168 + 0.03 + 0.054 + 0.04 + 0.036
#                       = 0.453
# gradient[0] = 0.453 - 0.2 = 0.253 ✓`}</CodeBlock>
            </CodeChallenge.Answer>
            <Paragraph>
              <strong>In the visualization:</strong> The yellow arrow is this gradient. The magenta dashed arrow is the negative of it (the update direction: <Term>−η·gradient</Term>).
            </Paragraph>
                <Paragraph>
                  The gradient points from the actual answer toward the predicted centroid (uphill). When you update with{' '}
                  <Term>E[context] ← E[context] − η·gradient</Term>, you move opposite that arrow — downhill, toward the actual answer.
                </Paragraph>
                    <Paragraph>
                      This matters because the gradient has a simple meaning: "predicted centroid minus actual embedding." Characters that predict
                      similar next-characters keep getting nudged in similar directions. After thousands of updates, that's where clustering comes
                      from.
                </Paragraph>
          </CodeChallenge.Solution>
            </CodeChallenge>

                <Paragraph>
                  That "nudge" step is the mechanism. How do we know which direction makes things better?
                </Paragraph>
            <Paragraph>
              Take a second to see what we're actually asking here.
            </Paragraph>
        <Paragraph>
          We have 1,728 numbers scattered across a 64-dimensional space. We need to adjust them — but which way? Up? Down? There's no one looking at the problem saying "oh, this coordinate should be 0.3 instead of 0.5." The model has to feel its way through the dark.
        </Paragraph>
        <Paragraph>
          Imagine you're blindfolded in a hilly landscape, trying to find the lowest point. You can't see, but you <em>can</em> feel the ground under your feet. If the ground slopes down to your left, you step left. That's the basic instinct. Training is just doing it on lots of numbers, over and over.
        </Paragraph>
        <Paragraph>
          Now translate that to numbers. Say the model has just one adjustable number <Term>w</Term>, and <Term>L(w)</Term> tells us how wrong we are. To feel the slope, we wiggle:
        </Paragraph>
        <MathBlock
          equation={String.raw`\text{slope} = \frac{L(w + \epsilon) - L(w)}{\epsilon}`}
          explanation="Bump w by a tiny ε, see how much the loss changes. That ratio is the slope."
        />
        <Callout variant="insight" title="Backprop is the chain rule (industrialized)">
          <Paragraph>
            The finite-difference slope is the intuition: poke the loss and see which way it changes.
          </Paragraph>
          <Paragraph>
            But real models aren't one number. They're long chains of computation. The loss depends on <Term>w</Term> through a bunch of intermediate values, and the chain rule tells you how slopes flow through a chain:
          </Paragraph>
          <MathBlock
            equation={String.raw`\frac{dL}{dw} = \frac{dL}{dy} \cdot \frac{dy}{du} \cdot \frac{du}{dw}`}
            explanation="Local slopes multiply as you move backward through the computation."
          />
          <Paragraph>
            Backpropagation is just this idea repeated at scale: do one forward pass, keep the intermediates, then do one backward pass that walks the graph in reverse and accumulates <em>all</em> the slopes.
          </Paragraph>
          <Paragraph>
            The mental model stays the same: find the slope, step downhill.
          </Paragraph>
        </Callout>
        <Paragraph>
          Positive slope? Increasing <Term>w</Term> makes things worse — step the other way. Negative slope? <Term>w</Term> is heading somewhere good — keep going. The update rule writes itself:
        </Paragraph>
        <MathBlock
          equation={String.raw`w \leftarrow w - \eta \cdot \text{slope}`}
          explanation="Step opposite to the slope. η controls how big a step."
        />
        <Paragraph>
          That minus sign is doing all the work: it flips "uphill" into "go downhill."
        </Paragraph>
        <Paragraph>
          Real models have millions of numbers. You compute a slope for every single one — that collection of slopes is called the <em>gradient</em>. Following it downhill is <em>gradient descent</em>.
        </Paragraph>
        <Paragraph>
          The weird part is that nobody tells the model where to go. It only gets a loss and a gradient — local slope information. Each step asks: "which direction makes me slightly less wrong?" and takes that step. Repeat enough times, and structure emerges, even in a space you can't picture.
        </Paragraph>
        <GradientDescentViz />

        <Paragraph>
          Now zoom in on a single part of that gradient: how one context embedding gets pushed around.
        </Paragraph>
        <EmbeddingGradientViz />
        <Paragraph>
          Look at the arrows. If contexts <Term>'a'</Term> and <Term>'e'</Term> are both trying to predict <Term>'t'</Term>, their gradients often point in similar directions. They’re being asked to solve the same prediction problem.
        </Paragraph>
        <Paragraph>
          Change the compare context. If it shares targets with <Term>'a'</Term>, its arrow stays aligned. If it predicts something different, it points somewhere else. Over many updates, “gets similar gradients” turns into “ends up nearby.”
        </Paragraph>
        <Paragraph>
          One careful note: for a single example, if you freeze the candidate vectors <Term>E[j]</Term>, the loss is convex in the context vector <Term>E[c]</Term> (scores are linear in <Term>E[c]</Term>, and the log‑sum‑exp term is convex). Training updates <em>all</em> the vectors, so the full problem is non‑convex — you don’t get a global guarantee, but you do get a reliable local steering signal.
        </Paragraph>
        <Paragraph>
          <strong>The result:</strong> The coordinates start random, but training keeps nudging them until the geometry starts to mirror the statistics. Characters with similar next‑character fingerprints drift toward similar places.
        </Paragraph>

        <Paragraph>
          You can also get embeddings from count tables (e.g. SVD on a co‑occurrence matrix). Prediction‑based learning is doing something slightly different: it shapes vectors to make next‑token loss go down.
        </Paragraph>

        <Paragraph>
          We've computed one gradient by hand. We've seen the visualization. Now: <strong>type the loop and watch it work.</strong>
        </Paragraph>

        <CodeChallenge phase="2.13.2" title="Train a 1-layer bigram model">
          <CodeChallenge.Setup>
            <CodeBlock filename="train_bigram.py">{`import numpy as np

# Tiny corpus: just enough to see loss drop
corpus = "the cat sat on the mat" * 20
chars = sorted(set(corpus))
char_to_idx = {ch: i for i, ch in enumerate(chars)}
idx_to_char = {i: ch for i, ch in enumerate(chars)}

# Build training pairs: (context_char, next_char)
pairs = [(corpus[i], corpus[i+1]) for i in range(len(corpus)-1)]

# Initialize random embeddings (vocab_size × d_model)
vocab_size = len(chars)
d_model = 8
np.random.seed(42)
embeddings = np.random.randn(vocab_size, d_model) * 0.1

learning_rate = 0.1
num_epochs = 500

print(f"Corpus: '{corpus[:30]}...'")
print(f"Vocab: {chars}")
print(f"Training on {len(pairs)} bigram pairs")
print(f"Embeddings shape: {embeddings.shape}")
print(f"Learning rate: {learning_rate}\\n")`}</CodeBlock>
          </CodeChallenge.Setup>
          <CodeChallenge.Prompt>
            <Paragraph>
              Implement the training loop. For each epoch:
            </Paragraph>
            <ol>
              <li>For each (context, target) pair in the corpus</li>
              <li>Compute scores: dot product of context embedding with all embeddings</li>
              <li>Apply softmax to get probabilities</li>
              <li>Compute cross-entropy loss: <Term>−log(p[actual])</Term></li>
              <li>Compute gradient: <Term>predicted_centroid − actual_embedding</Term></li>
              <li>Update context embedding: <Term>E[context] ← E[context] − η·gradient</Term></li>
            </ol>
            <Paragraph>
              Print average loss every 100 epochs. Then add one tiny probe at the end: print two cosine similarities (e.g. <Term>cos(t, h)</Term> and <Term>cos(t, a)</Term>) to see whether "similar contexts drift together."
            </Paragraph>
          </CodeChallenge.Prompt>
          <CodeChallenge.Checkpoint>
            <Paragraph>
              Your exact numbers will differ, but the shape should feel like this:
            </Paragraph>
            <CodeBlock lang="text">{`Epoch 100: loss = 2.1
Epoch 200: loss = 1.9
Epoch 300: loss = 1.7
Epoch 400: loss = 1.6
Epoch 500: loss = 1.5

cos(t, h) = 0.7
cos(t, a) = 0.1`}</CodeBlock>
            <ul>
              <li><strong>Loss trends down.</strong> Not perfectly monotone, but downhill overall.</li>
              <li>
                <strong>Similar contexts look more aligned.</strong> On this tiny corpus, <Term>t</Term> and <Term>h</Term> both often precede <Term>e</Term> (in "the"), so <Term>cos(t, h)</Term> is often larger than <Term>cos(t, a)</Term>.
              </li>
            </ul>
            <Paragraph>
              If loss doesn't move at all, the usual culprits are: unstable softmax (no max-subtraction), taking <Term>log(0)</Term> (no epsilon), or updating the wrong row.
            </Paragraph>
          </CodeChallenge.Checkpoint>
          <CodeChallenge.Solution>
            <CodeChallenge.Answer>
              <CodeBlock>{`def softmax(scores):
    """Numerically stable softmax."""
    exp_scores = np.exp(scores - np.max(scores))
    return exp_scores / exp_scores.sum()

def cross_entropy(probs, target_idx):
    """Cross-entropy loss: -log(p[target])."""
    return -np.log(probs[target_idx] + 1e-10)  # Add epsilon for numerical stability

# Training loop
for epoch in range(num_epochs):
    total_loss = 0.0

    for context_char, target_char in pairs:
        # Get indices
        ctx_idx = char_to_idx[context_char]
        tgt_idx = char_to_idx[target_char]

        # Forward pass
        context_emb = embeddings[ctx_idx]
        scores = embeddings @ context_emb  # Dot product with all embeddings
        probs = softmax(scores)
        loss = cross_entropy(probs, tgt_idx)
        total_loss += loss

        # Backward pass: compute gradient
        predicted_centroid = embeddings.T @ probs  # Weighted average of all embeddings
        actual_emb = embeddings[tgt_idx]
        gradient = predicted_centroid - actual_emb

        # Update: move context embedding downhill
        embeddings[ctx_idx] -= learning_rate * gradient

    # Print progress
    if (epoch + 1) % 100 == 0:
        avg_loss = total_loss / len(pairs)
        print(f"Epoch {epoch+1:3d}: loss = {avg_loss:.4f}")

print("\\nFinal embeddings (first 3 chars):")
for i in range(min(3, vocab_size)):
    print(f"  {idx_to_char[i]}: {embeddings[i][:4]}...")  # Show first 4 dims

# Check clustering: chars with similar P(next|c) should be close
print("\\nEmbedding distances (cosine similarity):")
def cosine_sim(a, b):
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

# 't' and 'h' both often precede 'e' - should be similar
t_idx = char_to_idx['t']
h_idx = char_to_idx['h']
a_idx = char_to_idx['a']
print(f"  cos(t, h) = {cosine_sim(embeddings[t_idx], embeddings[h_idx]):.3f}  (both often precede 'e')")
print(f"  cos(t, a) = {cosine_sim(embeddings[t_idx], embeddings[a_idx]):.3f}  (different contexts)")`}</CodeBlock>
            </CodeChallenge.Answer>
            <Paragraph>
              The satisfying part isn't the number going down. It's what the number forces the vectors to do: contexts that "want" similar next characters get pulled toward similar places.
            </Paragraph>
            <Paragraph>Try a few perturbations:</Paragraph>
            <ul>
              <li>Change the corpus to "abcabc" repeated. Do 'a', 'b', 'c' cluster?</li>
              <li>Increase <Term>d_model</Term> to 16. Does loss drop faster?</li>
              <li>Add a print statement inside the loop to see individual gradients. Often they point toward similar targets for similar contexts.</li>
            </ul>
          </CodeChallenge.Solution>
        </CodeChallenge>

        <Paragraph>
          Loss is a scoreboard. The promise we made was about the map.
        </Paragraph>

        <CodeChallenge phase="2.13.3" title="Bonus: Verify Your Gradient Numerically">
          <CodeChallenge.Prompt>
            <Paragraph>
              You derived the gradient. You typed it. Now <strong>prove it's correct</strong> by comparing to numerical approximation using finite differences.
            </Paragraph>
            <Paragraph>
              For a single training step, compute the gradient two ways:
            </Paragraph>
            <ol>
              <li><strong>Analytical</strong>: Using your formula <Term>predicted_centroid − actual_embedding</Term></li>
              <li><strong>Numerical</strong>: Perturb each dimension by ±ε, measure how loss changes</li>
            </ol>
            <Paragraph>
              If they match (within ~1e-5), your gradient is correct. If not, you have a bug.
            </Paragraph>
          </CodeChallenge.Prompt>
          <CodeChallenge.Solution>
            <CodeChallenge.Answer>
              <CodeBlock>{`# Pick a single training example
context_char, target_char = pairs[0]
ctx_idx = char_to_idx[context_char]
tgt_idx = char_to_idx[target_char]

# 1. Compute analytical gradient (your formula)
context_emb = embeddings[ctx_idx]
scores = embeddings @ context_emb
probs = softmax(scores)
predicted_centroid = embeddings.T @ probs
actual_emb = embeddings[tgt_idx]
analytical_grad = predicted_centroid - actual_emb

# 2. Compute numerical gradient (finite differences)
epsilon = 1e-5
numerical_grad = np.zeros_like(analytical_grad)

for i in range(len(numerical_grad)):
    # Perturb +epsilon
    embeddings[ctx_idx, i] += epsilon
    scores_plus = embeddings @ embeddings[ctx_idx]
    probs_plus = softmax(scores_plus)
    loss_plus = cross_entropy(probs_plus, tgt_idx)

    # Perturb -epsilon
    embeddings[ctx_idx, i] -= 2 * epsilon
    scores_minus = embeddings @ embeddings[ctx_idx]
    probs_minus = softmax(scores_minus)
    loss_minus = cross_entropy(probs_minus, tgt_idx)

    # Restore original value
    embeddings[ctx_idx, i] += epsilon

    # Finite difference: (f(x+ε) - f(x-ε)) / 2ε
    numerical_grad[i] = (loss_plus - loss_minus) / (2 * epsilon)

# 3. Compare
print("Analytical gradient:", analytical_grad)
print("Numerical gradient: ", numerical_grad)
print("Max difference:     ", np.abs(analytical_grad - numerical_grad).max())
print("\\nGradient check:", "PASS ✓" if np.abs(analytical_grad - numerical_grad).max() < 1e-5 else "FAIL ✗")`}</CodeBlock>
            </CodeChallenge.Answer>
            <Paragraph>
              <strong>Expected output</strong>: Max difference should be around 1e-7 to 1e-9. If it's larger than 1e-5, check your gradient formula or finite difference implementation.
            </Paragraph>
            <Paragraph>
              <strong>Why this matters</strong>: Karpathy calls this "the most important debugging tool in deep learning." You can derive gradients on paper, but numerical verification catches algebra errors, implementation bugs, and indexing mistakes. If the check fails, <em>don't trust your gradient</em> — even if the loss appears to decrease.
            </Paragraph>
          </CodeChallenge.Solution>
        </CodeChallenge>

        <Paragraph>
          Training is the loop: initialize random coordinates, compute gradients, nudge embeddings downhill, repeat. Bigger models add more machinery, but the core loop — predict, score, update — stays the same.
        </Paragraph>
      </Section>

      <Section number="2.14" title="What Training Discovers">
        <Paragraph>
          And this brings us back to the schoolteacher from Stettin.
        </Paragraph>

        <Callout variant="info" title="How Grassmann's Work Was Received">
          <Paragraph>
            <Highlight>1844</Highlight>: Grassmann publishes the <em>Ausdehnungslehre</em> while teaching high school. Möbius — one
            of the few people who might have understood it — <em>declines to review it</em>. The work <em>doesn't spread</em>.
            <Cite n={1} />
          </Paragraph>

          <Paragraph>
            <Highlight>1846</Highlight>: He submits a related essay and wins a prize. The evaluation calls it "commendably good
            material expressed in a <em>deficient form</em>."<Cite n={1} />
          </Paragraph>

          <Paragraph>
            <Highlight>1862</Highlight>: Eighteen years later, he tries again. It still doesn't catch on. In the foreword he
            says he's <em>"completely confident"</em> the work will eventually matter, even if it must first wait{' '}
            <em>"in the dust of oblivion."</em>
            <Cite n={4} />
          </Paragraph>

          <Paragraph>
            <Highlight>1864</Highlight>: The publisher's records show that roughly <strong>600 copies</strong> were sold as{' '}
            <em>waste paper</em>.<Cite n={5} />
          </Paragraph>

          <Paragraph>
            Over the next century, the ideas become standard tools: vector spaces and related algebra end up as normal math.
            <Cite n={1} />
          </Paragraph>
        </Callout>

        <Paragraph>
          Grassmann's bet was simple: if you can measure relationships between abstract things, you can treat them as coordinates.
        </Paragraph>
        <Paragraph>
          In this chapter we made the measurement concrete (next‑character statistics), and we built a training loop that nudges coordinates until the geometry starts matching the data.
        </Paragraph>

        <Paragraph>
          <strong>This is the payoff.</strong> Watch random noise become structure. Slide the epoch slider and see 27 character vectors — projected to 2D so a human can look — organize themselves into neighborhoods.
        </Paragraph>

        <TrainingDynamicsViz corpus={corpus} />

        <Callout variant="insight" title="What the model discovered (without being told)">
          <Paragraph>
            <strong>Vowels cluster.</strong> The letters <Term>'a'</Term>, <Term>'e'</Term>, <Term>'i'</Term>, <Term>'o'</Term>, <Term>'u'</Term> tend to predict similar next-characters. Nobody labeled them "vowels." The model found this structure because it's useful for prediction.
          </Paragraph>
          <Paragraph>
            <strong>'q' finds 'u'.</strong> If your corpus has English text, <Term>'q'</Term> drifts toward <Term>'u'</Term> — because <Term>'q'</Term> almost always predicts <Term>'u'</Term>. The geometry reflects the statistics.
          </Paragraph>
          <Paragraph>
            <strong>Space separates.</strong> The space character often peels off from the letter cluster — its prediction pattern (start of a new word) is different from mid-word characters.
          </Paragraph>
        </Callout>

        <Paragraph>
          This is the surprising part of embeddings: <strong>structure emerges from prediction alone.</strong> We never told the model about vowels, consonants, or word boundaries. We only asked it to predict the next character. But prediction requires positioning — to predict similar things, you need to be in a similar place. The geometry is a side effect of doing the job well.
        </Paragraph>

        <Callout variant="insight" title="Grassmann's Algebra in Motion">
          <Paragraph>
            1844. A high school teacher in Stettin writes down rules for moving through
            spaces that don't exist yet. Add directions. Scale magnitudes. Flow through
            a space of pure extension — no physical coordinates, just quantities that
            can be combined and stretched.
          </Paragraph>
          <Paragraph>
            He called it <em>Ausdehnungslehre</em>. His colleagues thought it was
            unreadable. The publisher sold most copies as scrap paper.
          </Paragraph>
          <Paragraph>
            180 years later, you're watching it happen. Each gradient is a direction.
            Each learning rate is a scale. And the embedding vectors — those coordinates
            for characters — drift, cluster, separate. Not in physical space. In the
            space of "what tends to follow what."
          </Paragraph>
          <Paragraph>
            Grassmann couldn't have imagined this screen. But the algebra doesn't care
            what century it's in. <Highlight>Noise becomes neighborhoods. The structure
            was always in the flow.</Highlight>
          </Paragraph>
        </Callout>

        <Paragraph>
          <strong>Now make it speak.</strong> Slide the epoch to train, then click "Generate." Watch characters appear one at a time — each sampled from the probability distribution the model learned. Early epochs produce gibberish. Later epochs start producing fragments that look like language. That's what you just witnessed: noise became neighborhoods, and neighborhoods became language.
        </Paragraph>

        <Paragraph>
          We've built the map, we've watched it move, and we've made it generate. Next we widen the context window and let the model combine multiple token vectors before it predicts the next one.
        </Paragraph>

        <Paragraph>
          <strong>Grassmann proved that relationships can be coordinates.</strong> We've shown how to find those coordinates from data.
        </Paragraph>
        <Paragraph>
          The embedding table starts as noise. Training is what gives it structure.
        </Paragraph>
        <Paragraph>
          One sentence summary: we replace "store a table for every context" with "store one reusable vector per token," then learn those vectors by pushing down a single score.
        </Paragraph>
      </Section>

      <Section number="2.15" title="Exercises">
        <Paragraph>
          These exercises are where you make the chapter concrete. The goal isn’t to be clever — it’s to get comfortable with the exact
          objects the model manipulates.
        </Paragraph>
        <Paragraph>
          Chapter 2’s pipeline is: IDs → vectors → scores → probabilities → loss. The exercises ask you to do each step once, slowly, so the
          code later feels inevitable instead of mysterious.
        </Paragraph>
        <ul>
          <li><strong>Embedding lookup:</strong> row selection (<Term>E[ix]</Term>) from token IDs</li>
          <li><strong>Dot product:</strong> turn two vectors into a similarity score</li>
          <li><strong>Softmax:</strong> turn scores into a probability distribution</li>
          <li><strong>Cross‑entropy:</strong> measure “how surprised were we by the truth?”</li>
          <li><strong>Training step:</strong> nudge the numbers so the truth gets higher probability next time</li>
        </ul>
        <Paragraph>
          We’ll lean on this in Chapter 3 when we widen the context window and let the model combine multiple token vectors before it predicts
          the next one.
        </Paragraph>

        <Exercise
          number="2.1"
          title="The 'q' Test"
          hint={<Paragraph>Think in contexts: what usually comes right after <Term>'q'</Term>?</Paragraph>}
          solution={<Paragraph>A trained embedding for <Term>'q'</Term> becomes unusual because its context statistics are unusual.</Paragraph>}
        >
          <Paragraph>
            In ordinary English, <Term>'q'</Term> is rare and strongly constrained (it doesn't behave like most consonants).
            Why would that pressure its embedding to look different from, say, <Term>'t'</Term>?
          </Paragraph>
        </Exercise>

        <Exercise
          number="2.2"
          title="Manual Dot Product"
          solution={
            <>
              <Paragraph>a = [0.9, 0.1]</Paragraph>
              <Paragraph>b = [0.1, 0.8]</Paragraph>
              <Paragraph>
                Dot = (0.9×0.1) + (0.1×0.8) = 0.09 + 0.08 = <strong>0.17</strong>
              </Paragraph>
              <Paragraph>Low score → not very aligned.</Paragraph>
            </>
          }
        >
          <Paragraph>
            Compute the dot product of <code>[0.9, 0.1]</code> and <code>[0.1, 0.8]</code>. Is it high or low?
          </Paragraph>
        </Exercise>

        <Exercise
          number="2.3"
          title="Tensor Shapes"
          hint={<Paragraph>After embedding lookup, you add a feature dimension.</Paragraph>}
          solution={
            <>
              <Paragraph>
                If <Term>batch_size = 32</Term>, <Term>context_length = 8</Term>, <Term>embed_dim = 128</Term>:
              </Paragraph>
              <Paragraph>
                IDs have shape <Term>[32, 8]</Term>. After embedding lookup, you get <Term>[32, 8, 128]</Term>.
              </Paragraph>
            </>
          }
        >
          <Paragraph>
            If your token ID tensor has shape <Term>[32, 8]</Term> (batch size 32, context length 8), and your embedding
            dimension is <Term>128</Term>, what is the shape after embedding?
          </Paragraph>
        </Exercise>

        <Exercise
          number="2.4"
          title="The 1/V Baseline"
          hint={
            <Paragraph>
              If <Term>p</Term> is uniform over <Term>V</Term> outcomes, then every entry is <Term>1/V</Term>. Write out{' '}
              <Term>p · p</Term> as a sum.
            </Paragraph>
          }
          solution={
            <>
              <Paragraph>
                If <Term>p</Term> is uniform, every entry is:
              </Paragraph>
              <MathBlock equation={String.raw`p_i = \frac{1}{V}`} />
              <MathBlock
                equation={String.raw`\begin{aligned}
p \cdot p &= \sum_i p_i^2 \\
&= \sum_i (1/V)^2 \\
&= V \cdot (1/V^2) \\
&= 1/V
\end{aligned}`}
              />
              <Paragraph>
                For <Term>V = 27</Term>, the baseline is <MathInline equation={String.raw`\frac{1}{27} \approx 0.037`} />.
              </Paragraph>
            </>
          }
        >
          <Paragraph>
            In the dot product demo, why does "uniform-ish" behavior land around <Term>1/V</Term>? Derive the baseline for
            a uniform distribution, then compute it for <Term>V = 27</Term>.
          </Paragraph>
        </Exercise>

        <Exercise
          number="2.5"
          title="Corpus Surgery (Use the Lab)"
          hint={
            <Paragraph>
              Use the corpus preset pills in the cluster demo. Pick <Term>A</Term> and <Term>B</Term> in the plot, then
              read the "Top next" chips and the contribution bars.
            </Paragraph>
          }
          solution={
            <>
              <Paragraph>
                You should see two effects:
              </Paragraph>
              <ul>
                <li>
                  If a character barely appears in the corpus, smoothing makes its <Term>P(next | c)</Term> close to
                  uniform — so its dot products sit near the <Term>1/V</Term> baseline.
                </li>
                <li>
                  If you make a pattern common (like <Term>'qu'</Term> in the "qu-heavy" preset), <Term>'q'</Term> gets a sharp
                  next-character spike, and both the cluster plot and the dot product reflect that. The contribution list
                  will usually show <Term>'u'</Term> doing a lot of the work for <Term>dot('q', 'u')</Term>.
                </li>
              </ul>
              <Paragraph>
                The point isn't that one number is "correct" forever. It's that the geometry is trying to summarize the
                statistics your corpus actually contains.
              </Paragraph>
            </>
          }
        >
          <Paragraph>
            Switch between at least two corpus presets (for example "tiny demo" and "qu-heavy"). For each corpus:
          </Paragraph>
          <ol>
            <li>Pick <Term>A = 'q'</Term> and <Term>B = 'u'</Term>. What happens to the dot product?</li>
            <li>Pick <Term>A = 'a'</Term> and <Term>B = 'e'</Term>. Does it stay high, drop, or depend?</li>
            <li>Explain your observations using the "Top next" chips and the contribution list.</li>
          </ol>
        </Exercise>

        <Exercise
          number="2.6"
          title="Predict, Then Measure"
          hint={
            <>
              <Paragraph>
                The cluster plot and the similarity panel in <SectionLink to="2.3">Section 2.3</SectionLink> are built from <Term>P(next | c)</Term>.
              </Paragraph>
              <Paragraph>
                Try pasting a tiny synthetic corpus like:
              </Paragraph>
              <CodeBlock lang="text">{`ac bc ac bc ac bc ac bc`}</CodeBlock>
              <Paragraph>
                Then set <Term>A = 'a'</Term> and <Term>B = 'b'</Term>.
              </Paragraph>
            </>
          }
          solution={
            <>
              <Paragraph>
                Before you measure anything, your prediction should be: "<Term>'a'</Term> and <Term>'b'</Term> will look very
                similar."
              </Paragraph>
              <Paragraph>
                Why? In that corpus, <Term>'a'</Term> is almost always followed by <Term>'c'</Term>, and <Term>'b'</Term> is also almost always followed by <Term>'c'</Term>. So their next-character distributions overlap heavily.
              </Paragraph>
              <Paragraph>
                That makes both cosine similarity (in the <SectionLink to="2.3">Section 2.3</SectionLink> panel) and the dot product (in <SectionLink to="2.6">Section 2.6</SectionLink>) jump up.
                With smoothing on, it won't hit a perfect 1.000, but it should be obviously higher than "random-ish."
              </Paragraph>
              <Paragraph>
                This is the core idea: the geometry is trying to summarize behavior. If you rewrite the behavior in the
                corpus, the geometry should follow.
              </Paragraph>
            </>
          }
        >
          <Paragraph>
            Use the corpus editor in <SectionLink to="2.3">Section 2.3</SectionLink> to <em>force</em> two different characters to behave the same way. Before
            you look at any numbers, predict whether <Term>dot(a, b)</Term> will go up or down — then check.
          </Paragraph>
        </Exercise>

        <Exercise
          number="2.7"
          title="The Context Explosion (Use the Slider)"
          hint={
            <>
              <Paragraph>
                The lookup table is storing a full <Term>P(next | context)</Term> for every possible context. That's why it
                has a <Term>V<sup>T+1</sup></Term> term.
              </Paragraph>
              <Paragraph>
                Try the presets in the demo, then change only <Term>T</Term> and watch the <Term>≈ 10<sup>x</sup>×</Term> bigger number.
              </Paragraph>
            </>
          }
          solution={
            <>
              <Paragraph>
                You should notice two things:
              </Paragraph>
              <ul>
                <li>
                  Increasing <Term>T</Term> by 1 multiplies the lookup table by about <Term>V</Term>.
                </li>
                <li>
                  The embedding table doesn't care about <Term>T</Term>. Its size is basically <Term>V·D</Term>.
                </li>
              </ul>
              <Paragraph>
                That difference in growth rate is the motivation for reuse: we can't afford "one distribution per
                context."
              </Paragraph>
            </>
          }
        >
          <Paragraph>
            In the Context Explosion demo (<SectionLink to="2.2">Section 2.2</SectionLink>), pick one preset and then increase <Term>T</Term> by 2. What
            happens to the lookup-table size? What happens to the embedding-table size?
          </Paragraph>
        </Exercise>

        <Exercise
          number="2.8"
          title="The Integer Distance Lie"
          hint={<Paragraph>Look at the vocabulary: <Term>stoi = {'{'}' ': 0, 'a': 1, 'b': 2, ..., 'q': 17, ..., 'u': 21, ...{'}'}</Term></Paragraph>}
          solution={
            <>
              <Paragraph>
                <strong><Term>'q'</Term> and <Term>'u'</Term>:</strong> <Term>|17 - 21| = 4</Term>. But they should be <em>extremely</em> close — <Term>'q'</Term> is almost always followed by <Term>'u'</Term>.
              </Paragraph>
              <Paragraph>
                <strong><Term>'a'</Term> and <Term>'b'</Term>:</strong> <Term>|1 - 2| = 1</Term>. Looks close! But they have completely different roles in English.
              </Paragraph>
              <Paragraph>
                <strong>Conclusion:</strong> Integer distance tells you nothing about linguistic similarity. The ordering is arbitrary (alphabetical), and "close" integers can have completely different predictive roles.
              </Paragraph>
            </>
          }
        >
          <Paragraph>
            Suppose we assign IDs alphabetically (<Term>␣=0</Term>, <Term>a=1</Term>, ..., <Term>z=26</Term>), so <Term>stoi['q'] = 17</Term> and <Term>stoi['u'] = 21</Term>:
          </Paragraph>
          <ol>
            <li>What is the integer distance between <Term>'q'</Term> and <Term>'u'</Term>?</li>
            <li>What is the integer distance between <Term>'a'</Term> (=1) and <Term>'b'</Term> (=2)?</li>
            <li>Which pair should be <em>closer</em> in a useful representation? Does integer distance get this right?</li>
          </ol>
        </Exercise>

        <Exercise
          number="2.9"
          title="Grassmann's Principle"
          hint={<Paragraph>Think about what "linear mixing" means: <Term>A + B</Term> should behave like a weighted combination.</Paragraph>}
          solution={
            <>
              <Paragraph>
                <strong>1.</strong> <Term>0.5·Red + 0.5·Blue = [0.5, 0, 0.5]</Term> — this is purple/magenta.
              </Paragraph>
              <Paragraph>
                <strong>2.</strong> Yes, mixing is commutative: <Term>Red + Blue = Blue + Red</Term>. Order doesn't matter.
              </Paragraph>
              <Paragraph>
                <strong>3.</strong> Yes, mixing is associative: <Term>(R + G) + B = R + (G + B)</Term>.
              </Paragraph>
              <Paragraph>
                <strong>Why it matters:</strong> These properties define a <em>vector space</em>. Once you have a vector space,
                you can measure distances (similarity), find nearest neighbors, and — crucially — you can <em>learn</em> by
                gradually nudging coordinates based on prediction error. Grassmann showed that abstract objects (colors,
                sounds, words) can live in vector spaces if their mixing obeys these rules.
              </Paragraph>
            </>
          }
        >
          <Paragraph>
            RGB colors can be treated as vectors: <Term>Red = [1, 0, 0]</Term>, <Term>Green = [0, 1, 0]</Term>, <Term>Blue = [0, 0, 1]</Term>.
          </Paragraph>
          <ol>
            <li>What color is <Term>0.5·Red + 0.5·Blue</Term>? Write the vector.</li>
            <li>Is color mixing commutative? (<Term>Red + Blue = Blue + Red</Term>?)</li>
            <li>Is color mixing associative? (<Term>(R + G) + B = R + (G + B)</Term>?)</li>
            <li>Why do these properties matter for treating words as vectors?</li>
          </ol>
        </Exercise>

        <Exercise
          number="2.10"
          title="The Compression Ratio"
          hint={
            <>
              <Paragraph>Lookup table: one row per context. <Term>(vocab_size)<sup>T</sup></Term> contexts, each storing <Term>vocab_size</Term> probabilities.</Paragraph>
              <Paragraph>Embedding table: one row per token. <Term>vocab_size</Term> tokens, each with <Term>D</Term> dimensions.</Paragraph>
            </>
          }
          solution={
            <>
              <Paragraph>
                <strong>Full lookup table:</strong> <Term>27<sup>4</sup> × 27 = 531,441 × 27 ≈ 14.3 million</Term> numbers.
              </Paragraph>
              <Paragraph>
                <strong>Embedding table:</strong> <Term>27 × 64 = 1,728</Term> numbers.
              </Paragraph>
              <Paragraph>
                <strong>Compression ratio:</strong> <Term>14.3M / 1,728 ≈ 8,300×</Term> smaller.
              </Paragraph>
              <Paragraph>
                <strong>What gets lost:</strong> The embedding table can't represent every possible context-specific distribution. It captures <em>general patterns</em> about how characters behave, but some fine-grained context-specific information is compressed away. Training finds the best approximation given the capacity.
              </Paragraph>
            </>
          }
        >
          <Paragraph>
            For <Term>vocab_size = 27</Term>, <Term>context_length = 4</Term>, <Term>embed_dim = 64</Term>:
          </Paragraph>
          <ol>
            <li>How many numbers would a full <Term>P(next | context)</Term> lookup table need? (Hint: <Term>(vocab_size)<sup>T</sup></Term> contexts, each with <Term>vocab_size</Term> outcomes)</li>
            <li>How many numbers does the embedding table <Term>E</Term> have?</li>
            <li>What's the compression ratio?</li>
            <li>What information gets "lost" in the compression?</li>
          </ol>
        </Exercise>

        <Exercise
          number="2.11"
          title="Dot Product Properties"
          hint={<Paragraph>Write out the definition <Term>a · b = Σ_i a_i b_i</Term> and verify each property algebraically.</Paragraph>}
          solution={
            <>
              <Paragraph>
                <strong>1. Non-negative self-similarity:</strong> <Term>a · a = Σ_i a_i² ≥ 0</Term> because squares are non-negative.
              </Paragraph>
              <Paragraph>
                <strong>2. Symmetry:</strong> <Term>a · b = Σ_i a_i b_i = Σ_i b_i a_i = b · a</Term> because multiplication is commutative.
              </Paragraph>
              <Paragraph>
                <strong>3. Linearity:</strong> <Term>a · (b + c) = Σ_i a_i(b_i + c_i) = Σ_i a_i b_i + Σ_i a_i c_i = a·b + a·c</Term>
              </Paragraph>
              <Paragraph>
                <strong>4. Scaling:</strong> <Term>(k·a) · b = Σ_i (k·a_i) b_i = k Σ_i a_i b_i = k(a · b)</Term>
              </Paragraph>
              <Paragraph>
                These are the axioms that make dot product "the right" similarity metric for vector spaces. They're what make
                similarity behave predictably when you start nudging coordinates during training.
              </Paragraph>
            </>
          }
        >
          <Paragraph>
            Prove each property of the dot product:
          </Paragraph>
          <ol>
            <li><Term>a · a ≥ 0</Term> for any vector <Term>a</Term></li>
            <li><Term>a · b = b · a</Term> (symmetry)</li>
            <li><Term>a · (b + c) = a · b + a · c</Term> (linearity)</li>
            <li><Term>(k · a) · b = k · (a · b)</Term> (scaling)</li>
          </ol>
        </Exercise>
      </Section>

      <Section number="2.16" title="References">
        <Citations
          title="Academic references"
          items={[
            {
              n: 6,
              href: 'https://arxiv.org/abs/1301.3781',
              label: 'Mikolov, T., Chen, K., Corrado, G., & Dean, J. (2013). Efficient estimation of word representations in vector space. arXiv preprint arXiv:1301.3781.',
            },
            {
              n: 7,
              href: 'https://plato.stanford.edu/entries/statphys-statmech/',
              label: 'Stanford Encyclopedia of Philosophy — Statistical mechanics (Boltzmann distribution, partition function, temperature).',
            },
            {
              n: 8,
              href: 'https://www.britannica.com/biography/Ludwig-Boltzmann',
              label: 'Encyclopaedia Britannica — Ludwig Boltzmann (biography + statistical mechanics context).',
            },
            {
              n: 9,
              href: 'https://plato.stanford.edu/entries/ernst-mach/',
              label: 'Stanford Encyclopedia of Philosophy — Ernst Mach (positivism; skepticism about atoms).',
            },
            {
              n: 10,
              href: 'https://www2.math.uconn.edu/~gordina/Einstein_Brownian1905.pdf',
              label: 'Einstein (1905) — Brownian motion paper (PDF translation).',
            },
            {
              n: 11,
              href: 'https://wwwusers.ts.infn.it/~milotti/Didattica/Bayes/pdfs/Jaynes_1957a.pdf',
              label: 'Jaynes, E. T. (1957). Information theory and statistical mechanics. Physical Review. (PDF).',
            },
            {
              n: 12,
              href: 'https://people.math.harvard.edu/~ctm/home/text/others/shannon/entropy/entropy.pdf',
              label: 'Shannon, C. E. (1948). A Mathematical Theory of Communication. Bell System Technical Journal. (PDF).',
            },
            {
              n: 13,
              href: 'https://web.stanford.edu/~cover/it.html',
              label: 'Cover, T. M., & Thomas, J. A. Elements of Information Theory (cross-entropy, entropy, perplexity connections).',
            },
            {
              n: 14,
              href: 'https://www.deeplearningbook.org/',
              label: 'Goodfellow, I., Bengio, Y., & Courville, A. (2016). Deep Learning (softmax, cross-entropy, and gradients).',
            },
          ]}
        />
      </Section>

      <ChapterNav
        prev={{ href: '/', label: 'Chapter 1: The Meat Grinder' }}
        next={{ href: '/chapter-03', label: 'Chapter 3: The Engine Room' }}
      />
    </Container>
  )
}
