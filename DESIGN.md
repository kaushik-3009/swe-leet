# System Design Tracker — Visual Redesign

Quick redesign pass on the existing dark-mode tracker UI.

See `redesign-mockup.html` for the live mockup.

---

## Design rationale

The subject is a personal study-tracking tool for system design / LLD prep.

This also gives the accent color a job: teal now means "signal" — active state, streak, focus ring — instead of being sprinkled wherever a button happened to need color.

---

## Tokens

### Color

| Token | Hex / value | Role |
|---|---|---|
| `--bg` | `#0a0d13` | Page background |
| `--card` | `#12151d` | Card surface (one step up from page) |
| `--card-elevated` | `#161a24` | Buttons, inputs, hover states (two steps up) |
| `--border` | `rgba(255,255,255,.07)` | Default card/divider border |
| `--border-strong` | `rgba(255,255,255,.14)` | Interactive element borders |
| `--text-primary` | `#eef0f4` | Headings, values |
| `--text-secondary` | `#9aa2b1` | Body copy, labels |
| `--text-tertiary` | `#5c6373` | Placeholders, captions, hints |
| `--accent` | `#22c893` | Single committed accent — streaks, focus, primary action |
| `--danger` | `#e5675f` | Destructive action (Clear All hover) |

Previously every panel shared one flat navy. Now there are three visible elevation steps (page → card → interactive element), so the page reads as layered rather than one slab. Secondary text contrast was bumped up from the original so labels and hints are legible without competing with headings.

### Type

- **Display / data — IBM Plex Mono**: page title, stat values, section labels, streak pill. A monospace face reads as "data" and fits a tracker that's fundamentally a log.
- **Body — Inter**: paragraph copy, input text, buttons. Neutral and highly legible at small sizes.

Numbers (stat values) are set larger and tighter (`34px`, `-0.02em` tracking) so they read as the hero data point on each card, not just a label with a number attached.

### Layout

```
┌─────────────────────────────────────────────┐
│ eyebrow                      [Demo] [Clear]  │
│ H1 Title                                     │
│ subtitle                                     │
├───────────────┬───────────────┬─────────────┤
│ stat card      │ stat card     │ stat card    │  ← accent top-edge per card,
│ (icon+corner)  │ (icon+corner) │ (icon+corner)│    color-coded by category
├───────────────┴───────────────┴─────────────┤
│ Activity · July 2026        [streak pill]    │
│ [ heatmap — unchanged ]                      │
│ Less ■■■■■ More                              │
├───────────────┬───────────────────────────────┤
│ Log Study      │ Recent Sessions               │
│ Session form   │ (empty state / entry list)    │
└───────────────┴───────────────────────────────┘
```

Same overall structure as the original — this is a styling pass, not a rearrangement — but each region now has clearer edges (visible `border` + `card` background) instead of bleeding into the page.

### Signature element

**Corner brackets + top accent edge on stat cards.** A thin two-sided bracket in the top-right corner of each card, paired with a 2px gradient line along the top edge in that stat's accent color. It's a small nod to technical/schematic drawings (corner registration marks) without becoming a heavy motif — used only on the three stat cards, nowhere else, so it stays a signature rather than a pattern slapped on everything.

---

## Specific changes from the original

1. **Elevation & borders** — every card now has a visible `1px` border and sits on a distinct background from the page, instead of matching it.
2. **Stat cards** — each gets an icon, a category accent color (teal / blue / amber), a corner-bracket mark, and a contextual sub-line (e.g. "No active streak yet") instead of a bare number in a box.
3. **Streak pill** — added next to the Activity header so the heatmap has a callout instead of just a month label floating alone.
4. **Buttons** — "Load Demo Data" and "Clear All" now have real borders and hover states (Clear All hovers red as a destructive-action cue). "Add Entry" is a solid teal primary button, shown disabled until the form has input.
5. **Form** — added one-line hints under each field ("The concept or pattern you studied") so the form explains itself without a tooltip.
6. **Empty state** — icon + title + explanatory line instead of a single gray sentence, and it matches the visual language of the stat card icons.
7. **Contrast** — secondary/tertiary text lightened slightly across the board for legibility.
8. **Accent discipline** — teal is now used only for: streak/active state, focus rings, and the primary CTA. It no longer appears incidentally (e.g., the July 2026 label uses it only because that's the "current period," which is itself a state).
