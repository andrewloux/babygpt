# BabyGPT Component Library Guide

This document teaches AI agents how to properly use the BabyGPT component library when building educational content about language models.

---

- KEY: Use 'bd' for task tracking.
- RUN `bd quickstart` ASAP to get the lay of the land

## Visual Language (Vizzes + Demos)

We have a visual design system for interactive components. If you touch anything under `src/components/*{Viz,Demo}*.tsx` (or add a new one), follow:

- **Spec:** `docs/visual-language.md`
- **Reference screenshots:** `docs/assets/visual-audit/gold/` and `docs/assets/visual-audit/drift/`

High-level rules (the spec is the source of truth):

- Prefer **semantic colors** (cyan/magenta/yellow/green/red) via CSS variables (`--accent-*`) instead of random hex values.
- Prefer a small **surface palette**:
  - “Figure” vizzes use `VizCard` (`ambient-glow` + `card-glass`).
  - Nested content uses `.panel-dark` / `.inset-box`.
  - “Terminal/window” look should be intentional (copy the header motif from `src/components/CorridorDemo.module.css`; use `--code-bg` only when it’s explicitly an app/demo surface).
- Use tokenized radii/spacing (`--radius-*`, `--space-*`) and shared interaction affordances (`.focus-glow`, `.hover-lift`).
- Avoid “token drift”: don’t introduce new CSS vars unless they’re defined in `src/styles/global.css`.


## Voice & Tone

BabyGPT's writing voice is **humble, clear, and quietly playful**—like a curious friend explaining something interesting, not a guru dispensing wisdom.

### The Goal
Explain complex ideas clearly while keeping things light. The humor should feel natural and self-aware, never forced or preachy.

### DO: Humble & Clear
- Admit when something looks weird: *"This looks weird at first—why isn't Y just one target per example?"*
- Let the content speak for itself: *"Looks scary, says the same thing."*
- Be direct about what matters: *"That's the entire job description."*
- Acknowledge real history without fanfare: *"This isn't a toy; it powered real speech recognition for decades."*

### DO: Quietly Playful
- Use unexpected but clarifying metaphors: *"the coin vanishes into the shadow realm"*
- Personify things lightly: *"Your GPU can multiply matrices all day long, but it has no concept of what 'a' means"*
- Keep it grounded: *"everything outside that window doesn't exist to the model"*
- Callback to running jokes (meat grinder, etc.): *"The meat grinder is built."*

### DON'T: Sound-Bitey or Preachy
These patterns feel like trying to be quotable or wise. Avoid them:

| ❌ Don't | Why it's bad | ✅ Instead |
|----------|--------------|------------|
| "That's it. That's the whole trick." | Mic-drop energy | Just explain it clearly |
| "Theory is cute. But..." | Dismissive, condescending | "Okay, but where do these actually come from?" |
| "Don't let anyone tell you..." | Preachy, arguing with nobody | Just explain the simple thing |
| "in its full glory" | Grandiose | "Looks scary, says the same thing" |
| "Here's the clever bit" | Self-congratulatory | Just show the clever bit |
| "totally doable" | Trying too hard to be casual | Use normal words |

### The Test
Before writing a sentence, ask: *"Am I explaining something, or am I trying to sound smart?"*

Good voice **serves the explanation**. Bad voice **serves the author's ego**.

### Reference: Tone Inspirations
- **Karpathy**: Clear step-by-step, occasionally jokes, admits when things are weird
- **3Blue1Brown**: Genuine curiosity, playful but never condescending, "let me show you something interesting" energy
- **The best parts of this codebase**: "Raw text walks in wearing poetry and vibes"—funny because it's a weird metaphor, not because it's dunking on anyone

---

## The Three-Sweep Editorial Process

After drafting a section, run three sequential editorial sweeps. Order matters—each builds on the previous.

### Sweep 1: Hemingway (Subtractive)

**Purpose:** Strip cheap rhetorical tricks. Earn the right to add texture.

**Kill these patterns:**
- "It's not X, it's Y" — cheap contrast
- "Not because X, but because Y" — over-explaining causation
- "Notice how..." / "The key insight is..." — telling reader what to think
- "That's it. No magic." — mic-drop energy
- Any sentence that TELLS the reader what to feel about the previous sentence

