# Gold Examples — What “In-Family” Looks Like

This folder holds screenshots that act as **targets** for the BabyGPT visual language.

When you’re building/refactoring a viz, prefer copying the *structure* of these examples and swapping in your content, rather than inventing new surfaces/controls from scratch.

Spec: `docs/visual-language.md`

## What makes these “gold”

- **Clear surface hierarchy**: `VizCard` for titled figures; `.panel-dark` / `.inset-box` for nested panels.
- **Typography**: serif figure titles + mono subtitles/labels.
- **Semantic colors**: cyan/magenta/yellow used consistently (green/red reserved for success/failure).
- **Interaction affordances**: consistent hover/focus rings and control styling.

## Screenshots

- `audit-ch2-axioms-vizcard.png` — VizCard baseline (title/subtitle/figure framing).
- `audit-ch2-softmax-simplex.png` — sliders + figure surface; semantic colors as channels.
- `audit-ch2-softmax-landscape.png` — interactive 3D-ish plot inside a figure layout.
- `audit-ch1-corridor.png` — “terminal/window” demo motif (structured, restrained, readable).
- `audit-ch1-kenlm.png` — “engineer’s window” motif (mono labels, balanced layout).

