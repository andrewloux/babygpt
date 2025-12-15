# BabyGPT Component Library Guide

This document teaches AI agents how to properly use the BabyGPT component library when building educational content about language models.

---

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