**Hemingway's rule:** State the fact. Stop. If it's important, the reader will feel it.

```
BEFORE: "This isn't just a lookup table — it's the compressed soul of language."
AFTER:  "The table holds 6,912 numbers. They encode what the model knows about which characters follow which."
```

### Sweep 2: DFW (Additive — Texture)

**Purpose:** Add intellectual texture where spare prose loses the *struggle* of understanding.

**DFW isn't just "add precision." He does something harder:**
- Precision that leads somewhere unexpected (a rabbit hole that reveals the thing beneath)
- Meta-awareness of the difficulty of explaining ("which is the part that's hard to keep straight")
- Genuine intellectual wrestling visible on the page, not just polished conclusions
- Often turns the question back on the reader
- Length that earns itself by holding multiple ideas in tension

**DFW's rule:** Don't just clarify—take the reader down the rabbit hole with you.

**NOT DFW** (precision bolted on, goes nowhere):
```
"The gradient points toward the error (or rather, toward the direction where
 error increases fastest—a distinction that matters in high dimensions)."
```

**ACTUAL DFW** (precision leads to revelation, turns back on reader):
```
"The gradient points toward the error—or rather, and this is the part that's
 hard to keep straight, toward the direction where error increases fastest,
 which is not the same thing, though in two or three dimensions you can blur
 the distinction and get away with it. We are not in two or three dimensions.
 We're in 6,912 dimensions, which is a number I'd like you to actually sit
 with for a second rather than letting your eyes slide past it: six thousand
 nine hundred and twelve separate axes, each perpendicular to all the others,
 a space your visual cortex has no hardware for. The gradient still works.
 The math doesn't require you to see it. Whether that's reassuring or
 terrifying says more about you than about the math."
```

**The key moves:**
- "this is the part that's hard to keep straight" — meta-awareness
- "sit with for a second rather than letting your eyes slide past" — invites genuine engagement
- "your visual cortex has no hardware for" — operationalized, not vague
- "says more about you than about the math" — turns it back on the reader

**Other DFW patterns:**
- "which is to say" — translates between frames, reveals that framing matters
- "I'm aware this sounds [grandiose/mystical/insane]" — earns the weird claim through precision
- Questions he doesn't fully answer — the uncertainty is texture, not weakness

**Be selective:** 3-5 places per section. DFW is exhausting if overdone.

### Sweep 3: Radiolab (Additive — Feeling)

**Purpose:** Make the reader FEEL the idea before fully understanding it.

**Add these patterns:**
- "Picture this..." / "Imagine..." — puts reader in the scene
- "Stop. Think about what that means." — pace-slowing at crucial moments
- Make the weird feel weird — don't normalize the remarkable
- Sensory grounding — what would this look/sound/feel like?
- Human entry points to technical ideas

**Radiolab's rule:** Earn the emotion through specificity, not drama.

```
BEFORE: "The embedding space has 64 dimensions."
AFTER:  "Sixty-four dimensions. You can't picture it. Nobody can. But the math
         doesn't care what you can picture—it works anyway."
```

```
BEFORE: "Gradient descent minimizes the loss function."
AFTER:  "Here's the strange part: nobody tells the model where to go. It just...
         feels its way downhill. Each step, it asks: 'which direction makes me
         slightly less wrong?' And it takes that step. A billion times. And
         somehow, out of that blind fumbling, structure emerges."
```

**Be selective:** 5-7 places per section. Strategic pauses, not constant drama.

### Why This Order?

1. **Hemingway first** — You can't add precision to bloated prose. Cut first.
2. **DFW second** — You can't add emotion to imprecise ideas. Sharpen first.
3. **Radiolab third** — Now the spare, precise prose can carry feeling.

### The Checklist

After writing a section, ask:

- [ ] **Hemingway:** Did I cut all "not X, it's Y" and metacommentary?
- [ ] **DFW:** Did I operationalize vague terms? Acknowledge where metaphors break?
- [ ] **Radiolab:** Did I slow down at the crucial moment? Make the weird feel weird?

