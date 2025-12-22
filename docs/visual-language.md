# BabyGPT Visual Language — Audit (2025-12-21)

This is an **audit of the current visual system** used by visualization components and interactive demos.

Goal: make it easy for any engineer to add a new viz that *looks like BabyGPT* without guessing.

## Scope (what was audited)

Files: `src/components/*{Viz,Demo}.tsx` and their `*.module.css` counterparts (34 components).

## What “consistency” means (in this project)

We don’t need every viz to look identical. We *do* need a shared vocabulary:

- **Semantic colors** (cyan/magenta/yellow/green/red mean consistent things).
- **Surface palette** (a small set of backgrounds: glass card, panel, code/terminal).
- **Typography hierarchy** (serif for narrative headings, mono for labels/metrics, etc).
- **Shared UI primitives** (buttons, sliders, pills should feel like the same product).

## Current “style families”

### A) `VizCard` (glass card + ambient glow)

These vizzes use `VizCard` (which itself applies `ambient-glow` + `card-glass`):

- `AbstractionChainViz`
- `CausalMaskViz`
- `ConditioningShiftViz`
- `ContextExplosionViz`
- `EmbeddingGradientViz`
- `ExplosionDemo`
- `GeneralizationGapViz`
- `GeometricDotProductViz`
- `GradientDescentViz`
- `GradientTraceDemo`
- `SoftmaxLandscapeViz`
- `SoftmaxSimplexViz`

**Pros:** consistent header, spacing, and outer surface.

**Observed drift inside the card:** many of these still hardcode their own palettes (see “Color drift” below).

### B) Standalone “custom card” containers (not `VizCard`)

These components create their own container backgrounds, borders, and headings:

- `DotProductViz`, `GrassmannViz`, `TokenizerDemo`, `SparsityDemo`, `NgramSamplingDemo`, `NgramGraphViz`, `CorridorDemo`, `KenLMDemo`, etc.

**Risk:** lots of near-duplicates of the same ideas (glass background, subtle border, header rows), but with slightly different radii, opacities, and typography.

### C) “Terminal/window” demos

Some demos intentionally look like a terminal/app window (often using `--code-bg` and mono typography):

- `CorridorDemo`
- `KenLMDemo`
- `NgramGraphViz` (graph + corpus panel style)

This is a good motif, but we need clearer rules for when to use it and how it should be styled (surface tokens, border radii, label styles).

### D) Legacy token set (variables that don’t exist anymore)

These components reference CSS vars that are **not defined** in `src/styles/global.css`:

- `MarkovChainViz` (`--border-subtle`)
- `SparseMarkovViz` (`--border-subtle`, plus raw hex badges)
- `TrainingTimeViz` (`--border-subtle`)
- `NeuralTrainingDemo` (`--bg-paper`, `--bg-main`, `--border-subtle`, and legacy `--primary`)
- `OneHotViz` (`--bg-paper`, `--bg-main`, `--bg-hover`, `--border-subtle`, `--accent`, legacy `--primary`)

This is the most concrete “visual drift” bug: when tokens don’t exist, the browser drops the property, and the component silently falls back to whatever it inherits.

## Token drift (undefined variables)

### Undefined typography token

`--font-heading` is used but not defined:

- `src/components/ChapterNav.module.css`
- `src/components/Exercise.module.css`
- `src/components/Invariants.module.css`
- `src/components/WorkedExample.module.css`

### Undefined surface/border tokens

Not defined in `src/styles/global.css`, but referenced in components:

- `--bg-paper`
- `--bg-main`
- `--bg-hover`
- `--border-subtle`
- `--accent` (note: we do have `--accent-cyan`, `--accent-magenta`, etc.)

**Action later:** either define these as aliases to the current tokens, or refactor the components to use the current `--bg-*` and `--border-color` variables.

## Color drift (raw colors vs semantic colors)

We have strong semantic colors in `:root`:

- `--accent-cyan` (primary “probability / distribution / key signal” color)
- `--accent-magenta` (contrast / second distribution / “other option”)
- `--accent-yellow` (highlight / warning / attention)
- `--accent-green` (success / “hit”)
- `--accent-red` (error / “miss”)

But many vizzes use raw RGB values directly, often from different palettes:

- Tailwind blues/greens: `rgb(59, 130, 246)`, `rgb(34, 197, 94)` (e.g. `AbstractionChainViz`)
- Material-ish greens/reds: `rgba(76, 175, 80, ...)`, `rgba(244, 67, 54, ...)` (e.g. `SparsityDemo`)
- Slightly-off cyans: `rgba(96, 217, 255, ...)` (e.g. `KenLMDemo` focus ring)

This is not “wrong”, but it dilutes meaning: readers can’t learn that “cyan means probability mass” if half the vizzes use blue as the primary signal.

## Typography drift (within vizzes)

Global baseline:

- Body text: serif (`Crimson Pro`)
- Labels / UI: typically mono (`JetBrains Mono`)

In practice:

- Some vizzes use serif headings inside the viz; others use sans; others inherit body serif.
- Many label systems are mono (good), but capitalization/letter-spacing conventions vary per component.

## Surface drift

We currently have (at least) these surface patterns:

- Glass card (`card-glass` via `VizCard`)
- Flat panels (`--bg-secondary`, `--bg-tertiary`, translucent blacks)
- Code/terminal (`--code-bg`)

Some components use `--code-bg` for non-code panels (e.g. memory “slots” in `KenLMDemo`). That can work, but we should define it as a named surface (“terminal surface”) so it’s intentional and consistent.

## Immediate audit takeaways (before changing anything)

1. **Fix the legacy token set**: undefined CSS variables are the clearest correctness problem.
2. **Reduce container duplication**: many components are “almost VizCard” but not quite.
3. **Define semantic color rules**: cyan/magenta/yellow/green/red should mean something stable.
4. **Pick a small surface palette** and reuse it everywhere: glass card, panel, terminal/code.

## Next step (after this audit)

Write the **target spec** (colors, surfaces, typography, spacing, interaction affordances), then update 3–5 “worst offender” components to prove the spec is real.

