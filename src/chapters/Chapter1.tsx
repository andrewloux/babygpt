import {
  Container,
  ChapterHeader,
  Section,
  Paragraph,
  Highlight,
  Term,
  Callout,
  Cite,
  Citations,
  MathBlock,
  NgramExamples,
  SparsityViz,
  defaultSparsityData,
  SparsityDemo,
  CorridorDemo,
  CorpusDisplay,
  WorkedExample,
  WorkedStep,
  WorkedNote,
  FrequencyTable,
  ContextTrace,
  CodeBlock,
  CodeWalkthrough,
  Step,
  CodeChallenge,
  TokenizerDemo,
  TrainingExamples,
  SlidingWindowDemo,
  Invariants,
  InvariantItem,
  Exercise,
  ChapterNav,
  ProbabilityExample,
  ExplosionDemo,
  MarkovChainViz,
  SparseMarkovViz,
  DecoderDemo,
  KenLMDemo,
  PointerVsFlat,
} from '../components'

export function Chapter1() {
  return (
    <Container>
      <ChapterHeader
        number="01"
        title="The Meat Grinder"
        subtitle="Raw text walks in wearing poetry and vibes. Our model only eats integers. This is where we build the digestive tract."
      />

      {/* Section 1.1 */}
      <Section number="1.1" title="The Physics of the Problem">
        <Paragraph>
          We're building a machine that <Highlight>predicts the future</Highlight>. Not stock prices, not the weather—just the next character in a sequence. Sounds modest, but this is the entire job description of GPT-4, Claude, and every other language model.
        </Paragraph>
        <Paragraph>
          But before we write a single line of code, we need to understand <em>what we're even trying to do</em> mathematically. Because if you don't understand the goal, you're just typing with extra steps.
        </Paragraph>
        <Paragraph>
          We're going to derive the entire training objective from scratch. No hand-waving, no "just trust me"—just following the logic until it clicks.
        </Paragraph>
        <Paragraph>
          In 1948, Claude Shannon asked a very simple question: <strong>how predictable is English?</strong> His answer was operational: build a predictor, make next‑character bets, and score how much probability it assigned to what actually happened.
        </Paragraph>
      </Section>

      {/* Section 1.1.1 */}
      <Section number="1.1.1" title="What Even Is Probability">
        <Paragraph>
          One useful intuition: probability controls <Highlight>surprise</Highlight>.
        </Paragraph>
        <Paragraph>
          If I tell you "the next word is 'the'"—you're not surprised. <Term>'the'</Term> shows up constantly. High probability, low surprise.
        </Paragraph>
        <Paragraph>
          If I tell you "the next word is 'defenestration'"—you're very surprised. That word barely exists outside of "thrown out a window" trivia. Low probability, high surprise.
        </Paragraph>
        <Paragraph>
          I'll use <em>words</em> for intuition in a few places because they're easier to read. When we implement this, we'll work with <em>characters</em> so the vocabulary stays tiny and nothing is hidden. Same math, smaller Lego bricks.
        </Paragraph>
        <Paragraph>
          We'll make this precise in a second. For now, keep the direction straight: <strong>high probability → low surprise</strong>, and <strong>low probability → high surprise</strong>.
        </Paragraph>
        <MathBlock
          equation={String.raw`\text{surprise}(p) = -\log_2(p)`}
          explanation="In bits: p=0.5 → 1 bit. p=0.25 → 2 bits. Smaller p means more surprise."
        />
        <MathBlock
          equation="P(\text{event}) \in [0, 1]"
          explanation="Probability lives between 0 (impossible, you'd have a heart attack) and 1 (certain, you'd be bored)."
        />
        <Paragraph>
          Here's the thing that makes probability actually useful: if you list out <em>every possible thing that could happen</em>, those probabilities <Highlight>must add up to exactly 1</Highlight>.
        </Paragraph>
        <Paragraph>
          Why? Because <em>something</em> has to happen. The universe doesn't allow "50% chance of heads, 50% chance of tails, and also 30% chance the coin vanishes into the shadow realm." That's 130%. Reality doesn't work like that.
        </Paragraph>
        <Paragraph>
          Let's make this concrete. Say you're predicting the next character after "<Term>hel</Term>" and your vocabulary is just 5 characters: <Term>[a, l, o, p, z]</Term>. Your model needs to output 5 numbers:
        </Paragraph>
        <Paragraph>
          <em>This is the shape of every model output: probabilities over the vocabulary, summing to 1. The tallest bar is the model’s best bet.</em>
        </Paragraph>
        <ProbabilityExample
          rows={[
            { char: 'a', prob: 0.05 },
            { char: 'l', prob: 0.40, highlight: true },
            { char: 'o', prob: 0.15 },
            { char: 'p', prob: 0.35, highlight: true },
            { char: 'z', prob: 0.05 },
          ]}
          sum={'Σ = 0.05 + 0.40 + 0.15 + 0.35 + 0.05 = <span class="highlight">1.00</span>'}
        />
        <Paragraph>
          The model is betting 40% on <Term>l</Term> (hello), 35% on <Term>p</Term> (help), and leaving scraps for the rest. These five numbers form a <Term>probability distribution</Term>—a complete accounting of all possibilities that sums to 1.
        </Paragraph>
        <Callout variant="insight" title="The Core Insight">
          <p>
            A language model is just a function that takes some context and outputs a probability distribution over the vocabulary. All the complexity you'll see later—all the matrix multiplications and nonlinearities and clever tricks—exists solely to make this function produce good distributions.
          </p>
          <p>
            Context in → probability distribution out. Everything else is implementation details.
          </p>
        </Callout>
      </Section>

      {/* Section 1.1.2 */}
      <Section number="1.1.2" title="The Problem With Sequences">
        <Paragraph>
          Cool, so we understand single-token probability. But text isn't one token. It's a <em>sequence</em> of tokens. The word "cat" is three events happening in order: <Term>c</Term>, then <Term>a</Term>, then <Term>t</Term>.
        </Paragraph>
        <Paragraph>
          So here's the question: what's the probability of this <em>entire sequence</em> happening?
        </Paragraph>
        <Paragraph>
          Mathematicians call this the <Highlight>joint probability</Highlight>:
        </Paragraph>
        <MathBlock
          equation="P(x_1, x_2, x_3, \ldots, x_t)"
          explanation={`"What's the probability of seeing x₁ AND x₂ AND x₃... all in that exact order?"`}
        />
        <Paragraph>
          For "cat":
        </Paragraph>
        <MathBlock
          equation={`P("cat") = P(c, a, t) = ???`}
          explanation={`Some number between 0 and 1 representing "how likely is this sequence in English?"`}
        />
        <Paragraph>
          Now here's the problem. How do we actually <em>compute</em> this number?
        </Paragraph>
        <Paragraph>
          The naive approach: just memorize every possible sequence and its probability.
        </Paragraph>
        <Paragraph>
          The naive approach is <Highlight>brute force memorization</Highlight>. You treat every specific sequence (like "the cat sat") as a unique, atomic event. You don't learn that "cat" follows "the". You just memorize "the-cat-sat" as one giant, unbreakable block.
        </Paragraph>
        <MathBlock
          equation="P(x_{1:T}) = \frac{C(x_{1:T})}{N}"
          explanation={`P(sequence) = Count of that exact sequence ÷ Total sequences observed`}
        />
        <Paragraph>
          Try it yourself. Here's a tiny corpus—search for sequences and see what happens:
        </Paragraph>
        <Paragraph>
          <em>Try a tiny variation of something you know exists and watch the lookup table forget English exists.</em>
        </Paragraph>
        <SparsityDemo />

        <Paragraph>
          See the problem? "the dog" returns P=0 even though both "the" and "dog" appear separately. To a counting model, "the cat" and "the dog" are completely unrelated keys. It doesn't know they're similar—it just checks: "Have I seen this exact sequence before?"
        </Paragraph>

        <Section number="1.1.3" title="Why This Happens">
          <Paragraph>
            The reason your corpus can never cover enough sequences is pure combinatorics. The space of possible sequences <Highlight>explodes exponentially</Highlight> with length:
          </Paragraph>
          <Paragraph>
            <em>Drag the slider and feel the combinatorics tax: a small increase in length multiplies the space astronomically.</em>
          </Paragraph>
          <ExplosionDemo />

          <Paragraph>
            Slide that to N=10 and watch what happens. With just 27 characters, you get 205 trillion possible 10-character sequences. Your training corpus—no matter how large—is a speck. Most valid English sequences will never appear in your data, so counting assigns them P=0.
          </Paragraph>

          <Callout variant="warning" title="Why Lookup Tables Don't Scale">
            <Paragraph>
              Where does this huge number come from? It's the number of options multiplied across each position:
            </Paragraph>
            <MathBlock
              equation="\underbrace{27}_{\text{char 1}} \times \underbrace{27}_{\text{char 2}} \times \dots \times \underbrace{27}_{\text{char 100}} = 27^{100}"
              explanation="For a paragraph of 100 characters, you have 27 choices at every single step."
            />
            <Paragraph>
              The problem isn't just size—it's that lookup tables treat every context as an independent key. "the cat sat"
              and "the dog sat" share a common structure, but in a word-level table they're unrelated entries. Learning
              one doesn't help the other.
            </Paragraph>
            <Paragraph>
              Character-level models help somewhat—"cat" and "can" share "ca", so counts transfer through literal overlap.
              But that's not meaning, it's spelling. "cat" and "dog" share almost none, so a counting model can't "feel"
              that they're related. You need a model that learns <Term>shared structure</Term>—that's what Chapter 2 builds.
            </Paragraph>
          </Callout>

          <Paragraph>
            The counting approach is just a giant lookup table:
          </Paragraph>
          <CodeBlock filename="lookup_table.json">{`{
  "the cat sat": 1,
  "the dog sat": 1,
  "the cat ate": 1
}`}</CodeBlock>
          <Paragraph>
            To this naive model, "cat" and "dog" are just symbols. <code>"the cat sat"</code> and <code>"the dog sat"</code>{' '}
            are different keys. Learning one doesn't automatically change the other, because the model has no way to share
            information between keys. It's a phone book: entries don't talk to each other.
          </Paragraph>
        </Section>

        <Paragraph>
          The solution? <Highlight>Decomposition</Highlight>—break the joint probability into smaller, learnable pieces.</Paragraph>
        <Paragraph>
          These smaller pieces rely on the <Term>Markov Assumption</Term>: the idea that the probability of the next character depends only on a small window of recent history, not the entire history of the universe.
        </Paragraph>
        <Paragraph>
          We call these pieces <Term>n-grams</Term>. An n-gram is just a chunk of n consecutive characters:
        </Paragraph>
        <NgramExamples />
        <Paragraph>
          An <Term>n-gram model</Term> is what happens when you pick a specific <Term>n</Term> and commit. If <Term>n=3</Term>{' '}
          (a trigram model), you predict the next character using only the last <Term>2</Term> characters. If <Term>n=2</Term>{' '}
          (a bigram model), you only look at the last <Term>1</Term>.
        </Paragraph>
        <MathBlock
          equation={`P(x_t \\,|\\, x_{1:t-1}) \\approx P(x_t \\,|\\, x_{t-n+1:t-1})`}
          explanation={`The "≈" is doing the work: pretend only the last n−1 tokens matter.`}
        />
        <Paragraph>
          And where do those conditional probabilities come from? In an n-gram model, they come straight from counts:
          “when I saw this context, what tended to come next?”
        </Paragraph>
        <MathBlock
          equation={`P(t \\,|\\, ca) = \\frac{C(\\text{cat})}{C(\\text{ca})}`}
          explanation={`Count how often "ca" is followed by "t", divided by how often "ca" appears at all.`}
        />
        <Paragraph>
          Instead of asking "what's the probability of this entire sequence?" (a question the universe refuses to answer), we ask "given this short n-gram context, what character comes next?" That's a question we can actually get data for.
        </Paragraph>
        <Paragraph>
          Why does this help? Because <Highlight>shorter contexts appear far more often</Highlight>. This is crucial—it's the difference between "I've seen this zero times" and "I've seen this thousands of times."
        </Paragraph>
        <Callout variant="info" title="The Sparsity Cure">
          <Paragraph>
            Shorter contexts appear <em>exponentially</em> more often than longer ones. Here's what that looks like in a
            real book-length corpus (Project Gutenberg's <em>Pride and Prejudice</em>, public domain, so we can be
            normal about it).
          </Paragraph>
          <SparsityViz rows={defaultSparsityData} />
          <Paragraph>
            <strong>The insight:</strong> Exact long contexts are rare. Short ones are everywhere. In this corpus,
            <Term>the next morning</Term> shows up only <strong>9</strong> times, but the suffix <Term>ing</Term> shows up{' '}
            <strong>3,960</strong> times. Nothing magical happened—we stopped matching a whole phrase and started counting
            one of the reusable little chunks phrases are built from.
          </Paragraph>
          <Paragraph>
            If you run the same measurement on Harry Potter, the exact numbers will change (different author, different
            style), but the cliff doesn't.
          </Paragraph>
        </Callout>
        <Paragraph>
          So decomposition cures sparsity. But <em>how</em> do we actually factor the joint probability into a product of these shorter pieces? Here's the geometric intuition. Imagine all possible texts as a vast space—every sequence that could ever be written. When you observe the first character is <Term>c</Term>, you've just <Highlight>narrowed the corridor</Highlight>. You're no longer in "all possible texts"—you're in "texts that start with c." A smaller region.
        </Paragraph>
        <Paragraph>
          Now observe the second character is <Term>a</Term>. The corridor narrows again. You're in "texts that start with ca"—an even smaller region. Each character you observe closes doors behind you, constraining where you can be.
        </Paragraph>
        <Paragraph>
          The probability of arriving at a specific sequence is just: <em>what fraction of the original space survives all these narrowings?</em> At step 1, some fraction starts with 'c'. Of those, some fraction continues with 'a'. Of those, some fraction continues with 't'.
        </Paragraph>
        <Paragraph>
          Mathematically, "of those" means <Highlight>multiplication</Highlight>. If 1/4 of paths start with 'c', and 1/2 of <em>those</em> continue with 'a', then 1/2 × 1/4 = 1/8 of all paths start with "ca".
        </Paragraph>
        <Paragraph>
          <em>Step through each token and watch the corridor shrink. The sequence probability is the product of these survival fractions.</em>
        </Paragraph>
        <CorridorDemo />
        <Paragraph>
          This isn't a trick or a formula to memorize. It's just the bookkeeping for "of those, of those, of those." Once
          you see the corridor narrowing, multiplication is what keeps track.
        </Paragraph>
        <Paragraph>
          That decomposition has a name: the <Highlight>chain rule of probability</Highlight>. But before we write it down formally, we need to make one concept precise: what exactly do we mean by "the fraction that continues with 'a', given we're already at 'c'"?
        </Paragraph>
      </Section>

      {/* Section 1.1.3 */}
      <Section number="1.1.4" title="Conditional Probability">
        <Paragraph>
          That phrase—"given we're already at X"—is doing a lot of heavy lifting. It has a precise name: <Highlight>conditional probability</Highlight>.
        </Paragraph>
        <Paragraph>
          Regular probability: "what's the chance of X happening?"
        </Paragraph>
        <Paragraph>
          Conditional probability: "what's the chance of X happening, <em>given that Y already happened</em>?"
        </Paragraph>
        <Paragraph>
          We write it as <Term>P(X | Y)</Term>—"probability of X given Y." That vertical bar is the "given." It's a filter: "only count the universes where Y is true."
        </Paragraph>
        <WorkedExample title="Example: Weather and Umbrellas">
          <WorkedStep n="?">
            <p><strong>P(umbrella)</strong> = probability someone is carrying an umbrella</p>
            <WorkedNote>Maybe 20% of people on any given day. This is an <em>unconditional</em> probability.</WorkedNote>
          </WorkedStep>
          <WorkedStep n="?">
            <p><strong>P(umbrella | raining)</strong> = probability someone has an umbrella, <em>given that it's raining</em></p>
            <WorkedNote>Now it's probably 80%. The condition restricts which scenarios we're counting—we ignore sunny days entirely and only look at rainy days. Within that subset, umbrellas are common.</WorkedNote>
          </WorkedStep>
        </WorkedExample>
        <Paragraph>
          Conditioning <Highlight>shifts the distribution</Highlight>. You're no longer asking "what's likely in general?" but "what's likely in this specific situation?" The probabilities still sum to 1, but the mass moves around based on what you know.
        </Paragraph>
        <Paragraph>
          For language, conditional probability is incredibly intuitive:
        </Paragraph>
        <ul>
          <li><Term>P(e)</Term> = probability of the letter 'e' appearing (about 12% in English)</li>
          <li><Term>P(e | th)</Term> = probability of 'e' appearing after "th" (much higher—think "the", "them", "there")</li>
          <li><Term>P(q | th)</Term> = probability of 'q' appearing after "th" (basically zero)</li>
        </ul>
        <Paragraph>
          The context changes the distribution. Once you see this, the rest of language modeling is just figuring out how to compute these conditional probabilities efficiently.
        </Paragraph>
      </Section>

      {/* Section 1.1.4 */}
      <Section number="1.1.5" title="The Chain Rule">
        <Paragraph>
          Now we can write it down formally. The chain rule connects joint probability (what we want) to conditional probability (what we can actually estimate from data):
        </Paragraph>
        <MathBlock
          equation={`P(A, B) = P(A) \\times P(B \\,|\\, A)`}
          explanation={`"The probability of A and B" = "probability of A" × "probability of B given A already happened"`}
        />
        <Paragraph>
          But wait—why per-token? Why not decompose into pairs, or chunks, or something else entirely? The answer is that this is the <em>only</em> valid decomposition. The chain rule isn't a modeling choice; it's a mathematical identity that holds for any joint probability distribution. You can verify it from the definition of conditional probability: P(B|A) = P(A,B)/P(A), so P(A,B) = P(A) × P(B|A). No approximation, no assumptions—just algebra.
        </Paragraph>
        <Paragraph>
          The per-token structure also matches how we <em>generate</em> text. At inference time, we produce one token, then the next, then the next. We can't condition on future tokens—we don't know them yet. So the only information available when predicting token <Term>t</Term> is tokens 1 through <Term>t-1</Term>. The chain rule's left-to-right structure exactly mirrors this constraint.
        </Paragraph>
        <Paragraph>
          Let's make it concrete. For the sequence "ca" (two characters):
        </Paragraph>
        <MathBlock
          equation={`P(\\text{"ca"}) = P(c) \\times P(a \\,|\\, c)`}
          explanation={`"Probability of 'ca'" = "probability of starting with c" × "probability of 'a' given we already have 'c'"`}
        />
        <Paragraph>
          What about three events? Apply the same logic again. We already have P(c) × P(a|c) for the first two. Now we just multiply by the probability of the third character, given we've already seen the first two:
        </Paragraph>
        <MathBlock
          equation={`P(\\text{"cat"}) = P(c) \\times P(a \\,|\\, c) \\times P(t \\,|\\, ca)`}
          explanation={`Each new character conditions on everything before it.`}
        />
        <Paragraph>
          See the pattern? Each term multiplies in the next character, conditioning on all the characters that came before. The general formula for three events:
        </Paragraph>
        <MathBlock
          equation={`P(A, B, C) = P(A) \\times P(B \\,|\\, A) \\times P(C \\,|\\, A, B)`}
          explanation="Same pattern: each term conditions on everything that came before it."
        />
        <Paragraph>
          For a sequence of <em>any</em> length:
        </Paragraph>
        <MathBlock
          equation={`\\begin{aligned}
P(x_1, x_2, \\ldots, x_t) &= P(x_1) \\\\
&\\times P(x_2 \\,|\\, x_1) \\\\
&\\times P(x_3 \\,|\\, x_1, x_2) \\\\
&\\times P(x_4 \\,|\\, x_1, x_2, x_3) \\\\
&\\;\\;\\vdots \\\\
&\\times P(x_t \\,|\\, x_1, \\ldots, x_{t-1})
\\end{aligned}`}
          explanation="Each term conditions on everything that came before. The context grows by one token at each step."
        />
        <Paragraph>
          For "cat", that's <Term>x₁='c'</Term>, <Term>x₂='a'</Term>, <Term>x₃='t'</Term> (mathematicians count from 1; we programmers will switch to 0 soon). The formula becomes <Term>P(c) × P(a|c) × P(t|ca)</Term>. We'll compute actual numbers for these in a moment—first, let's see the compact notation:
        </Paragraph>
        <MathBlock
          equation={`P(x_{1:t}) = \\prod_{i=1}^{t} P(x_i \\,|\\, x_{1:i-1})`}
          explanation={`That ∏ symbol means "product of all terms." Looks scary, says the same thing.`}
        />
        <Callout variant="insight" title="Storage vs. Computation">
          <p>
            We just swapped an impossible <strong>Storage</strong> problem for a solvable <strong>Function Approximation</strong> problem.
          </p>
          <ul>
            <li><strong>The Impossible Way:</strong> Store <Term>27<sup>100</sup></Term> probabilities in a giant lookup table. (Requires a hard drive bigger than the universe).</li>
            <li><strong>The Solvable Way:</strong> Find a function <Term>f(context)</Term> that calculates <Term>P(next)</Term> on the fly.</li>
          </ul>
          <p>
            We don't need to <em>list</em> every sequence. We just need to build a machine (a function) that can <em>generate</em> the correct probability for any context we throw at it. If that machine is good, the Chain Rule handles the rest.
          </p>
        </Callout>
      </Section>

      {/* Section 1.1.5 */}
      <Section number="1.1.6" title="Building Probabilities From a Corpus">
        <Paragraph>
          Okay, but where do these probabilities actually <em>come from</em>? We build them by counting—count how often sequences appear, divide by totals. Let's work through it.
        </Paragraph>
        <Paragraph>
          Imagine our entire training dataset is just these four sentences:
        </Paragraph>
        <CorpusDisplay sentences={['"cat sat"', '"dog ran"', '"a can"', '"a cat"']} />
        <Paragraph>
          That's our universe. 24 characters total (including spaces). Let's count things.
        </Paragraph>
        <WorkedExample title="Step 1: What characters exist?">
          <WorkedStep n="→">
            <p>Unique characters: <Term>[space, a, c, d, g, n, o, r, s, t]</Term></p>
            <WorkedNote>That's our vocabulary. 10 tokens.</WorkedNote>
          </WorkedStep>
        </WorkedExample>
        <WorkedExample title="Step 2: Count first-character frequencies">
          <WorkedStep n="→">
            <p>Looking at what character starts each sentence:</p>
            <FrequencyTable
              header={['Char', 'Count', 'P(char)']}
              rows={[
                { char: 'c', count: 1, prob: '1/4 = 0.25' },
                { char: 'd', count: 1, prob: '1/4 = 0.25' },
                { char: 'a', count: 2, prob: '2/4 = 0.50' },
                { isSum: true, label: 'Σ', count: 4, prob: '1.00 ✓' },
              ]}
            />
            <WorkedNote>One sentence starts with 'c', one with 'd', two with 'a'. So P(c) = 0.25.</WorkedNote>
          </WorkedStep>
        </WorkedExample>
        <WorkedExample title="Step 3: Count what follows 'c'">
          <WorkedStep n="→">
            <p>Every time 'c' appears in our corpus, what comes next?</p>
            <ContextTrace items={[
              { context: 'c', next: 'a', source: '("cat sat")' },
              { context: 'c', next: 'a', source: '("a can")' },
              { context: 'c', next: 'a', source: '("a cat")' },
            ]} />
            <FrequencyTable
              header={["Given 'c', next is...", 'Count', 'P(next | c)']}
              rows={[
                { char: 'a', count: 3, prob: '3/3 = 1.00' },
                { isSum: true, label: 'Σ', count: 3, prob: '1.00 ✓' },
              ]}
            />
            <WorkedNote>In our corpus, 'c' is always followed by 'a'. P(a|c) = 1.0—no ambiguity here. But watch what happens with longer contexts...</WorkedNote>
          </WorkedStep>
        </WorkedExample>
        <WorkedExample title="Step 4: Count what follows 'ca'">
          <WorkedStep n="→">
            <p>Every time 'ca' appears, what comes next?</p>
            <ContextTrace items={[
              { context: 'ca', next: 't', source: '("cat sat")' },
              { context: 'ca', next: 'n', source: '("a can")' },
              { context: 'ca', next: 't', source: '("a cat")' },
            ]} />
            <FrequencyTable
              header={["Given 'ca', next is...", 'Count', 'P(next | ca)']}
              rows={[
                { char: 't', count: 2, prob: '2/3 ≈ 0.67' },
                { char: 'n', count: 1, prob: '1/3 ≈ 0.33' },
                { isSum: true, label: 'Σ', count: 3, prob: '1.00 ✓' },
              ]}
            />
            <WorkedNote>Now we see probability at work. After 'ca', we get 't' twice (for "cat") and 'n' once (for "can"). The model learns P(t|ca) = 0.67 and P(n|ca) = 0.33.</WorkedNote>
          </WorkedStep>
        </WorkedExample>
        <Paragraph>
          At this point, we have concrete conditional probabilities like <Term>P(t | ca)</Term>—estimated from counts.
        </Paragraph>
      </Section>

      {/* Section 1.1.7.1 */}
      <Section number="1.1.7.1" title="The Hidden Graph & The Speed Limit">
        <Paragraph>
          We've been talking about "counts" and "tables," but there's a deeper structure here. What we just built is a <Term>Markov Chain</Term>.
        </Paragraph>
        <Paragraph>
          Every context (like "ca") is a <strong>state</strong>. Every possible next character is a <strong>transition</strong>. Conceptually, language is a giant graph, and generation is just walking a path through it.
        </Paragraph>
        <Paragraph>
          For decades, this graph structure was the state-of-the-art. But there was a massive engineering problem: <strong>The graph is too big.</strong>
        </Paragraph>
        <Paragraph>
          If you train on the entire internet, you might have 100 billion unique 5-grams. If you try to store those as standard objects (like Python dictionaries or C++ maps), you drown in overhead. A single pointer is 8 bytes. A malloc header is 16 bytes. When you have billions of small items, the metadata consumes more RAM than the data itself.
        </Paragraph>
        <Paragraph>
          So, how do we fix this? Let's reason from first principles.
        </Paragraph>
        <Paragraph>
          <strong>Attempt 1: Sort the IDs.</strong><br />
          First, we map every word to a unique integer ID (like "dog"→42, "sat"→105). Then we just store a massive list of these integer pairs, sorted numerically. No strings, no pointers. To find "42 followed by 105", we use Binary Search.
          <br /><em>The problem:</em> It's highly compact, but still too slow. Binary search is <Term>O(log N)</Term>. For 100 billion items, that's ~37 hops through memory for <em>every single lookup</em>. The Decoder needs to go faster.
        </Paragraph>
        <Paragraph>
          <strong>Attempt 2: The Hash.</strong><br />
          We want <Term>O(1)</Term> speed. We want to jump straight to the answer. But standard hash tables use "chaining" (linked lists) to handle collisions, which brings the pointers back.
        </Paragraph>
        <Paragraph>
          <strong>The Solution: Open Addressing.</strong><br />
          What if we use a hash table, but forbid it from creating new objects? If two items collide, we don't start a linked list; we just place the second item in the <em>next available slot</em> in the main array. This gives us the compactness of an array with the speed of a hash.
        </Paragraph>
        <PointerVsFlat />
        <Paragraph>
          This is exactly what <Term>KenLM</Term> does. It flattens the graph into a highly compressed, read-only binary format. It treats the entire model as a single giant array—a <strong>Linear Probing Hash Table</strong>.
          <Cite n={4} />
          <Cite n={6} />
        </Paragraph>
        <Paragraph>
          Instead of following pointers from node to node, it does something much more raw:
        </Paragraph>
        <ol>
          <li>Take the query (e.g., "dog sat").</li>
          <li>Hash it to a 64-bit integer.</li>
          <li>Jump directly to that index in the array.</li>
          <li>If the slot is busy (collision), just check the next one.</li>
        </ol>
        <Paragraph>
          This turns a graph traversal into a constant-time memory lookup. It's cache-friendly, pointer-free, and insanely fast.
        </Paragraph>
        <KenLMDemo />
        <Paragraph>
          <strong>Wait, doesn't hashing lose the order?</strong>
        </Paragraph>
        <Paragraph>
          This is a common confusion. If we just turn "dog sat" into a number, how does the model know "dog" came first?
        </Paragraph>
        <Paragraph>
          The answer is that the <strong>hash function is order-sensitive</strong>. KenLM uses sophisticated hashes (like MurmurHash or CityHash) that mix the bits of every character based on its position.
          <Cite n={7} />
          <Cite n={8} />
          <MathBlock equation='\text{Hash("dog sat")} \neq \text{Hash("sat dog")}' />
        </Paragraph>
        <Paragraph>
          The "structure" isn't lost; it's <Highlight>baked into the address</Highlight>. The model knows "sat" follows "dog" because the probability value is stored at the unique memory address reserved for that specific sequence.
        </Paragraph>
        <Paragraph>
          <strong>And what about the "Probing"?</strong>
        </Paragraph>
        <Paragraph>
          In the demo above, when we moved from index 3 to 4, we weren't moving to the "next word." We were just finding a parking spot.
        </Paragraph>
        <Paragraph>
          Think of RAM like a crowded parking lot. Both "cat sat" and "dog sat" wanted spot #3. They can't both park there. So "dog sat" just took the next available space (#4). Linear Probing is just a strategy for packing data tightly into memory, not for reading text.
        </Paragraph>
        <Paragraph>
          Why does this speed matter? Because of the <strong>Decoder</strong>.
        </Paragraph>
        <Paragraph>
          A Decoder (like in a translation app) doesn't just pick the best word once. It explores thousands of possible sentence variations in parallel, trying to find the one sequence that maximizes total probability. It hammers the Language Model with millions of queries per second.
        </Paragraph>
        <DecoderDemo />
        <Paragraph>
          The demo above shows a <Term>Beam Search</Term>. Watch the "LM lookups" counter. Even for a tiny 3-word sentence with a narrow beam, we are asking the model for probabilities constantly. KenLM made this loop viable for real-world products.
        </Paragraph>
        <Paragraph>
          But even with infinite speed and RAM, n-gram models hit a fundamental wall: <strong>Sparsity</strong>.
        </Paragraph>
        <Paragraph>
          What's missing is reuse. If the model learns something about "cat sat", that knowledge doesn't help with "dog sat". Every context is its own lookup. Every pattern requires new entries.
        </Paragraph>
        <Paragraph>
          KenLM solves the <strong>speed</strong> problem, but fails the <strong>generalization</strong> test because it relies on exact matching. It can tell you efficiently that it has never seen "dog sat" before, but it cannot take the next step—using what it knows about "cat sat" to make a guess. It is a brilliant system for retrieving exactly what you have seen, and useless for inferring what you haven't.
        </Paragraph>
        <Paragraph>
          What if we stored something else entirely? What if similar situations could share information?
        </Paragraph>
        <Paragraph>
          Chapter 2 builds that system.
        </Paragraph>
        <Citations
          items={[
            {
              n: 1,
              href: 'https://web.stanford.edu/~jurafsky/slp3/3.pdf',
              label: 'Jurafsky & Martin — Speech and Language Processing (draft), Ch. 3: N-gram Language Models',
            },
            {
              n: 2,
              href: 'https://aclanthology.org/J93-2003/',
              label: 'Brown et al. (1993) — The Mathematics of Statistical Machine Translation: Parameter Estimation',
            },
            {
              n: 3,
              href: 'https://aclanthology.org/P07-2045/',
              label: 'Koehn et al. (2007) — Moses: Open Source Toolkit for Statistical Machine Translation',
            },
            {
              n: 4,
              href: 'https://aclanthology.org/W11-2123/',
              label: 'Heafield (2011) — KenLM: Faster and Smaller Language Model Queries',
            },
            {
              n: 5,
              href: 'https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf',
              label: 'Bengio et al. (2003) — A Neural Probabilistic Language Model',
            },
            {
              n: 6,
              href: 'https://kheafield.com/code/kenlm/',
              label: 'KenLM Language Model Toolkit (docs + papers + tooling)',
            },
            {
              n: 7,
              href: 'https://github.com/aappleby/smhasher/blob/master/src/MurmurHash3.cpp',
              label: 'Appleby — MurmurHash3 Source Code (Note the specific mixing steps per byte)',
            },
            {
              n: 8,
              href: 'https://github.com/google/cityhash',
              label: 'Google — CityHash (Designed for high-speed hashing of strings with instruction-level parallelism)',
            },
          ]}
        />
      </Section>

      {/* Section 1.1.7.2 */}
      <Section number="1.1.7.2" title="The Sparsity Trap">
        <Paragraph>
          Why did we start this chapter with characters ("c", "a", "t") instead of words ("cat")?
        </Paragraph>
        <Paragraph>
          Words seem better. They have meaning! But word-level n-gram models are incredibly brittle. If you train on a corpus that contains "dog ran" and "cat sat", but <strong>never</strong> "dog sat", the model learns a hard zero:
        </Paragraph>
        <MathBlock equation='P("sat" \mid "dog") = 0' />
        <Paragraph>
          The graph is disconnected. You can't get there from here.
        </Paragraph>
        <SparseMarkovViz />
        <Paragraph>
          This is the <Term>Sparsity Problem</Term>. Language is combinatorial; you will never see every valid two-word combination, no matter how much text you read.
        </Paragraph>
        <Callout variant="warning" title="When Memorization Fails: A Concrete Example">
          <Paragraph>
            Imagine training on 1 million sentences. Sounds huge—but English has roughly 170,000 common words. The number of possible two-word combinations is 170,000 × 170,000 = 29 billion. Your 1 million training sentences contain maybe 10 million bigrams. That's 10 million / 29 billion ≈ 0.03% coverage.
          </Paragraph>
          <Paragraph>
            Here's what this means concretely. Suppose "dog" appears 5,000 times in your corpus. You'd expect it to pair with roughly 5,000 / 170,000 ≈ 3% of the vocabulary. So for most words—97% of them—P(word | "dog") = 0. Not "low probability." <strong>Zero</strong>. The model literally cannot generate "dog frisbee" or "dog veterinarian" if those exact pairs never appeared, even though they're perfectly valid English.
          </Paragraph>
          <Paragraph>
            This isn't a minor smoothing issue. It's a fundamental failure mode: <strong>memorization doesn't generalize</strong>. The fix requires something that can share information between similar contexts—which is exactly what embeddings do in Chapter 2.
          </Paragraph>
        </Callout>
        <Paragraph>
          Now look at what happens when we switch to characters. We decompose the words into atoms.
        </Paragraph>
        <MarkovChainViz />
        <Paragraph>
          Suddenly, "dog sat" is possible! The model has seen:
        </Paragraph>
        <ul style={{ listStyleType: 'decimal', paddingLeft: '1.5em', marginBottom: '1em' }}>
          <li><Term>d-o-g-␣</Term> (from "dog ran")</li>
          <li><Term>␣-s-a-t</Term> (from "cat sat")</li>
        </ul>
        <Paragraph>
          The <Term>space</Term> character acts as a mechanical bridge. The model learned "words end with space" and "words start after space." It can now stitch together <em>any</em> word ending in space with <em>any</em> word starting after space.
        </Paragraph>
        <Paragraph>
          Why does frequency help? It's the law of large numbers. If you've seen 'space' followed by various characters 10,000 times, your estimate of P(next|space) is stable — adding one more example barely changes it. If you've seen 'q' only 50 times, each new example shifts your estimate significantly. High frequency means low variance in your probability estimates, which means reliable predictions even for new combinations.
        </Paragraph>
        <Callout variant="info" title="Overlap vs. Understanding">
          <Paragraph>
            This is a double-edged sword. Character models are robust—they never say probability zero—but they are also hallucination machines. A character model might happily generate "dogs meow" just because the spellings overlap, not because it understands biology.
          </Paragraph>
          <Paragraph>
            <CorpusDisplay sentences={['"cats meow"', '"dogs bark"']} />
          </Paragraph>
          <Paragraph>
            That's transfer through <Highlight>overlap</Highlight>. Semantic similarity is the stronger thing: "cat" and
            "dog" should behave similarly in many contexts even when they share almost no spelling. Getting that kind of
            reuse is what Chapter 2 is about.
          </Paragraph>
          <Paragraph>
            Chapter 2 is where we build a model that can share what it learns across many different contexts—even when they don't share the same characters.
          </Paragraph>
        </Callout>
      </Section>

      {/* Section 1.1.8 */}
      <Section number="1.1.8" title="Applying the Chain Rule">
        <Paragraph>
          Let's apply the chain rule to compute P("cat") using the probabilities we just built:
        </Paragraph>
        <MathBlock
          equation="P(c) = 0.25"
          explanation="From our first-character table."
        />
        <MathBlock
          equation={`P(a \\,|\\, c) = 1.0`}
          explanation="We counted: 'c' is always followed by 'a' in our corpus."
        />
        <MathBlock
          equation={`P(t \\,|\\, ca) \\approx 0.67`}
          explanation="2 out of 3 times, 'ca' was followed by 't'."
        />
        <Paragraph>
          Multiply them together:
        </Paragraph>
        <MathBlock
          equation={`P(\\text{"cat"}) = P(c) \\times P(a \\,|\\, c) \\times P(t \\,|\\, ca) = 0.25 \\times 1.0 \\times 0.67 \\approx 0.17`}
          explanation="There's a 17% chance of generating 'cat' if we sampled from this model."
        />
        <Callout variant="insight" title="The Training Objective">
          <p>This is the core intuition. The model's job is to <Highlight>assign high probability to the correct next token</Highlight>.</p>
          <p>If the real text is "cat", the model sees "c" and should put most of its probability mass on "a". Then it sees "ca" and should put most of the mass on "t".</p>
          <p>By maximizing the probability of the <em>correct</em> token at every step, the model implicitly maximizes the probability of the entire real sequence. This is why training looks like "next token prediction"—and in stats terms, it's maximum likelihood.</p>
        </Callout>
      </Section>

      {/* Section 1.2 */}
      <Section number="1.2" title="The Actual Meat Grinder: Tokenization">
        <Paragraph>
          Okay, enough theory. Let's build something.
        </Paragraph>
        <Paragraph>
          Here's the problem: computers don't understand letters. They understand numbers. Your GPU can multiply matrices all day long, but it has no concept of what "a" or "cat" means.
        </Paragraph>
        <Paragraph>
          We need a translation layer. <Highlight>Tokenization</Highlight> is the process of converting text into a sequence of integers that a model can actually process. Mathematicians call this <Term>discretization</Term>—mapping the continuous or symbolic world of human thought onto a discrete set of integers that a machine can manipulate.
        </Paragraph>
        <Paragraph>
          The obvious first instinct is to tokenize <em>words</em>—that's how humans read. But word-level models hit immediate pain: vocabularies of 50,000+ entries, unknown words (OOV) everywhere, and most word-contexts never repeat in training data. The sparsity problem from Section 1.1 hits even harder.
        </Paragraph>
        <Paragraph>
          So for BabyGPT, we drop to <Term>character-level tokenization</Term>. Not because words are "wrong," but because characters make the core mechanics visible: tiny vocab (~80 characters for English), zero OOV (every character is known), and patterns that actually recombine. The math is identical—we're just turning the knobs to "small" so we can see what's happening.
        </Paragraph>
      </Section>

      {/* Section 1.2.1 */}
      <Section number="1.2.1" title="Building the Vocabulary">
        <Paragraph>
          First, we need to know what characters we're even dealing with. Scan the training data, collect every unique character. That's our alphabet.
        </Paragraph>
        <Paragraph>
          Let's use a fresh example. Say our training corpus is:
        </Paragraph>
        <CorpusDisplay sentences={['"hello world"']} />
        <Paragraph>
          The unique characters are: <Term>[space, d, e, h, l, o, r, w]</Term>
        </Paragraph>
        <Paragraph>
          That's 8 characters. We sort them (so the same data always produces the same mapping) and give each one an integer:
        </Paragraph>
        <FrequencyTable
          header={['Character', 'Token ID', '']}
          rows={[
            { char: '[space]', count: 0, prob: '' },
            { char: 'd', count: 1, prob: '' },
            { char: 'e', count: 2, prob: '' },
            { char: 'h', count: 3, prob: '' },
            { char: 'l', count: 4, prob: '' },
            { char: 'o', count: 5, prob: '' },
            { char: 'r', count: 6, prob: '' },
            { char: 'w', count: 7, prob: '' },
          ]}
        />
        <Paragraph>
          This mapping is our <Term>vocabulary</Term>. The size of this vocabulary (8 in this case) is called <Term>vocab_size</Term>. It determines how many possible tokens the model can output.
        </Paragraph>
        <CodeChallenge phase={1} title="Build the Vocabulary Mappings">
          <CodeChallenge.Setup>
            <CodeBlock filename="vocab.py">{`text = 'hello world'
chars = sorted(set(text))  # [' ', 'd', 'e', 'h', 'l', 'o', 'r', 'w']`}</CodeBlock>
          </CodeChallenge.Setup>
          <CodeChallenge.Prompt>
            Create two dictionaries:
            {'\n'}- <code>stoi</code>: maps each character to its index (string-to-int)
            {'\n'}- <code>itos</code>: maps each index back to its character (int-to-string)
            {'\n\n'}Hint: <code>enumerate(chars)</code> gives you (index, character) pairs.
          </CodeChallenge.Prompt>
          <CodeChallenge.Solution>
            <CodeChallenge.Answer>{`stoi = {ch: i for i, ch in enumerate(chars)}
itos = {i: ch for ch, i in stoi.items()}

# Result:
# stoi = {' ': 0, 'd': 1, 'e': 2, 'h': 3, 'l': 4, 'o': 5, 'r': 6, 'w': 7}
# itos = {0: ' ', 1: 'd', 2: 'e', 3: 'h', 4: 'l', 5: 'o', 6: 'r', 7: 'w'}`}</CodeChallenge.Answer>
            <CodeWalkthrough filename="vocab.py" lang="python">
              <Step code={`stoi = {ch: i for i, ch in enumerate(chars)}`}>
                <code>enumerate(chars)</code> yields <code>(0, ' '), (1, 'd'), ...</code>. We flip to <code>{'{'}ch: i{'}'}</code> so the character is the key.
              </Step>
              <Step code={`itos = {i: ch for ch, i in stoi.items()}`}>
                Reverse the mapping. Now we can go integer → character for decoding.
              </Step>
            </CodeWalkthrough>
          </CodeChallenge.Solution>
        </CodeChallenge>
        <Paragraph>
          <Term>stoi</Term> (string-to-int) encodes text. <Term>itos</Term> (int-to-string) decodes it. That's the whole tokenizer.
        </Paragraph>
      </Section>

      {/* Section 1.2.2 */}
      <Section number="1.2.2" title="Encoding and Decoding">
        <Paragraph>
          Now we can actually <em>use</em> the vocabulary.
        </Paragraph>
        <Paragraph>
          <strong>Encoding</strong> means: walk through the text and replace each character with its ID using <Term>stoi</Term>.
        </Paragraph>
        <Paragraph>
          <strong>Decoding</strong> means: take IDs, map them back to characters with <Term>itos</Term>, and join them into a string.
        </Paragraph>
        <Paragraph>
          With the mapping above, <Term>hello</Term> becomes <Term>[3, 2, 4, 4, 5]</Term>.
        </Paragraph>
        <Paragraph>
          One subtle but important detail: these integers aren't "numbers" the way <Term>3</Term> and <Term>5</Term> are in
          arithmetic. They're labels—IDs. If we permuted the IDs and stayed consistent, the model wouldn't care.
        </Paragraph>
        <Paragraph>
          We'll write the helpers when we build the full data pipeline. For now, just notice the point: the model never
          sees letters. It only sees IDs, and it only ever outputs IDs. <Term>itos</Term> is how we translate the result
          back into something readable.
        </Paragraph>
      </Section>

      {/* Interactive Tokenizer Demo */}
      <Paragraph>
        <em>The meat grinder in action: type anything and watch characters become integers (and back again).</em>
      </Paragraph>
      <TokenizerDemo />

      {/* Section 1.3 */}
      <Section number="1.3" title="The Sliding Window">
        <Paragraph>
          We've got text → integers. But simply feeding a stream of numbers isn't enough. We need to structure this data to operationalize the <Highlight>Decomposition Strategy</Highlight> we derived in Section 1.1.
        </Paragraph>
        <Paragraph>
          This is where we start to tame the generalization and sparsity issues. By breaking the massive text into small, overlapping chunks (the "grams" in n-grams), we force the model to focus on <Term>local structure</Term>.
        </Paragraph>
        <Callout variant="insight" title="From Memorization to Rules">
          <p>When you look at a whole book, it's unique. You'll never see that exact sequence of 100,000 words again.</p>
          <p>But when you slice that book into 3-character windows, you start seeing repeats. "the" shows up constantly. "ing" shows up everywhere. By turning one long sequence into many overlapping short ones, we trade a sparsity problem for something we can actually count.</p>
        </Callout>
        <Paragraph>
          To implement this, we slide a window across our tokenized text to create (context, target) pairs.
        </Paragraph>
      </Section>

      {/* Section 1.3.1 */}
      <Section number="1.3.1" title="Context Length">
        <Paragraph>
          Back in section 1.1, we wrote P(xₙ | x₁, x₂, ..., xₙ₋₁)—condition on <em>all</em> previous tokens. But in practice, we can't do that. We need to pick a finite window and condition only on the last k tokens.
        </Paragraph>
        <Callout variant="info" title="Why Finite Context?">
          <p><strong>Statistical:</strong> Remember the sparsity table? Longer contexts appear exponentially less often in training data. A 50-character exact match is astronomically rare—there's not enough signal to learn from.</p>
          <p><strong>Computational:</strong> Memory and compute grow with context length. Smaller windows = faster training, less memory.</p>
          <p><strong>Practical:</strong> Fixed-size inputs simplify everything. The model architecture we'll build in Chapter 2 expects a consistent input shape.</p>
        </Callout>
        <Paragraph>
          The <Term>context length</Term> (also called <Term>block size</Term>) is that finite window—how far back the model can look. Everything outside that window doesn't exist to the model. context_length = 3 means: see 3 tokens, predict the 4th, forget everything older.
        </Paragraph>
        <Paragraph>
          Let's trace through "hello" with context_length = 3:
        </Paragraph>
        <TrainingExamples rows={[
          { step: 't=0', context: '"hel" → [3, 2, 4]', target: '"l" → 4' },
          { step: 't=1', context: '"ell" → [2, 4, 4]', target: '"o" → 5' },
        ]} />
        <Paragraph>
          Each row is one training example. The model sees the context, tries to predict the target, and learns from its mistakes.
        </Paragraph>
        <Callout variant="warning" title="But Wait—What About the Beginning?">
          <p>When we're at position 0, we don't <em>have</em> 3 characters of context yet. What do we do?</p>
          <p>We could pad with zeros, or we could train on variable-length contexts. For BabyGPT, we'll actually train on <em>all</em> context lengths from 1 to context_length. More training signal!</p>
        </Callout>
      </Section>

      {/* Section 1.3.2 */}
      <Section number="1.3.2" title="The Free Lunch">
        <Paragraph>
          We want our model to be robust. It should handle "h" (1 char context), "he" (2 chars), and "hel" (3 chars).
        </Paragraph>
        <Paragraph>
          The naive approach is to chop the text into separate training examples for every possible length:
        </Paragraph>
        <CodeBlock filename="naive_approach.py">{`# The "Triangle of Waste"
Input: [h]          Target: e
Input: [h, e]       Target: l
Input: [h, e, l]    Target: l`}</CodeBlock>
        <Paragraph>
          But look closely at the data. We are just copying the same sequence over and over.
        </Paragraph>
        <Paragraph>
          Let's line up our questions and answers and see if we spot a pattern.
        </Paragraph>
        <Paragraph>
          When the input is index 0 (<code>h</code>), the target is index 1 (<code>e</code>).
        </Paragraph>
        <Paragraph>
          When the input is index 1 (<code>e</code>), the target is index 2 (<code>l</code>).
        </Paragraph>
        <Paragraph>
          The target is always just the neighbor to the right. We don't need to chop anything. We just need to show the model the sequence and its neighbor-shifted twin.
        </Paragraph>
        <Paragraph>
          Look at the integer sequence for "hello": <code>[10, 20, 30, 40, 50]</code>.
        </Paragraph>
        <TrainingExamples rows={[
          { step: 'Input Block', context: '[10, 20, 30, 40]', target: 'The Context' },
          { step: 'Target Block', context: '[20, 30, 40, 50]', target: 'The Prediction' },
        ]} />
        <Paragraph>
          By handing the model these two locked lists, we are implicitly asking it to solve all the sub-problems at once:
        </Paragraph>
        <ul style={{ listStyleType: 'decimal', paddingLeft: '1.5em', marginBottom: '1em' }}>
            <li>Index 0: The model sees context <code>[10]</code> and predicts <code>20</code>.</li>
            <li>Index 1: The model sees context <code>[10, 20]</code> and predicts <code>30</code>.</li>
            <li>Index 2: The model sees context <code>[10, 20, 30]</code> and predicts <code>40</code>.</li>
        </ul>
        <Paragraph>
          There is just one rule to this game: <Highlight>looking to the right is forbidden</Highlight>. Even though <code>30</code> is sitting right there at index 2, the model, standing at index 1, must pretend it doesn't exist. It can only look left.
        </Paragraph>
        <Paragraph>
          Why is this rule so strict? Because at test time, the future doesn't exist yet. When generating text, you predict token 5 before token 6 exists. If the model learned to peek at token 6 during training, it would fail at inference — the cheat it relied on is gone. Training must match deployment: predict using only what you'd have available when it counts.
        </Paragraph>
        <Paragraph>
          It's a free lunch. We process one big block of text, but because of this time-arrow constraint, we are mathematically training on every single prefix contained within it.
        </Paragraph>
      </Section>

      {/* Interactive Sliding Window Demo */}
      <Paragraph>
        <em>One text becomes thousands of (context → next token) supervision signals. Change the context length and watch the examples change.</em>
      </Paragraph>
      <SlidingWindowDemo />

      {/* Section 1.4 */}
      <Section number="1.4" title="Putting It Together">
        <Paragraph>
          Let's build <code>prepare_data</code> in three phases. Try each challenge before revealing the solution—it'll stick better.
        </Paragraph>

        {/* Phase 1: Vocabulary */}
        <CodeChallenge phase={1} title="Build the Vocabulary">
          <CodeChallenge.Setup>
            <p>We have <code>text = "hello"</code>. First task: create mappings between characters and integers.</p>
          </CodeChallenge.Setup>
          <CodeChallenge.Prompt>
            <ol>
              <li>What unique characters are in "hello"? (hint: 'l' appears twice but only counts once)</li>
              <li>If we sort them alphabetically, what's the order?</li>
              <li>What would <code>stoi['h']</code> equal?</li>
            </ol>
          </CodeChallenge.Prompt>
          <CodeChallenge.Solution>
            <CodeChallenge.Answer>
              {`Unique chars: e, h, l, o (4 total)
Sorted: ['e', 'h', 'l', 'o']
stoi = {'e': 0, 'h': 1, 'l': 2, 'o': 3}
So stoi['h'] = 1`}
            </CodeChallenge.Answer>
            <CodeWalkthrough filename="data.py" lang="python">
              <Step code="chars = sorted(set(text))">
                <code>set()</code> gets unique characters, <code>sorted()</code> makes it reproducible. Result: <code>['e', 'h', 'l', 'o']</code>
              </Step>
              <Step code="vocab_size = len(chars)">
                How many possible tokens exist: <code>4</code>
              </Step>
              <Step code={`stoi = {ch: i for i, ch in enumerate(chars)}`}>
                The encoder: string-to-int. <code>{`{'e': 0, 'h': 1, 'l': 2, 'o': 3}`}</code>
              </Step>
              <Step code={`itos = {i: ch for ch, i in stoi.items()}`}>
                The decoder: int-to-string. The reverse mapping.
              </Step>
            </CodeWalkthrough>
          </CodeChallenge.Solution>
        </CodeChallenge>

        {/* Phase 2: Encoding */}
        <CodeChallenge phase={2} title="Encode the Text">
          <CodeChallenge.Setup>
            <p>Now we have <code>{`stoi = {'e': 0, 'h': 1, 'l': 2, 'o': 3}`}</code>. Time to convert the text to integers.</p>
          </CodeChallenge.Setup>
          <CodeChallenge.Prompt>
            <p>Convert <code>"hello"</code> to a list of integers using stoi. Write out the full list.</p>
          </CodeChallenge.Prompt>
          <CodeChallenge.Solution>
            <CodeChallenge.Answer>
              {`h → 1, e → 0, l → 2, l → 2, o → 3
Result: [1, 0, 2, 2, 3]`}
            </CodeChallenge.Answer>
            <CodeWalkthrough filename="data.py" lang="python">
              <Step code="data = [stoi[ch] for ch in text]">
                Loop through each character, look up its integer. Result: <code>[1, 0, 2, 2, 3]</code>
              </Step>
            </CodeWalkthrough>
          </CodeChallenge.Solution>
        </CodeChallenge>

        {/* Phase 3: Sliding Window */}
        <CodeChallenge phase={3} title="Extract Training Pairs">
          <CodeChallenge.Setup>
            <p>We have <code>data = [1, 0, 2, 2, 3]</code> (that's "hello" encoded). With <code>context_length = 3</code>, we slide a window to create (input, target) pairs.</p>
          </CodeChallenge.Setup>
          <CodeChallenge.Prompt>
            <p>For the <strong>first</strong> window position:</p>
            <ol>
              <li>What 3 integers does the model SEE (X[0])?</li>
              <li>What 3 integers should it PREDICT (Y[0])?</li>
            </ol>
            <p><em>Hint: Y is X shifted by 1 position.</em></p>
          </CodeChallenge.Prompt>
          <CodeChallenge.Solution>
            <CodeChallenge.Answer>
              {`X[0] = [1, 0, 2]  →  "hel"
Y[0] = [0, 2, 2]  →  "ell"

The target is shifted by 1: predict 'e' from 'h', predict 'l' from 'he', predict 'l' from 'hel'.`}
            </CodeChallenge.Answer>
            <CodeWalkthrough filename="data.py" lang="python">
              <Step code="X, Y = [], []">
                Initialize empty lists for inputs and targets.
              </Step>
              <Step code="for i in range(len(data) - context_length):">
                Slide across the data. We stop early to leave room for targets.
              </Step>
              <Step code="    X.append(data[i : i + context_length])">
                Grab <code>context_length</code> integers as input.
              </Step>
              <Step code="    Y.append(data[i + 1 : i + context_length + 1])">
                Grab the next <code>context_length</code> integers as targets—shifted by 1.
              </Step>
            </CodeWalkthrough>
          </CodeChallenge.Solution>
        </CodeChallenge>

        {/* Complete function */}
        <Paragraph>
          Here's the complete function, all pieces assembled:
        </Paragraph>
        <CodeBlock filename="data.py">{`def prepare_data(text, context_length):
    chars = sorted(set(text))
    vocab_size = len(chars)
    stoi = {ch: i for i, ch in enumerate(chars)}
    itos = {i: ch for ch, i in stoi.items()}
    data = [stoi[ch] for ch in text]

    X, Y = [], []
    for i in range(len(data) - context_length):
        X.append(data[i : i + context_length])
        Y.append(data[i + 1 : i + context_length + 1])

    return X, Y, stoi, itos, vocab_size`}</CodeBlock>
        <Paragraph>
          Let's verify it works:
        </Paragraph>
        <CodeBlock filename="test.py">{`text = "hello world"
X, Y, stoi, itos, vocab_size = prepare_data(text, context_length=4)

print(f"Vocab size: {vocab_size}")      # 8
print(f"Training examples: {len(X)}")   # 7
print(f"First X: {X[0]}")               # [3, 2, 4, 4] ("hell")
print(f"First Y: {Y[0]}")               # [2, 4, 4, 5] ("ello")`}</CodeBlock>
        <Callout variant="insight" title="Why Y Has the Same Length as X">
          <p>Each X[i] and Y[i] are both lists of <code>context_length</code> integers. Why isn't Y just one target per example?</p>
          <p>The trick: X[i] = [a, b, c, d] contains <em>four</em> prediction problems: predict b from [a], predict c from [a,b], predict d from [a,b,c], predict e from [a,b,c,d].</p>
          <p>Y[i] = [b, c, d, e] gives us all those targets. One example, four learning signals.</p>
        </Callout>
      </Section>

      {/* Section 1.5 */}
      <Section number="1.5" title="What We Built">
        <Invariants title="Chapter 1 Invariants">
          <InvariantItem>A language model computes P(next | context) via the chain rule</InvariantItem>
          <InvariantItem>Probabilities must sum to 1 over the vocabulary</InvariantItem>
          <InvariantItem>Tokenization: text ↔ integers via stoi/itos dictionaries</InvariantItem>
          <InvariantItem>Training examples: (context, target) pairs from sliding window</InvariantItem>
          <InvariantItem>X[i] shifted by 1 = Y[i] (next-token prediction)</InvariantItem>
        </Invariants>
        <Paragraph>
          We started with raw text and ended with training data. The pipeline is simple: text becomes characters, characters become integers, and a sliding window extracts (context, target) pairs. Pure Python, no magic.
        </Paragraph>
        <Paragraph>
          Our tiny corpus processed in microseconds. Good thing, because real training data is... bigger.
        </Paragraph>
      </Section>

      {/* Section 1.6 */}
      <Section number="1.6" title="The Wall">
        <Paragraph>
          We've built a machine that works perfectly for "hello world". But we didn't come here to solve "hello world". We came here to solve English.
        </Paragraph>
        <Paragraph>
          Let's try to scale this approach to a real book, like <em>Harry Potter</em>.
        </Paragraph>
        <Paragraph>
          English has long-range dependencies. If a sentence starts with "The <strong>boy</strong> who lived...", the pronoun 50 words later must be "<strong>he</strong>", not "she". To capture this, our context length needs to be large—say, 100 characters.
        </Paragraph>
        <Paragraph>
          Here is the math for a lookup table with context length 100:
        </Paragraph>
        <MathBlock
          equation="\text{Possible Sequences} = \text{Vocab}^{\text{Context}}"
          explanation="Exponential growth is not your friend."
        />
        <MathBlock
          equation={`80^{100} \\approx 10^{190}`}
          explanation={`For comparison, the number of atoms in the observable universe is roughly 10⁸⁰.`}
        />
        <Paragraph>
          This isn't just a "buy a bigger hard drive" problem. This is a physics problem.
        </Paragraph>
        <Callout variant="warning" title="The Real Problem Is Sparsity">
          <p>Even if you <em>could</em> build a hard drive the size of the universe, it would mostly be empty.</p>
          <p>
            Counting only works when the <em>exact</em> context shows up enough times to estimate what comes next. At 100
            characters of context, exact repeats are rare, so the table stays almost entirely blank.
          </p>
          <p>
            When the model sees a new sentence (which happens constantly), it looks up the context, finds nothing, and
            returns a useless default like P=0.
          </p>
        </Callout>
        <Paragraph>
          This is where pure counting hits a wall. N-gram models stay useful by keeping the context short and, in real
          systems, using smoothing/backoff when a long context is missing. That keeps them usable—but it also highlights
          their limit: they can only reuse statistics through <em>literal overlap</em>, not through meaning.
        </Paragraph>
        <Paragraph>
          We need a model that doesn't just <em>count</em> history, but <em>compresses</em> it into a learned state—so it can
          carry information forward without needing the exact same context to repeat.
        </Paragraph>
        <Paragraph>
          We'll build that in Chapter 2.
        </Paragraph>
      </Section>

      {/* Section 1.7 */}
      <Section number="1.7" title="What's Next">
        <Paragraph>
          Our data is ready. Now we need two things:
        </Paragraph>
        <Paragraph>
          <strong>Something that can learn.</strong> So when <em>does</em> our counting approach actually transfer knowledge?
        </Paragraph>
        <Paragraph>
          Overlap works great. "cat" and "can" share "ca"—the model reuses those counts. "walking" and "talked" share common endings. Real transfer! But notice: it only kicks in when the <em>spelling</em> happens to line up.
        </Paragraph>
        <Paragraph>
          Here's where it breaks down. "cat" and "dog" are basically semantic twins—both pets, both follow "the", both precede "sat." But they share almost no characters. To a counting model, they're strangers. Different keys, no connection.
        </Paragraph>
        <Paragraph>
          So the gap is: shared structure that <em>isn't</em> spelling. We need something that can figure out "cat" and "dog" belong together—not because we told it, but because it noticed they keep showing up in similar situations.
        </Paragraph>
        <Callout variant="insight" title="What A Solution Must Provide">
          <Paragraph>
            Any fix for the sparsity problem must satisfy three requirements:
          </Paragraph>
          <ol style={{ marginLeft: '1.5em', marginBottom: '1em' }}>
            <li><strong>Compositionality:</strong> New contexts must be expressible as combinations of seen parts. An unseen phrase like "dog veterinarian" should be computable from the pieces "dog" and "veterinarian" even if the pair never appeared together.</li>
            <li><strong>Similarity transfer:</strong> Similar inputs should produce similar outputs. If "cat sat" has high probability, then "dog sat" should too—because cats and dogs behave similarly in this position.</li>
            <li><strong>Continuous representation:</strong> Instead of discrete keys (where "dog" ≠ "cat" is a hard boundary), we need a space where "dog" and "cat" can be <em>close</em>. Closeness enables interpolation.</li>
          </ol>
          <Paragraph>
            A lookup table fails all three. Embeddings—vectors that position each token in a continuous space—satisfy all three. That's why they work.
          </Paragraph>
        </Callout>
        <Paragraph>
          Here's how embeddings solve the sparsity problem. With embeddings, an unseen context like{' '}
          <Term>"the dog"</Term> becomes a <strong>combination</strong> of vectors you've seen:{' '}
          <code>E['t'] + E['h'] + E['e'] + E[' '] + E['d'] + E['o'] + E['g']</code>. You've trained on each of those
          vectors in other contexts. The model can interpolate—it doesn't need to have seen this exact string, because
          it's built from known parts. Similarity in embedding space enables similarity in predictions.
        </Paragraph>
        <Paragraph>
          <strong>Something that can scale.</strong> Even a simple model becomes expensive when you repeat it billions of
          times. Chapter 3 is about making that practical.
        </Paragraph>
      </Section>

      {/* Section 1.8: Exercises */}
      <Section number="1.8" title="Exercises">
        <Exercise
          number="1.1"
          title="Chain Rule by Hand"
          solution={
            <>
              <p><strong>P("dog"):</strong></p>
              <CodeBlock>{`P(d) = 1/4 = 0.25 (only "dog ran" starts with d)
P(o|d) = 1.0 (d always followed by o)
P(g|do) = 1.0 (do always followed by g)
P("dog") = 0.25 × 1.0 × 1.0 = 0.25`}</CodeBlock>
              <p><strong>P("can"):</strong></p>
              <CodeBlock>{`P(c) = 1/4 = 0.25 (only "cat sat" starts with c)
P(a|c) = 1.0 (c always followed by a in our corpus)
P(n|ca) = 1/3 ≈ 0.33 (ca followed by: t, n, t)
P("can") = 0.25 × 1.0 × 0.33 ≈ 0.083`}</CodeBlock>
              <p><strong>P("sat"):</strong></p>
              <CodeBlock>{`P(s) = 0/4 = 0 (no sentence starts with s!)
P("sat") = 0

Even though "sat" exists in our corpus, we can never
GENERATE it because no sentence starts with 's'.
This is a limitation of sentence-level models.`}</CodeBlock>
              <p><em>Note: In real training, we either use a special start-of-sequence token or train on continuous text without sentence boundaries—so this limitation goes away. Our tiny corpus just happens to use sentence-level splits.</em></p>
            </>
          }
        >
          <Paragraph>
            Using the corpus from section 1.1.6 ("cat sat", "dog ran", "a can", "a cat"), compute the following probabilities.
          </Paragraph>
          <Paragraph>
             <em>Assume these four sentences are independent samples from the universe.</em>
          </Paragraph>
          <ol>
            <li>P("dog")</li>
            <li>P("can")</li>
            <li>P("sat")</li>
          </ol>
          <Paragraph>
            Show your work using the chain rule decomposition.
          </Paragraph>
        </Exercise>

        <Exercise
          number="1.2"
          title="Vocabulary Edge Cases"
          hint={
            <>
              <p>The characters 'g', 'b', 'y' don't exist in the vocabulary built from "hello world".</p>
              <p>Common solutions: (1) raise KeyError with helpful message, (2) add an &lt;UNK&gt; token to the vocabulary.</p>
            </>
          }
          solution={
            <CodeBlock>{`def encode_safe(text, stoi, unk_token=None):
    result = []
    for ch in text:
        if ch in stoi:
            result.append(stoi[ch])
        elif unk_token is not None:
            result.append(stoi[unk_token])
        else:
            raise KeyError(f"Character '{ch}' not in vocabulary. "
                          f"Available: {list(stoi.keys())}")
    return result

# Option 1: Raise clear error
encode_safe("goodbye", stoi)  # KeyError: Character 'g' not in vocabulary

# Option 2: Add UNK token to vocab first
stoi['<UNK>'] = len(stoi)
itos[len(itos)] = '<UNK>'
encode_safe("goodbye", stoi, unk_token='<UNK>')  # Works!`}</CodeBlock>
          }
        >
          <Paragraph>
            What happens if you try to encode "goodbye" using a vocabulary built from "hello world"?
          </Paragraph>
          <Paragraph>
            Write code that handles this gracefully (either by raising a clear error or by using an unknown token).
          </Paragraph>
        </Exercise>

        <Exercise
          number="1.3"
          title="Counting Training Examples"
          solution={
            <>
              <p><strong>Formula:</strong> num_examples = N - C</p>
              <p>Why? Each training example needs C characters for context plus 1 character for target. So positions 0 through N-C-1 can be starting points, giving N-C examples.</p>
              <CodeBlock>{`N = 11 (len("hello world"))
C = 4
num_examples = 11 - 4 = 7

Verify:
"hell" → "ello"  (position 0)
"ello" → "llo "  (position 1)
"llo " → "lo w"  (position 2)
"lo w" → "o wo"  (position 3)
"o wo" → " wor"  (position 4)
" wor" → "worl"  (position 5)
"worl" → "orld"  (position 6)
= 7 examples ✓`}</CodeBlock>
            </>
          }
        >
          <Paragraph>
            If your text has N characters and your context_length is C, how many training examples do you get?
          </Paragraph>
          <Paragraph>
            Derive the formula and verify it with "hello world" (N=11) and context_length=4.
          </Paragraph>
        </Exercise>
      </Section>

      <ChapterNav next={{ href: '/chapter-02', label: 'Chapter 2: The Map' }} />
    </Container>
  )
}