### Anti-Patterns to Avoid

Even after sweeps, watch for:

| Pattern | Why it fails | Fix |
|---------|--------------|-----|
| "In other words..." | You already said it | Cut the repetition |
| "Simply put..." | Condescending | Just say the simple thing |
| "Interestingly..." | Tells reader what to find interesting | Let them decide |
| "It turns out that..." | Filler | Delete, start with the fact |
| Ending with a question you immediately answer | Cheap suspense | Just make the point |

---

## Project Structure

```
src/
├── App.tsx              # Entry point - renders current chapter
├── chapters/
│   └── Chapter1.tsx     # Chapter content files
├── components/
│   ├── index.ts         # All exports - IMPORT FROM HERE
│   └── *.tsx            # Individual components
└── styles/
    └── global.css       # CSS variables and base styles
```

## Import Pattern

**ALWAYS import from the barrel file:**

```tsx
import {
  Container,
  ChapterHeader,
  Section,
  Paragraph,
  // ... other components
} from '../components'
```

**NEVER import directly from component files.**

---

## Component Reference

### Layout Components

#### `Container`
Wraps entire chapter content.

```tsx
<Container>
  {/* All chapter content goes here */}
</Container>
```

#### `ChapterHeader`
Chapter title block at top of page.

```tsx
<ChapterHeader
  number="01"           // String, zero-padded
  title="The Meat Grinder"
  subtitle="Description of what this chapter covers."
/>
```

#### `Section`
Groups content under a numbered heading.

```tsx
<Section number="1.1" title="Section Title">
  {/* Section content */}
</Section>

// Subsections use dotted notation:
<Section number="1.1.1" title="Subsection Title">
```

---

### Typography Components

#### `Paragraph`
Standard paragraph wrapper. Use instead of raw `<p>`.

```tsx
<Paragraph>
  Regular text with <em>emphasis</em> and other inline elements.
</Paragraph>
```

#### `Highlight`
Cyan highlighted text for key concepts.

```tsx
<Paragraph>
  This is a <Highlight>key concept</Highlight> you should remember.
</Paragraph>
```

#### `Term`
Yellow monospace text for technical terms, code snippets, characters.

```tsx
<Paragraph>
  The character <Term>a</Term> appears frequently.
</Paragraph>
```

---

### Content Components

#### `Callout`
Highlighted info boxes. **`title` is required.**

```tsx
<Callout variant="insight" title="The Key Insight">
  <p>Important insight content.</p>
  <p>Multiple paragraphs allowed.</p>
</Callout>

<Callout variant="warning" title="Watch Out">
  <p>Warning content.</p>
</Callout>

<Callout variant="info" title="Note">
  <p>Informational content.</p>
</Callout>
```

**Variants:** `"insight"` (cyan), `"warning"` (yellow), `"info"` (default)

#### `MathBlock`
Mathematical equations with optional explanation. Supports LaTeX-style subscripts/superscripts.

```tsx
<MathBlock
  equation="P(x_1, x_2, ..., x_t)"
  explanation="Joint probability of the sequence."
/>

// Subscripts: x_1 or x_{12} for multi-char
// Superscripts: 2^n or 2^{10}
// Without explanation (inline style):
<MathBlock equation="P(A | B) = 0.75" />
```

**LaTeX escaping (important)**

- Prefer `String.raw` for equations that use LaTeX commands like `\frac`, `\log`, `\text`, etc.
  - ✅ `equation={String.raw`\frac{1}{4}\times\frac{1}{2}=\frac{1}{8}`}`
  - ❌ `equation={String.raw`\\frac{1}{4}`}` (because `\\` is a *line break* in LaTeX)
- If you’re not using `String.raw` (plain strings/template literals), you must escape backslashes:
  - ✅ ``equation={`\\frac{1}{4}`}`` (runtime string becomes `\frac{1}{4}`)

#### `CodeBlock`
Syntax-highlighted code blocks (uses Shiki).

```tsx
<CodeBlock filename="example.py">{`def hello():
    return "world"`}</CodeBlock>

// Without filename (auto-detects language from extension):
<CodeBlock lang="json">{`{"key": "value"}`}</CodeBlock>
```

