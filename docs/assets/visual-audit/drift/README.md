# Drift Examples — Why These Are “Drift”

This folder holds screenshots that are intentionally **not** “the BabyGPT look”.

They exist so future work has a concrete “don’t copy this” reference, and so reviewers can name *what* is off (instead of arguing vibes).

If you’re refactoring a viz, use:

- `docs/visual-language.md` (the spec)
- `docs/assets/visual-audit/gold/` (what to copy)

## How to read these

“Drift” usually means one or more of:

- **Color semantics drift**: raw blues/greens/oranges that don’t match the semantic palette (`--accent-*`).
- **Surface drift**: bespoke panels instead of `VizCard` / `.panel-dark` / `.inset-box`.
- **Typography drift**: headings/labels that don’t follow the serif-title + mono-label hierarchy.
- **Control drift**: default-ish buttons/sliders that don’t match the rest of the UI.
- **Token drift**: CSS vars used that aren’t in `src/styles/global.css` (silent browser fallbacks).

## Per-screenshot notes

### `audit-ch2-neuraltraining.png`

Why it’s drift:

- Uses a **dashboard-ish** look (large saturated heatmap blocks) that fights the calmer glass/card surfaces.
- Uses **red/green** as the primary channel instead of the project’s semantic palette (cyan/magenta/yellow, with green/red reserved for hit/miss).
- Controls read as **default UI** (button + slider area doesn’t feel like the same product as the VizCard figures).

Fix direction:

- Move to a `VizCard` “figure” surface, use `.inset-box` for controls.
- Use semantic accents (cyan for positive / magenta for negative) and keep saturation restrained.

Gold references:

- `../gold/audit-ch2-softmax-simplex.png` (sliders + figure surface)
- `../gold/audit-ch2-axioms-vizcard.png` (VizCard baseline)

### `audit-ch2-onehot.png` / `audit-ch2-onehot-full.png`

Why it’s drift:

- The panel surface looks like a one-off (not clearly `VizCard` / `.panel-dark` / `.inset-box`).
- The token buttons feel like **generic controls** (radius/border/hover language doesn’t match the rest).
- Low contrast makes the viz feel “faded” compared to surrounding premium components.

Fix direction:

- Use `.panel-dark` as the container surface and bring controls to tokenized radii/hover/focus.
- Use cyan as the active state (consistent with other “selection” controls).

Gold references:

- `../gold/audit-ch2-softmax-landscape.png` (control density + panel balance)

### `audit-ch1-sparsemarkov.png` / `audit-ch1-sparsemarkov-full.png`

Why it’s drift:

- Bespoke badge/header styling (pill/background/typography) that doesn’t match the chapter’s visual primitives.
- Uses **orange** as the main “node identity” color (not part of our semantic palette).
- Mixes multiple unaligned styles in one component (badge, nodes, edge labels).

Fix direction:

- Treat it as a figure/panel: `.panel-dark` wrapper, mono label conventions.
- Use semantic colors: cyan for “entities/keys”, green for seen edges, red for missing edges.

Gold references:

- `../gold/audit-ch1-kenlm.png` (mono label language + structured demo look)

