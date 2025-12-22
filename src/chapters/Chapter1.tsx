import {
  Container,
  ChapterHeader,
  ChapterMap,
  Section,
  SectionLink,
  Paragraph,
  Highlight,
  Term,
  Callout,
  FormalRigor,
  FormalSubSection,
  Cite,
  Citations,
  MathBlock,
  MathInline,
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
  NgramSamplingDemo,
  CausalMaskViz,
  GeneralizationGapViz,
  ConditioningShiftViz,
  NgramGraphViz,
} from '../components'

export function Chapter1() {
  return (
    <Container>
      <ChapterHeader
        number="01"
        title="The Meat Grinder"
        subtitle="Raw text walks in wearing poetry and vibes. Our model only eats integers. This is where we build the digestive tract."
      />

      <ChapterMap
        title="Chapter 1 Map"
        steps={[
          {
            to: '1.1',
            title: 'The Physics',
            description: 'What we are predicting, and why probability is the whole game.',
          },
          {
            to: '1.1.5',
            title: 'The Chain Rule',
            description: 'Turn P(text) into a product of P(next | context).',
          },
          {
            to: '1.1.7.2',
            title: 'The Sparsity Trap',
            description: 'Why counting hits zeros (and why overlap is the only escape hatch).',
          },
          {
            to: '1.3.2',
            title: 'The Free Lunch',
            description: 'One block of text becomes thousands of training targets.',
          },
          {
            to: '1.6',
            title: 'The Limit',
            description: 'Where exact matching stops scaling, even with engineering heroics.',
          },
          {
            to: '1.7',
            title: "What's Next",
            description: 'Why we need a map, not a phone book.',
          },
        ]}
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
        <Paragraph>
          That's the same game we'll play. At each position, the model outputs a probability distribution over the next character. Then reality reveals what the next character actually was, and we check: did the model put high probability on the truth, or did it miss?
        </Paragraph>
        <Citations
          title="Shannon's Information Theory"
          items={[
            {
              n: 1,
              href: 'https://people.math.harvard.edu/~ctm/home/text/others/shannon/entropy/entropy.pdf',
              label: 'Shannon (1948) — "A Mathematical Theory of Communication" (Bell System Technical Journal)',
            },
            {
              n: 2,
              href: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC7514546/',
              label: "Ren, Takahashi, Tanaka-Ishii (2019) — Revisiting Shannon's English entropy estimate (Entropy journal)",
            },
          ]}
        />
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
        <Paragraph>
          Shannon’s famous estimate is that English averages around <strong>1.3 bits per character</strong>. Read that as a target: on average, a good predictor narrows the next character down to only a small handful of plausible options. Our counting model will be much worse at first, but the direction is what matters.
        </Paragraph>
        <Callout variant="insight" title="From Surprise to Loss">
          <Paragraph>
            Picture the setup: you're predicting English one character at a time. Before the next character arrives, your model has to place a bet—one probability for each possible character.
          </Paragraph>
          <Paragraph>
            Then reality reveals the next character, and you look up what probability you gave it. Shannon's move was to treat that as <Highlight>information</Highlight>—low probability on what actually happened should feel like high surprise.
          </Paragraph>
          <Paragraph>
            A perfect predictor knows exactly what's coming. It assigns probability 1.0 to the actual next character. Zero surprise. A model that doesn't know what's coming tends to assign small probability to the truth. The surprise shoots up as <Term>p</Term> gets close to zero. (And if you ever assign <Term>p=0</Term> to the truth, the surprise is infinite.)
          </Paragraph>
        </Callout>
        <WorkedExample title="A receipt for one character">
          <WorkedStep n="1">
            <p>Take the phrase "the cat sat on the mat". Look at every time the character <Term>t</Term> appears, and count what comes immediately after it.</p>
            <WorkedNote>In this phrase, 't' appears 5 times: "<strong>t</strong>he", "ca<strong>t</strong>", "sa<strong>t</strong>", "<strong>t</strong>he", "ma<strong>t</strong>".</WorkedNote>
          </WorkedStep>
          <WorkedStep n="2">
            <p>In this text, <Term>t</Term> is followed by another character <strong>5</strong> times. In <strong>2</strong> of those, the next character is <Term>h</Term>.</p>
            <WorkedNote>The transitions: t→h (the), t→␣ (cat), t→␣ (sat), t→h (the), t→[end] (mat).</WorkedNote>
          </WorkedStep>
          <WorkedStep n="3" final>
            <p>So <Term>P(next='h' | 't')</Term> = <strong>2/5 = 0.40</strong>, and the surprise is <strong>-log₂(0.40) ≈ 1.32 bits</strong>.</p>
            <WorkedNote>This is the pipeline: counts → probability → bits. "th" is common in English, so seeing 'h' after 't' isn't that surprising—about 1.3 bits.</WorkedNote>
          </WorkedStep>
        </WorkedExample>
        <Callout variant="info" title="Why Logs?">
          <Paragraph>
            We’re going to score entire sequences, not just one next‑character guess. Sequence probability is a product (one “of those” after another), but we’d rather work with sums than with tiny products. Logs are the translation layer: <Term>log(a × b) = log(a) + log(b)</Term>.
          </Paragraph>
          <Paragraph>
            This is why we define <Term>surprise = -log₂(p)</Term>: per‑token surprises add. (If you use <Term>ln</Term> instead of <Term>log₂</Term>, you just change units; the additivity is the point.)
          </Paragraph>
          <Paragraph>
            There’s also a ruthlessly practical reason: <strong>numerical stability</strong>. Probabilities vanish fast. Multiply <Term>0.1</Term> a hundred times and you get 10<sup>-100</sup>. Push that a few hundred tokens and float64 underflows to zero. In log‑space, that same number is just <Term>-100</Term> (base‑10) — a totally normal value you can keep adding to. Tiny concrete example: <Term>0.2 × 0.25 × 0.2 = 0.01</Term>, and <Term>log₁₀(0.2) + log₁₀(0.25) + log₁₀(0.2) ≈ -2</Term>.
          </Paragraph>
        </Callout>
        <MathBlock
          equation="P(\text{event}) \in [0, 1]"
          explanation="Probability lives between 0 (impossible, you'd have a heart attack) and 1 (certain, you'd be bored)."
        />
        <Paragraph>
          Here's the thing that makes probability actually useful: if you list out <em>every possible thing that could happen</em>, those probabilities <Highlight>must add up to exactly 1</Highlight>.
        </Paragraph>
        <Paragraph>
          This isn't a constraint we impose—it's the <Highlight>definition</Highlight> of a complete set of mutually exclusive outcomes. If you're certain <em>something</em> happens, and exactly one thing can happen, then the total certainty must be 100%. The universe doesn't allow "50% chance of heads, 50% chance of tails, and also 30% chance the coin vanishes into the shadow realm." That's 130%—you've claimed more certainty than exists.
        </Paragraph>
        <Paragraph>
          This is why we talk about <Term>probability mass</Term>—you have exactly 1 unit of certainty to distribute across all possibilities. High probability on one outcome means less mass left for the others. It's conservation of certainty.
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
          We've mastered the single character. But language isn't just one character; it's a stream. The word "cat" isn't one event—it's three events happening in a row: first <Term>c</Term>, then <Term>a</Term>, then <Term>t</Term>.
        </Paragraph>
        <Paragraph>
          To build a language model, we need to answer a harder question: how likely is that <em>entire chain</em> of events?
        </Paragraph>
        <Paragraph>
          Mathematicians call this <Highlight>joint probability</Highlight>. It asks: what are the odds of all these things happening, in this specific order, all at once?
        </Paragraph>
        <MathBlock
          equation="P(x_1, x_2, x_3, \ldots, x_t)"
          explanation={`"The probability of sequence x₁...xt existing"`}
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
          Let's try to solve it from first principles, with infinite resources.
        </Paragraph>
        <Paragraph>
          If you had unlimited storage, you'd build an index where <em>the entire sequence</em> is the key. The model would be a giant dictionary: exact string in, probability out.
        </Paragraph>
        <CodeBlock filename="lookup_table.json">{`{
  "the cat sat": 1,
  "the dog sat": 1,
  "the cat ate": 1
}`}</CodeBlock>
        <Paragraph>
          This is brute force memorization. You treat "the cat sat" as one atomic event. You don't learn that <Term>cat</Term> often follows <Term>the</Term>. You just store <Term>the-cat-sat</Term> as a single unbreakable block.
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
        <Paragraph>
          If you prefer words: the same thing happens, only harsher, because the word vocabulary is enormous. A word-level bigram model is just “a graph of transitions,” and it still has no mechanism for sharing knowledge between different nouns:
        </Paragraph>
        <NgramGraphViz />

        <Paragraph>
          But wait—<em>why</em> should we expect "the cat" to help predict "the dog"? Because humans generalize based on <strong>syntactic role</strong>: both "cat" and "dog" are nouns that appear after an article. They serve the same grammatical function. Counting models have no notion of "role"—they only match exact strings. This is the fundamental limitation we're building toward fixing. (Spoiler: embeddings in Chapter 2 will encode these roles as geometric relationships.)
        </Paragraph>
      </Section>

      {/* Section 1.1.3 */}
      <Section number="1.1.3" title="Why This Happens">
          <Paragraph>
            The reason your corpus can never cover enough sequences is pure combinatorics. The space of possible sequences <Highlight>explodes exponentially</Highlight> with length:
          </Paragraph>
          <Paragraph>
            <em>Drag the slider and feel the combinatorics tax: a small increase in length multiplies the space astronomically.</em>
          </Paragraph>
          <ExplosionDemo />

          <Paragraph>
            Slide that to N=10 and watch what happens. With just 27 characters, you get <strong>205 trillion</strong> possible
            10-character sequences. Your training corpus—no matter how large—is a speck compared to that space.
          </Paragraph>
          <Paragraph>
            It's tempting to think this problem goes away at the word level because words come from a fixed dictionary. And
            yes: the token set is finite.
          </Paragraph>
        <Paragraph>
          But the combinatorics is still exponential. The number of length-T sequences is <MathInline equation={String.raw`|V|^T`} />, where <Term>|V|</Term> is your vocabulary size. For a typical word vocabulary of 50,000 tokens, the number of
          possible 10-word sequences is <MathInline equation={String.raw`50{,}000^{10}`} />—around <strong>10^{47}</strong>. Astronomical.
        </Paragraph>
          <Paragraph>
            Also, not all of those sequences are valid English. The problem is that the set of <em>valid</em> sequences is
            still enormous, and a counting/lookup model has no way to assign reasonable probability to sequences it never
            saw. It just says <Term>P = 0</Term>.
          </Paragraph>

          <Callout variant="info" title="Geometric Intuition">
            <Paragraph>
              Imagine you're standing in a library so large it's effectively infinite. Every possible text exists here, somewhere. Your training data is a flashlight — it illuminates a tiny region. The sequences you've seen are the books you can read. Everything else is darkness.
            </Paragraph>
            <Paragraph>
              Now here's the problem: there aren't enough cabinets. A 10-character sequence in a 27-character alphabet? That's 205 trillion filing cabinets. Your training data is a speck. You'll never fill them. The warehouse is 99.9999% empty shelves.
            </Paragraph>
          </Callout>

          <Callout variant="warning" title="Why Lookup Tables Don't Scale">
            <Paragraph>
              Where does this huge number come from? It's the number of options multiplied across each position:
            </Paragraph>
            <MathBlock
              equation="\underbrace{27}_{\text{char 1}} \times \underbrace{27}_{\text{char 2}} \times \dots \times \underbrace{27}_{\text{char 100}} = 27^{100}"
              explanation="For a paragraph of 100 characters, you have 27 choices at every single step. Multiplication, not addition — because each choice at position 1 can pair with any of 27 at position 2."
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

          <Callout variant="insight" title="The Warehouse Is Empty">
            <Paragraph>
              Think of your brain as a warehouse. Every time you read a new sentence, you need a filing cabinet for that exact sequence. "The cat sat"? Cabinet #47,203. "The dog sat"? Completely different address: Cabinet #89,441. Same verb, same structure, but the warehouse doesn't know they're related. It just knows: different string, different cabinet.
            </Paragraph>
          </Callout>

		          <Paragraph>
		            The counting approach is still just a giant lookup table—same idea as before, just scaled up. To this naive model, "cat" and "dog" are just symbols. <Term>"the cat sat"</Term> and <Term>"the dog sat"</Term> are different keys. Learning one doesn't automatically change the other, because the model has no way to share information between keys. It's a phone book: entries don't talk to each other.
		          </Paragraph>

	        <Paragraph>
	          So if we want to compute probabilities from real, finite data, we need to stop treating whole sequences as one
	          giant key.
	        </Paragraph>
	        <Paragraph>
	          The solution is <Highlight>decomposition</Highlight>—break the joint probability into smaller, learnable pieces.
	        </Paragraph>
	        <Paragraph>
	          These smaller pieces rely on the <Term>Markov Assumption</Term>: the idea that the probability of the next character depends only on a small window of recent history, not the entire history of the universe.
	        </Paragraph>
        <Paragraph>
          This is the trade the Markov assumption is making: you pick a window and pretend the world outside that window
          doesn't matter.
        </Paragraph>
        <Paragraph>
          In other words, an n-gram model comes with a built-in <Term>context length</Term>. With <Term>n=2</Term>, you only
          look at the last 1 token. With <Term>n=5</Term>, you only look at the last 4 tokens. Everything earlier is
          invisible.
        </Paragraph>
        <Paragraph>
          What dies when you truncate context is whatever requires looking farther back.
        </Paragraph>
        <Paragraph>
          Example sentence:
        </Paragraph>
        <CodeBlock filename="sentence.txt">{`The keys to the cabinet in the hallway are missing.`}</CodeBlock>
        <Paragraph>
          Suppose we're trying to predict the next word right before <Term>are</Term>.
        </Paragraph>
        <ul>
          <li><strong>n = 2:</strong> the model sees <Term>"hallway"</Term>. It has no idea if the subject was <Term>key</Term> or <Term>keys</Term>.</li>
          <li><strong>n = 5:</strong> it sees <Term>"cabinet in the hallway"</Term>. Still no subject.</li>
          <li><strong>n = 8:</strong> it finally sees <Term>"keys to the cabinet in the hallway"</Term>, and now <Term>are</Term> makes sense.</li>
        </ul>
        <Paragraph>
          Longer context helps. But longer context also creates more possible contexts, which brings sparsity roaring back:
          there are fewer repeats to learn from. This is the constant tension in language modeling: memory versus data.
        </Paragraph>
        <Paragraph>
          We call these pieces <Term>n-grams</Term>. An n-gram is just a chunk of n consecutive characters:
        </Paragraph>
        <NgramExamples />
        <Paragraph>
          An <Term>n-gram model</Term> is what happens when you pick a specific <Term>n</Term> and commit. If <Term>n=3</Term> (a trigram model), you predict the next character using only the last <Term>2</Term> characters. If <Term>n=2</Term> (a bigram model), you only look at the last <Term>1</Term>.
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
            <Term>the next morning</Term> shows up only <strong>9</strong> times, but the suffix <Term>ing</Term> shows up <strong>3,960</strong> times. Nothing magical happened—we stopped matching a whole phrase and started counting
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
          In symbols, this becomes the chain rule product. Each factor is one “survival fraction”: <em>given</em> the first
          <Term>k</Term> characters, what fraction of the remaining corpus survives one more character? Multiply those survival
          fractions and you get the final fraction that survives all the way to the full sequence.
        </Paragraph>
        <Paragraph>
          Here's the same thing from first principles. Imagine starting with 1,000 equally likely worlds.
        </Paragraph>
        <Paragraph>
          First, filter for event <Term>A</Term>. Say it happens in 200 of them. That's <Term>200/1000 = 0.2</Term>.
        </Paragraph>
        <Paragraph>
          Now, <em>throw away the other 800 worlds</em>. We are currently standing in the 200 "A-worlds."
        </Paragraph>
        <Paragraph>
          Next, filter for event <Term>B</Term>. Inside this smaller pile, maybe B happens in 50 of them. That fraction is <Term>50/200 = 0.25</Term>.
        </Paragraph>
        <Paragraph>
          Finally, filter for <Term>C</Term>. Among those 50 surviving worlds, C happens in 10. That's <Term>10/50 = 0.2</Term>.
        </Paragraph>
        <Paragraph>
          How many worlds survived all three filters? 10 out of the original 1,000. That's <Term>0.01</Term>. And the math tracks the filters exactly: <Term>0.2 × 0.25 × 0.2 = 0.01</Term>. Multiplication is just repeated filtering.
        </Paragraph>
        <Paragraph>
          That decomposition has a name: the <Highlight>chain rule of probability</Highlight>. But before we write it down formally, we need to make one concept precise: what exactly do we mean by "the fraction that continues with 'a', given we're already at 'c'"?
        </Paragraph>
      </Section>

      {/* Section 1.1.4 */}
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
        <ConditioningShiftViz />
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
        <Callout variant="info" title="A Running Mini-Corpus">
          <Paragraph>
            Let's use one tiny dataset for the next few ideas. Six little sentences:
          </Paragraph>
          <CorpusDisplay sentences={['"the next morning"', '"the next day"', '"the next time"', '"the next morning"', '"the last day"', '"a new day"']} />
          <Paragraph>
            Now the question "what usually comes next?" turns into arithmetic.
          </Paragraph>
          <CodeBlock lang="text">{`C("the next") = 4
C("the next morning") = 2

P(morning | the next) ≈ 2/4 = 0.50`}</CodeBlock>
          <Paragraph>
            Read that as: out of the times we saw <Term>the next</Term>, half the time the next word was <Term>morning</Term>.
          </Paragraph>
        </Callout>
        <Paragraph>
          When you multiply these "next given history" fractions across the whole sequence, the denominators cancel. You end up right back at the naive formula from the previous section:
        </Paragraph>
        <MathBlock
          equation={String.raw`\begin{aligned}
P(x_{1:T}) &\approx \frac{C(x_1)}{N}\cdot\frac{C(x_{1:2})}{C(x_1)}\cdot\frac{C(x_{1:3})}{C(x_{1:2})}\cdots\frac{C(x_{1:T})}{C(x_{1:T-1})} \\
&= \frac{C(x_{1:T})}{N}
\end{aligned}`}
          explanation="If you expand it, the intermediate prefix counts cancel. This telescopes down to the full-sequence count."
        />
        <Callout variant="info" title="Telescoping, With The Same Example">
          <Paragraph>
            Using that mini-corpus, what's <Term>P("the next morning")</Term>?
          </Paragraph>
          <MathBlock equation={String.raw`\begin{aligned}
P({\small\text{"the next morning"}}) &= P({\small\text{the}}) \times P({\small\text{next}} \mid {\small\text{the}}) \times P({\small\text{morning}} \mid {\small\text{the next}}) \\[6pt]
&\approx \frac{5}{6} \times \frac{4}{5} \times \frac{2}{4} \;=\; \frac{2}{6} \;=\; \frac{C({\small\text{"the next morning"}})}{N}
\end{aligned}`} />
          <Paragraph>
            Look at the 5: it's the denominator of 5/6 and the numerator of 4/5. Both are C("the"). The 4 is C("the next") — denominator of one fraction, numerator of the next. Each prefix count appears exactly twice and cancels. That's telescoping.
          </Paragraph>
        </Callout>
        <Paragraph>
          So why isn't this the whole story? Because the "context" <Term>x₁…xₜ₋₁</Term> is still basically the whole sentence. Most long prefixes appear once, or never.
        </Paragraph>

        <Paragraph>
          That's the intuition. If you're curious why the math works out this way, expand below—it's actually pretty satisfying to see the corridor metaphor fall directly out of the definitions.
        </Paragraph>

        <FormalRigor
          title="The Math Behind the Corridor"
          audienceNote="Curious? Here's why it works"
        >
          <Paragraph>
            That corridor metaphor isn't just a teaching trick—it's what the math actually says. Let's see why.
          </Paragraph>

          <FormalSubSection title="Where does the multiplication come from?">
            <Paragraph>
              Here's the definition that makes everything work. "Probability of B given A" means:
            </Paragraph>
            <MathBlock
              equation={String.raw`P(B \mid A) = \frac{P(\text{both A and B happen})}{P(\text{A happens})}`}
              explanation="Translation: of all the times A happened, what fraction also had B?"
            />
            <Paragraph>
              Now watch what happens when you multiply both sides by P(A):
            </Paragraph>
            <MathBlock
              equation={String.raw`P(\text{A and B}) = P(A) \times P(B \mid A)`}
              explanation="This is literally 'fraction that start with A' times 'fraction of those that continue with B'. That's the corridor!"
            />
            <Paragraph>
              The multiplication isn't a trick we invented. It falls straight out of what "given" means.
            </Paragraph>
          </FormalSubSection>

          <FormalSubSection title="Why does it work for any number of events?">
            <Paragraph>
              Same logic, applied repeatedly. For three events:
            </Paragraph>
            <MathBlock
              equation={String.raw`\begin{aligned}
P(\text{A, B, C}) &= P(\text{A, B}) \times P(C \mid \text{A, B}) \\
&= P(A) \times P(B \mid A) \times P(C \mid \text{A, B})
\end{aligned}`}
              explanation="First shrink to 'A and B happened'. Then shrink again to 'C also happened'."
            />
            <Paragraph>
              You can keep going forever. Each new event just adds another "of those" to the chain. The pattern holds because we're just applying the same two-event rule over and over.
            </Paragraph>
          </FormalSubSection>

          <FormalSubSection title="The zero problem (and why smoothing exists)">
            <Callout variant="warning" title="What happens when P(context) = 0?">
              <Paragraph>
                Look at that fraction again: P(B|A) = P(A and B) / P(A). What if P(A) = 0? You're dividing by zero. The answer isn't "zero"—it's <em>undefined</em>. The question doesn't make sense.
              </Paragraph>
              <Paragraph>
                This is why smoothing exists. When you've never seen a context before, you can't compute what comes next by counting—you need a backup plan:
              </Paragraph>
              <ul>
                <li><strong>Pretend you saw everything once:</strong> Add a small count to every possibility (add-k smoothing)</li>
                <li><strong>Use a shorter context:</strong> "xyzzy" not in your data? Try "yzzy" (backoff)</li>
                <li><strong>Mix multiple strategies:</strong> Blend estimates from different context lengths (interpolation)</li>
              </ul>
              <Paragraph>
                Section 1.1.7 covers these. The point here: smoothing isn't a hack—it's how you handle a mathematically undefined situation.
              </Paragraph>
            </Callout>
          </FormalSubSection>

          <FormalSubSection title="What counts as 'possible'?">
            <Paragraph>
              One hidden assumption: when we compute P(A), we're asking "what fraction of <em>what</em>?" The answer depends on what universe we're measuring.
            </Paragraph>
            <Paragraph>
              In language modeling, our universe is "all possible texts." Every sentence in your training corpus is one sample from this universe. When you count C("cat") / N, you're estimating what fraction of all possible texts contain "cat" at that position.
            </Paragraph>
            <Paragraph>
              <strong>Why this matters in practice:</strong> If you train on Wikipedia, your probabilities reflect Wikipedia-speak. Mix in Twitter, and you get a different universe with different probabilities. The proportions you choose when mixing corpora directly affect every P(next | context) you compute.
            </Paragraph>
          </FormalSubSection>

          <Citations
            items={[
              {
                n: 1,
                href: 'https://web.stanford.edu/~jurafsky/slp3/3.pdf',
                label: 'Jurafsky & Martin — SLP3 Ch. 3: N-gram Language Models',
              },
              {
                n: 2,
                href: 'https://en.wikipedia.org/wiki/Chain_rule_(probability)',
                label: 'Wikipedia — Chain Rule (Probability)',
              },
            ]}
          />
        </FormalRigor>
      </Section>

      {/* Section 1.1.6 */}
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
        <Callout variant="insight" title="We Just Built a Markov Chain">
          <Paragraph>
            That table we built—"given <Term>c</Term>, next is …"—<em>is</em> the model. When you call <code>P(a | c)</code>, the function looks up the row for <Term>c</Term>, finds the column for <Term>a</Term>, and returns the count. That lookup is the entire inference step.
          </Paragraph>
          <Paragraph>
            In an n-gram model, the <Highlight>state</Highlight> is the recent context (the last <Term>n-1</Term> tokens), and the <Highlight>edges</Highlight> are the probabilities of what comes next.
          </Paragraph>
          <ul>
            <li><strong>State:</strong> a context like <Term>…he</Term> or <Term>the cat</Term></li>
            <li><strong>Transition:</strong> choose a next token using <Term>P(next | state)</Term></li>
            <li><strong>Path:</strong> a generated sequence is a walk through the graph</li>
          </ul>
        </Callout>
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
        <Callout variant="warning" title="Engineering Reality Check">
          <Paragraph>
            Run the numbers on just those two "tiny" costs:
          </Paragraph>
          <MathBlock
            equation={String.raw`10^{11} \times (8 + 16)\,\text{bytes} = 2.4\times 10^{12}\,\text{bytes} \approx 2.4\,\text{TB}`}
            explanation="That's pointer + allocator overhead only (not keys, probabilities, hash buckets, or load-factor padding)."
          />
          <Paragraph>
            The metadata eats your RAM before the probabilities even get a chance.
          </Paragraph>
        </Callout>
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
          Quick clarification: KenLM is token‑agnostic. In practice it’s usually trained on <strong>words</strong> (that’s what classic speech recognition decoders wanted), but if you feed it <strong>characters</strong> as tokens, it becomes a character n‑gram model.
        </Paragraph>
        <Paragraph>
          In this chapter we’ll use words when it helps readability, and characters when we want a tiny vocabulary. Same probability math, different Lego size.
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
          This turns a graph traversal into a constant-time memory lookup. It's cache-friendly, pointer-free, and insanely fast. Following a pointer means random memory access—a cache miss costs ~100 cycles; sequential array access hits L1 cache at ~1 cycle. At millions of lookups per second, this 100× difference dominates.
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
        <WorkedExample title="A tiny hash that cares about order">
          <WorkedStep n="1">
            <p>Pick a toy hash rule: start with <code>h = 0</code>. For each character, update</p>
            <MathBlock equation={String.raw`h \leftarrow (h \cdot 31 + \text{code}(\text{char})) \bmod 97`} />
            <WorkedNote>
              This is not what KenLM uses — it’s just an easy example. The important part is the <code>h · 31</code>: earlier characters get
              multiplied (different “place value”).
            </WorkedNote>
          </WorkedStep>
          <WorkedStep n="2">
            <p>Now compute <code>Hash(&quot;ab&quot;)</code>. Use <code>code(a)=1</code>, <code>code(b)=2</code>:</p>
            <WorkedNote>
              Start <code>h=0</code>. After <code>a</code>: <code>h=(0·31+1)=1</code>. After <code>b</code>: <code>h=(1·31+2)=33</code>.
            </WorkedNote>
          </WorkedStep>
          <WorkedStep n="3" final>
            <p>Compute <code>Hash(&quot;ba&quot;)</code> with the same codes:</p>
            <WorkedNote>
              Start <code>h=0</code>. After <code>b</code>: <code>h=(0·31+2)=2</code>. After <code>a</code>: <code>h=(2·31+1)=63</code>.
              So <code>Hash(&quot;ab&quot;)=33</code> but <code>Hash(&quot;ba&quot;)=63</code>.
            </WorkedNote>
          </WorkedStep>
        </WorkedExample>
        <Paragraph>
          That’s what “mixing based on position” means: the same characters contribute differently depending on where they appear. Real hash functions do much more aggressive bit‑mixing than this, but they’re built on the same idea: <em>each step depends on the previous state</em>, so swapping order changes the whole trajectory.
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
        <Paragraph>
          The demo below shows a <Term>Beam Search</Term>. Watch the "LM lookups" counter. Even for a tiny 3-word sentence with a narrow beam, we are asking the model for probabilities constantly. KenLM made this loop viable for real-world products.
        </Paragraph>
        <DecoderDemo />
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
          To compare language models, we need a score that tells us: <em>how surprised is the model by real text?</em>
          Surprises are where the learning signal lives.
        </Paragraph>
        <Paragraph>
          If the correct next token happens, and the model assigned it probability <Term>p</Term>, then lower <Term>p</Term> should mean “more surprise.” A handy way to measure that is in <strong>bits</strong>:
        </Paragraph>
        <MathBlock
          equation={String.raw`p=\frac{1}{2}\Rightarrow 1\text{ bit}\qquad p=\frac{1}{4}\Rightarrow 2\text{ bits}\qquad p=\frac{1}{8}\Rightarrow 3\text{ bits}`}
        />
        <Paragraph>
          In general:
        </Paragraph>
        <MathBlock equation={String.raw`\text{surprise}(p) = -\log_2(p)`} />
        <Paragraph>
          Now average that surprise across a long held-out string, and you get <Term>average surprise</Term> (also called <Term>cross-entropy</Term>). Finally, convert it back into “effective number of choices”:
        </Paragraph>
        <MathBlock equation={String.raw`\text{perplexity} = 2^{\text{average surprise}}`} />
        <Paragraph>
          Tiny example: suppose over two steps the model assigns the correct next token probabilities <Term>0.5</Term> and <Term>0.25</Term>. The surprises are <Term>1</Term> bit and <Term>2</Term> bits, so the average is <MathInline equation={String.raw`\frac{1 + 2}{2} = 1.5`} /> bits/token. Perplexity is <MathInline equation={String.raw`2^{1.5}`} /> ≈ <Term>2.83</Term>—about “three plausible options” on average.
        </Paragraph>
        <Paragraph>
          One annoying detail: raw counts love to assign <Term>p = 0</Term> to unseen n-grams. That makes surprise infinite,
          and it blows up perplexity. So practical n-gram models use <Highlight>smoothing</Highlight>: discount a little
          probability mass from the seen stuff and use it to give the unseen stuff a non-zero floor, usually by backing off
          to shorter contexts.
        </Paragraph>
        <Paragraph>
          <Term>Kneser–Ney</Term> is a famous smoothing scheme that does something subtle in the backoff distribution: it
          treats a word as “more generally likely” if it appears after <em>many different contexts</em>, not just if it has a
          big raw count. “Francisco” can be frequent but mostly follow “San.” Meanwhile “the” shows up after everything.
          Kneser–Ney tries to capture that difference.
        </Paragraph>
        <Paragraph>
          With smoothing in place, you can get real benchmark numbers. On the One Billion Word Benchmark, an unpruned <Term>Kneser–Ney 5-gram</Term> lands around <strong>perplexity 67.6</strong>. That's miles better than random
          guessing, but still far from Shannon's ~1.3 bits/character estimate for English. That gap isn't a software bug—it's
          the limit of counting without sharing.
        </Paragraph>
        <Paragraph>
          Important: you measure this on <strong>held-out text</strong> (test data). On its own training data, a counting
          model can look amazing because it literally memorized exact contexts. Held-out text is where the warehouse
          emptiness shows up as a number.
        </Paragraph>
        <Paragraph>
          Rough timeline:
        </Paragraph>
        <ul>
          <li><strong>1990s → early 2010s:</strong> n-grams (often 3–5 grams) were the default language model inside many production decoders for speech recognition and statistical machine translation.</li>
          <li><strong>Early 2000s:</strong> neural language models show up on paper, but they're too slow to be the thing you query millions of times inside a decoder. <Cite n={5} /></li>
          <li><strong>2010s:</strong> faster neural LMs and neural machine translation start taking over new systems.</li>
          <li><strong>Late 2010s:</strong> Transformers make neural language models the default for general-purpose text generation.</li>
        </ul>
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
        <Paragraph>
          Why does character-level help? At the word level, 'cat' and 'dog' share <em>zero</em> structure. They're atomic—unrelated keys in the lookup table. But decompose them into characters and overlap appears everywhere. Both end in consonants. Both follow similar phonetic patterns (CVC structure). The space character appears after <em>every</em> word, creating a universal hub node with stable statistics. When you've seen space→s 10,000 times across thousands of different words, that probability estimate is rock solid. Character-level models exploit this: they recombine fragments that actually repeat, rather than waiting to see exact word pairs.
        </Paragraph>
        <SparseMarkovViz />
        <Paragraph>
          This is the <Term>Sparsity Problem</Term>. Language is combinatorial; you will never see every valid two-word combination, no matter how much text you read.
        </Paragraph>
        <Callout variant="info" title="The Zero-Probability Problem">
          <Paragraph>
            <strong>The problem:</strong> In a pure counting model, an unseen next token gets probability 0. That sounds fine until you remember the cross-entropy formula:
          </Paragraph>
          <MathBlock equation={String.raw`H = -\frac{1}{N} \sum \log_2 P(x_i)`} />
          <Paragraph>
            The moment <em>any</em> <Term>P(xᵢ) = 0</Term>, you're computing <Term>-log(0) = ∞</Term>. One unseen bigram and your entire score explodes. That's not a useful metric.
          </Paragraph>
          <Paragraph>
            <strong>The fix:</strong> <Term>Add-k smoothing</Term> pretends you saw every possible next token <Term>k</Term> extra times. It keeps the score finite—though it doesn't make the model any smarter about what it hasn't seen.
          </Paragraph>
        </Callout>
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
        <Exercise
          number="1.1"
          title="Perplexity + Smoothing by Hand"
          hint={
            <>
              <Paragraph>
                For a bigram model, you score a test string by predicting every character from the one before it. So a length-4 string gives you <Term>N = 3</Term> predictions.
              </Paragraph>
              <Paragraph>
                Add-1 smoothing (k=1) looks like:<br />
                <code>P(x | c) = (count(c→x) + 1) / (count(c) + V)</code>
              </Paragraph>
            </>
          }
          solution={
            <>
              <Paragraph>
                <strong>Training corpus:</strong> <Term>"aba"</Term>
              </Paragraph>
              <Paragraph>Bigram counts:</Paragraph>
              <CodeBlock lang="text">{`a→b: 1
b→a: 1
a→a: 0
b→b: 0`}</CodeBlock>
              <Paragraph>Unsmoothed probabilities:</Paragraph>
              <CodeBlock lang="text">{`P(b|a) = 1/1 = 1
P(a|b) = 1/1 = 1
P(a|a) = 0/1 = 0`}</CodeBlock>
              <Paragraph>
                <strong>Test string:</strong> <Term>"aaaa"</Term> has three bigrams: <Term>a→a</Term>, <Term>a→a</Term>, <Term>a→a</Term>. The first one already hits <Term>P(a|a)=0</Term>, so:
              </Paragraph>
              <CodeBlock lang="text">{`H = - (1/3) * (log2 0 + log2 0 + log2 0) = ∞`}</CodeBlock>
              <MathBlock equation={String.raw`\text{perplexity} = 2^{H} = \infty`} />
              <Paragraph>
                Now add-1 smoothing with vocabulary <Term>V = 2</Term> (just <Term>a</Term> and <Term>b</Term>).
              </Paragraph>
              <Paragraph>
                For context <Term>a</Term>, the denominator is <Term>count(a) + V = 1 + 2 = 3</Term>:
              </Paragraph>
              <CodeBlock lang="text">{`P(a|a) = (0 + 1) / 3 = 1/3
P(b|a) = (1 + 1) / 3 = 2/3`}</CodeBlock>
              <Paragraph>
                With smoothing, every step in <Term>"aaaa"</Term> has probability <Term>1/3</Term>, so:
              </Paragraph>
              <CodeBlock lang="text">{`H = - (1/3) * (log2(1/3) + log2(1/3) + log2(1/3))
  = -log2(1/3)
  = log2(3)
  ≈ 1.585 bits/char`}</CodeBlock>
              <MathBlock equation={String.raw`\text{perplexity} = 2^{H} = 3`} />
              <Paragraph>
                Smoothing didn't make the model smarter. It just made the score finite by refusing to say "impossible."
              </Paragraph>
            </>
          }
        >
          <Paragraph>
            Train a <strong>bigram character model</strong> on the tiny corpus <Term>"aba"</Term>. Your vocabulary is just <Term>{'{a, b}'}</Term> (so <Term>V = 2</Term>).
          </Paragraph>
          <ol>
            <li>Write down the bigram counts (a→a, a→b, b→a, b→b).</li>
            <li>Without smoothing, what's the perplexity on the test string <Term>"aaaa"</Term>?</li>
            <li>Now apply add-1 smoothing. What's the new perplexity?</li>
          </ol>
        </Exercise>
        <Citations
          title="Perplexity & Smoothing"
          items={[
            {
              n: 1,
              href: 'https://arxiv.org/abs/1312.3005',
              label: 'Chelba et al. (2013) — One Billion Word Benchmark for Measuring Progress in Statistical Language Modeling',
            },
            {
              n: 2,
              href: 'https://aclanthology.org/P96-1041.pdf',
              label: 'Chen & Goodman (1996) — An Empirical Study of Smoothing Techniques for Language Modeling',
            },
            {
              n: 3,
              href: 'https://www-i6.informatik.rwth-aachen.de/publications/download/951/Kneser-ICASSP-95.pdf',
              label: 'Kneser & Ney (1995) — Improved Backing-Off for M-gram Language Modeling',
            },
          ]}
        />
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
        <Callout variant="insight" title="This Becomes the Training Objective">
          <p>This formula <em>is</em> the training objective. When we train a language model, we're minimizing cross-entropy—which is just minimizing average surprise.</p>
          <p>The loop is: predict, measure surprise, adjust the model so the next time it assigns more probability to what actually happens.</p>
          <p>For our character-level model with 27 possible characters, random guessing gives <Term>log₂(27) ≈ 4.75 bits</Term> per character. That's the baseline—pure ignorance. A trained model should do better.</p>
        </Callout>
        <Callout variant="info" title="The Training Objective">
          <p>This is the core intuition. The model's job is to <Highlight>assign high probability to the correct next token</Highlight>.</p>
          <p>If the real text is "cat", the model sees "c" and should put most of its probability mass on "a". Then it sees "ca" and should put most of the mass on "t".</p>
          <p>By maximizing the probability of the <em>correct</em> token at every step, the model implicitly maximizes the probability of the entire real sequence. This is why training looks like "next token prediction"—and in stats terms, it's maximum likelihood.</p>
        </Callout>
      </Section>

      {/* Section 1.2 */}
      <Section number="1.2" title="The Actual Meat Grinder: Tokenization">
        <Callout variant="info" title="A Quick Expectations Reset">
          <Paragraph>
            This section is intentionally unglamorous: the translation layer that turns raw text into integers a model can learn from.
          </Paragraph>
          <Paragraph>
            If you've ever wondered what "training data" looks like right before it hits the model, it's basically this.
          </Paragraph>
          <ul>
            <li><strong>Input:</strong> a string of text</li>
            <li><strong>Output:</strong> integer tokens, plus (context → target) training pairs</li>
          </ul>
        </Callout>
        <Paragraph>
          Before we touch code, let's pin down what we already earned in Section 1.1:
        </Paragraph>
        <ul>
          <li><strong>Probabilities are distributions:</strong> they describe a spread over options, and they sum to 1.</li>
          <li><strong>Conditioning is filtering:</strong> <Term>P(X | Y)</Term> means "only count the worlds where Y happened."</li>
          <li><strong>Sequences decompose:</strong> the chain rule turns a sequence probability into a product of next-token probabilities.</li>
          <li><strong>Logs measure surprise:</strong> <Term>-log₂(p)</Term> turns tiny probabilities into manageable numbers, and averages give us entropy / perplexity.</li>
          <li><strong>Counting doesn't generalize:</strong> exact-match tables hit sparsity and have no way to share information between similar contexts.</li>
        </ul>
        <Paragraph>
          By the end of this chapter, you'll build the pipeline that turns raw text into the thing a model can actually train on:
        </Paragraph>
        <ul>
          <li><strong>Vocabulary:</strong> collect the unique tokens and assign each an integer ID (<Term>stoi</Term>/<Term>itos</Term>).</li>
          <li><strong>Encode / decode:</strong> convert text ↔ IDs so we can move between human strings and model numbers.</li>
          <li><strong>Sliding window:</strong> generate (context → target) training pairs with a chosen context length.</li>
        </ul>
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
          The obvious first instinct is to tokenize <em>words</em>—that's how humans read. But word-level models hit immediate pain: vocabularies of 50,000+ entries, unknown words (OOV) everywhere, and most word-contexts never repeat in training data. The sparsity problem from <SectionLink to="1.1">Section 1.1</SectionLink> hits even harder.
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
          The model is going to store everything in arrays: tables of numbers. Arrays don’t have a slot called <Term>'h'</Term>. They have a slot called <Term>3</Term>. So we pick an integer ID for every token and stay consistent.
        </Paragraph>
        <Paragraph>
          That assignment is the whole “code” in this chapter: a reversible mapping between symbols and integer IDs. Our two tiny maps are <Term>stoi</Term> (string → int) and <Term>itos</Term> (int → string).
        </Paragraph>
        <Paragraph>
          <strong>Encoding</strong> means: walk through the text and replace each character with its ID using <Term>stoi</Term>.
        </Paragraph>
        <Paragraph>
          <strong>Decoding</strong> means: take IDs, map them back to characters with <Term>itos</Term>, and join them into a string.
        </Paragraph>
        <Paragraph>
          With the mapping above, <Term>hello</Term> becomes <Term>[3, 2, 4, 4, 5]</Term>, and <Term>[3, 2, 4, 4, 5]</Term> becomes <Term>hello</Term>.
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
          We've got text → integers. But simply feeding a stream of numbers isn't enough. We need to structure this data to operationalize the <Highlight>Decomposition Strategy</Highlight> we derived in <SectionLink to="1.1">Section 1.1</SectionLink>.
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
        <Callout variant="insight" title="The Context Window Is The Universe">
          <Paragraph>
            When the context length is 4, the model's "world" is the last 4 characters. Everything before that is gone. That's why n-grams can feel eerily competent locally and still fall apart globally. They're great at tiny neighborhoods.
          </Paragraph>
        </Callout>
        <Callout variant="insight" title="Sampling: Let It Talk">
          <Paragraph>
            Scoring is one side of the coin. The other side is <strong>generation</strong>: pick a starting context, sample a next character, slide the window, repeat.
          </Paragraph>
          <Paragraph>
            That's all this demo is doing under the hood: counts → probabilities → random choice.
          </Paragraph>
        </Callout>
        <Callout variant="info" title="A concrete benchmark">
          <Paragraph>
            With the default training text and <Term>n = 2</Term> (a character bigram model), we get perplexity around <Term>8–12</Term>. Uniform random guessing over 27 characters is perplexity 27.
          </Paragraph>
          <Paragraph>
            This is on the training corpus, so it's a little optimistic. But it pins the scale: with a one-character memory, the "effective number of next-character choices" drops from 27 down to about 10.
          </Paragraph>
        </Callout>
        <WorkedExample title="A tiny perplexity calculation">
          <WorkedStep n="1">
            <p>Suppose we're predicting over a tiny vocabulary, and across four steps the model assigns these probabilities to the correct next character:</p>
            <MathBlock equation={String.raw`p_{\text{true}} = [0.50,\; 0.25,\; 0.25,\; 0.50]`} />
          </WorkedStep>
          <WorkedStep n="2">
            <p>Convert each one to surprise in bits:</p>
            <MathBlock equation={String.raw`\begin{aligned}
-\log_2(0.50) &= 1 \text{ bit} \\
-\log_2(0.25) &= 2 \text{ bits} \\
-\log_2(0.25) &= 2 \text{ bits} \\
-\log_2(0.50) &= 1 \text{ bit}
\end{aligned}`} />
          </WorkedStep>
          <WorkedStep n="3" final>
            <p>Average surprise: <Term>(1 + 2 + 2 + 1) / 4 = 1.5</Term> bits/char.<br />Perplexity: <Term>2<sup>1.5</sup></Term> ≈ <Term>2.83</Term>.</p>
            <WorkedNote>So this model is "about" as confused as if it were choosing among ~3 plausible options at each step.</WorkedNote>
          </WorkedStep>
        </WorkedExample>
        <Paragraph>
          <em>Sample from the n-gram model. Adjust n to see how context length affects output quality.</em>
        </Paragraph>
        <NgramSamplingDemo />
        <Paragraph>
          Try <Term>n = 1</Term>. You'll get letter-frequency-shaped noise. Then try <Term>n = 3</Term> or <Term>n = 5</Term>. The text starts to look more English-like, but <strong>coverage</strong> collapses: the set of contexts you actually observed is tiny compared to the space of contexts that exist. In the lookup panel, try querying a longer context as you increase <Term>n</Term>—you'll start seeing <strong>NOT FOUND</strong> as the default state.
        </Paragraph>
        <Callout variant="warning" title="Challenge: Break It">
          <Paragraph>
            Set n = 5 or 6. In the lookup panel, type any 4-5 character string that seems English-ish but wasn't in the training data:
          </Paragraph>
          <ul>
            <li><Term>xyz</Term> — obviously not there</li>
            <li><Term>frog</Term> — plausible English, but probably not in your corpus</li>
            <li><Term>the q</Term> — common prefix, but "the q" probably never appeared</li>
          </ul>
          <Paragraph>
            "NOT FOUND" becomes the default state surprisingly quickly. That's the limit.
          </Paragraph>
        </Callout>
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
        <Callout variant="info" title="Enforcing the Rules">
          <Paragraph>
            How do we stop the model from cheating? When predicting character 5, you can only look at characters 0–4. If you could see character 5, you'd just copy it. The <Term>Causal Mask</Term> enforces this: position i only sees positions 0 through i−1. Later positions are blocked.
          </Paragraph>
        </Callout>
        <Paragraph>
          <em>Hover the grid to see which positions each token can attend to:</em>
        </Paragraph>
        <CausalMaskViz />
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
      <Section number="1.6" title="The Limit">
        <Callout variant="insight" title="The Generalization Limit">
          <Paragraph>
            We seem to have solved it. We decomposed the problem. We chose the smallest possible atoms (characters). We kept the context short.
          </Paragraph>
          <Paragraph>
            So... why doesn't GPT-4 just use this?
          </Paragraph>
          <Paragraph>
            Because of the math. Even with our "generous" choice of characters (just 27 options) and a modest context length <Term>T</Term>, the space <Highlight>explodes</Highlight>. Each new character position multiplies the number of possible contexts by 27:
          </Paragraph>
          <ul>
            <li><strong>T = 1:</strong> 27 possibilities</li>
            <li><strong>T = 2:</strong> 27 × 27 = 729</li>
            <li><strong>T = 3:</strong> 27 × 27 × 27 = 19,683</li>
          </ul>
          <Paragraph>
            That repeated multiplication is all the exponent means: <Term>27<sup>T</sup></Term> is just "27 choices, repeated T times."
          </Paragraph>
        </Callout>
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
          systems, using <Term>backoff</Term> when a long context is missing. Backoff is a ladder: if P('sat'|'the cat') is undefined (zero count), drop to P('sat'|'cat'), then to P('sat'). The assumption is that shorter contexts are less precise but non-zero—we trade accuracy for coverage. That keeps them usable—but "the cat sat" and "the dog sat" remain separate keys. No count from one helps the other. Sharing requires exact substring match.
        </Paragraph>
        <Paragraph>
          We need a model that doesn't just <em>count</em> history, but <em>compresses</em> it into a learned state—so it can
          carry information forward without needing the exact same context to repeat.
        </Paragraph>
        <Paragraph>
          We'll build that in Chapter 2.
        </Paragraph>
        <Callout variant="warning" title="What Chapter 1 Can't Do (Yet)">
          <Paragraph>
            Counting models have two big problems, and they share the same root cause: everything is too specific.
          </Paragraph>
          <ul>
            <li><strong>Coverage:</strong> most reasonable contexts never appear, so the model has nothing to say (or has to "back off" and guess from shorter contexts).</li>
            <li><strong>Reuse:</strong> what it learns about <Term>"cat sat"</Term> doesn't automatically help with <Term>"dog sat"</Term>. Unless there's literal overlap, knowledge stays trapped.</li>
          </ul>
          <Paragraph>
            Why can't it generalize? A hash table maps exact keys to values. Hash('cat sat') and Hash('dog sat') are unrelated integers—the data structure has no notion of "similar keys," no geometry where keys could be neighbors.
          </Paragraph>
          <Paragraph>
            So we need a representation where similar situations can share information—where learning in one spot spills into its neighbors.
          </Paragraph>
        </Callout>
        <Paragraph>
          That's the idea behind Chapter 2: give tokens <Highlight>coordinates</Highlight> on a map. Then "similar" isn't a string match—it's geometric closeness.
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
          Here's how embeddings solve the sparsity problem. With embeddings, an unseen context like <Term>"the dog"</Term> becomes a <strong>combination</strong> of vectors you've seen: <code>E['t'] + E['h'] + E['e'] + E[' '] + E['d'] + E['o'] + E['g']</code>. You've trained on each of those
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
        <Paragraph>
          These are small, concrete checks that the mechanics are really in your hands—not just on the page.
        </Paragraph>
        <Paragraph>
          You’re about to practice three moves that show up everywhere in language modeling:
        </Paragraph>
        <ul>
          <li><strong>Decompose a sequence:</strong> use the chain rule to turn P(text) into a product of next-token probabilities.</li>
          <li><strong>Handle tokenization edge cases:</strong> decide what “unknown token” means in code.</li>
          <li><strong>Count the data you’re creating:</strong> understand how the sliding window turns one string into many training pairs.</li>
        </ul>
        <Paragraph>
          Before you start, here’s the core pain that pushes us beyond “just count it”: exact-match models love to declare
          perfectly reasonable continuations <Term>impossible</Term> because they weren’t in the training set.
        </Paragraph>
        <GeneralizationGapViz />

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