**Note:** Use template literals with backticks for multi-line code.

#### `CodeWalkthrough` + `Step`
Build code incrementally, step-by-step, with explanations. Each step shows accumulated code with the new addition highlighted.

```tsx
<CodeWalkthrough filename="vocab.py" lang="python">
  <Step code="text = 'hello world'">
    Start with our training text.
  </Step>
  <Step code="chars = sorted(set(text))">
    Extract unique characters with <code>set()</code>, then sort.
  </Step>
  <Step code="stoi = {ch: i for i, ch in enumerate(chars)}">
    Map each character to an integer index.
  </Step>
</CodeWalkthrough>
```

**Props:**
- `filename`: Optional filename header
- `lang`: Language for syntax highlighting (default: `"python"`)
- Each `<Step>` has `code` (the new line(s)) and children (explanation)

#### `CorpusDisplay`
Shows training corpus sentences.

```tsx
<CorpusDisplay sentences={['"hello world"', '"hello there"']} />
```

#### `FrequencyTable`
Character frequency tables. **All props required.**

```tsx
<FrequencyTable
  header={['Char', 'Count', 'P(char)']}  // Exactly 3 strings
  rows={[
    { char: 'a', count: 5, prob: '5/20 = 0.25' },  // prob is STRING
    { char: 'b', count: 3, prob: '3/20 = 0.15' },
    { isSum: true, label: 'Σ', count: 20, prob: '1.00 ✓' },  // Sum row
  ]}
/>
```

**CRITICAL:** `prob` must be a **string**, not a number. Write `'0.25'` not `0.25`.

#### `ContextTrace`
Shows context → next character mappings.

```tsx
<ContextTrace items={[
  { context: 'h', next: 'e', source: '("hello")' },
  { context: 'e', next: 'l', source: '("hello")' },
]} />
```

#### `TrainingExamples`
Training data table with context/target pairs.

```tsx
<TrainingExamples rows={[
  { step: 't=0', context: '"hel" → [3, 2, 4]', target: '"l" → 4' },
  { step: 't=1', context: '"ell" → [2, 4, 4]', target: '"o" → 5' },
]} />
```

**CRITICAL:** `step` must be a **string**, not a number.

#### `ProbabilityExample`
Visual probability distribution with bars.

```tsx
<ProbabilityExample
  rows={[
    { char: 'a', prob: 0.05 },                    // prob is NUMBER here
    { char: 'l', prob: 0.40, highlight: true },   // highlight makes it magenta
    { char: 'o', prob: 0.15 },
  ]}
  sum={'Σ = 0.05 + 0.40 + 0.15 = <span class="highlight">1.00</span>'}
/>
```

**Note:** Here `prob` IS a number (for bar width calculation). `sum` is optional HTML string.

#### `WorkedExample`, `WorkedStep`, `WorkedNote`
Step-by-step worked problems.

```tsx
<WorkedExample title="Computing P(cat)">
  <WorkedStep n="1">
    <p>First step explanation.</p>
    <WorkedNote>Additional note about this step.</WorkedNote>
  </WorkedStep>
  <WorkedStep n="2">
    <p>Second step.</p>
  </WorkedStep>
  <WorkedStep n="3" final>  {/* final adds emphasis */}
    <p><strong>Final answer: 0.375</strong></p>
  </WorkedStep>
</WorkedExample>
```

`n` can be a number, string, or symbol like "→" or "?".

#### `Invariants`, `InvariantItem`
Chapter summary checkpoints. **`title` is required.**

```tsx
<Invariants title="Chapter 1 Invariants">
  <InvariantItem>First key takeaway.</InvariantItem>
  <InvariantItem>Second key takeaway.</InvariantItem>
</Invariants>
```

#### `Exercise`
Practice problems with optional hints/solutions. **`number` is required.**

```tsx
<Exercise
  number="1.1"
  title="Problem Title"
  hint={<p>Optional hint content.</p>}
  solution={
    <>
      <p>Solution explanation.</p>
      <CodeBlock>{`code example`}</CodeBlock>
    </>
  }
>
  <Paragraph>Problem statement goes here as children.</Paragraph>
</Exercise>
```

---

### Visualization Components

#### `SparsityViz`
Bar chart showing n-gram frequency decay.

```tsx
import { SparsityViz, defaultSparsityData } from '../components'

// Use default data:
<SparsityViz rows={defaultSparsityData} />

// Or custom:
<SparsityViz rows={[
  { context: 'the cat', count: '12 times', widthPercent: 10 },
  { context: 'cat', count: '500 times', widthPercent: 50 },
]} />
```

#### `NgramExamples`
Static display of unigram/bigram/trigram examples.

```tsx
<NgramExamples />  // No props needed
```

---

### Interactive Demos

#### `CorridorDemo`
Interactive probability corridor visualization.

```tsx
<CorridorDemo />  // No props needed
```

#### `TokenizerDemo`
Interactive tokenizer demonstration.

```tsx
<TokenizerDemo />  // No props needed
```

#### `SlidingWindowDemo`
Interactive sliding window visualization.

```tsx
<SlidingWindowDemo />  // No props needed
```

---

### Navigation

#### `ChapterNav`
Bottom navigation between chapters.

```tsx
// First chapter (no prev):
<ChapterNav next={{ href: '/chapter-02', label: 'Chapter 2: The Model' }} />

// Middle chapter:
<ChapterNav
  prev={{ href: '/chapter-01', label: 'Chapter 1: The Meat Grinder' }}
  next={{ href: '/chapter-03', label: 'Chapter 3: Training' }}
/>

// Last chapter (no next):
<ChapterNav prev={{ href: '/chapter-02', label: 'Chapter 2: The Model' }} />
```

---

## Common Patterns

### Chapter File Structure

```tsx
import { /* components */ } from '../components'

export function Chapter2() {
  return (
    <Container>
      <ChapterHeader number="02" title="..." subtitle="..." />

      <Section number="2.1" title="...">
        {/* content */}
      </Section>

      <Section number="2.1.1" title="...">
        {/* subsection content */}
      </Section>

      {/* More sections... */}

      <Section number="2.X" title="Exercises">
        <Exercise number="2.1" title="...">...</Exercise>
      </Section>

      <ChapterNav prev={{...}} next={{...}} />
    </Container>
  )
}
```

### Lists Inside Sections

Use standard HTML lists, they're styled automatically:

```tsx
<ul>
  <li><strong>Input:</strong> context tokens</li>
  <li><strong>Output:</strong> probability distribution</li>
</ul>

<ol>
  <li>First step</li>
  <li>Second step</li>
</ol>
```

---

## Critical Rules

### DO

- Import all components from `'../components'`
- Use `<Paragraph>` for all prose text
- Use string values for `prob` in `FrequencyTable`
- Use string values for `step` in `TrainingExamples`
- Always provide `title` for `Callout`, `Invariants`
- Always provide `number` for `Exercise`
- Use LaTeX notation (`x_1`, `x^2`) in `MathBlock` equations
- Use template literals for multi-line `CodeBlock` content

### DON'T

- Don't use raw `<p>` tags - use `<Paragraph>`
- Don't use numbers for `prob` in FrequencyTable - use strings like `'0.25'`
- Don't use numbers for `step` in TrainingExamples - use strings like `'t=0'`
- Don't forget required props (`title`, `number`, `header`)
- Don't import from individual component files
- Don't create new component files without updating `index.ts`

---

## Type Errors Cheatsheet

| Error | Cause | Fix |
|-------|-------|-----|
| `Type 'number' is not assignable to type 'string'` | Using `prob: 0.5` | Use `prob: '0.5'` |
| `Property 'title' is missing` | Callout/Invariants without title | Add `title="..."` |
| `Property 'number' is missing` | Exercise without number | Add `number="1.1"` |
| `Property 'header' is missing` | FrequencyTable without header | Add `header={['A', 'B', 'C']}` |

---

## Adding New Components

1. Create `ComponentName.tsx` and `ComponentName.module.css` in `src/components/`
2. Export from `src/components/index.ts`
3. Document in this file
4. Verify build: `npm run build`

## Landing the Plane (Session Completion)

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd sync
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds
