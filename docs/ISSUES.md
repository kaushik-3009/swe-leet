# Known Issues & Bug Triage Log

This tracks bugs and limitations discovered during development (v2 hardening pass),
whether they turned out to be real, and what was done about them. Kept so a future
session doesn't re-litigate the same investigation.

## Investigated, not reproducible

### "Canvas drawing tools don't work on Chrome/Arc, only Safari"

**Status: not reproducible in this codebase, closed.**

Reported as a risk based on prior project experience (this project uses tldraw, not
Excalidraw, where such bugs have historically shown up). Verified directly rather than
guessing:

- Installed Playwright with both Chromium and WebKit engines.
- Built a temporary unauthenticated repro route hosting `DesignCanvas` in isolation.
- Scripted real pointer sequences (multi-step drags and single fast drags) using both
  the `r` keyboard shortcut and an actual click on the toolbar's rectangle tool button,
  in both engines.
- Result: a shape was created in both Chromium and WebKit in every variation tested, no
  console errors in either engine.

No code changes were made for this item. If it resurfaces in production, the highest-value
next step is capturing the *exact* browser/OS/input-device combination (mouse vs.
trackpad vs. stylus, OS-level pointer/accessibility settings, browser zoom level) since
the isolated repro above ruled out the component/library/CSS layer.

## Fixed this pass

### Triplicate full-table fetch on the dashboard

`Stats`, `Heatmap`, and `EntryList` each independently called `GET /api/entries?userId=`
on mount, unpaginated. As a user's history grows past a few months this meant three full
JSON payloads of every entry ever logged, on every dashboard load. `AddEntryForm`'s topic
autocomplete and the old `WeeklyProgress` widget each did their own additional full fetch
of the same table (five total independent full-table reads per dashboard visit).

Fixed by:
- A consolidated `GET /api/dashboard?userId=` that computes stats and the heatmap via
  Postgres `groupBy` (indexed on `(userId, date)`), and returns only the most recent 30
  entries for the widget, in one round trip.
- Cursor pagination added to `GET /api/entries` for the full `/sessions` log page.
- A dedicated `GET /api/entries/topics` for the autocomplete (distinct topics only, via
  `groupBy`, instead of pulling every field of every entry).
- `Stats`/`Heatmap`/`WeeklyProgress` converted to pure presentational components fed by
  the single dashboard fetch; `EntryList` supports both a prop-driven mode (dashboard
  widget) and a self-paginating mode (`/sessions`).
- The friend-profile page (`/user/[username]`) had the same duplicate-fetch pattern
  independently; it now uses the same `/api/dashboard` endpoint.

### Over-fetching large JSON blobs in list views

`GET /api/roadmap` and `GET /api/problems` used Prisma's default `include`/no-`select`,
which pulls every column of `Problem` - including `referenceDiagram` (a full tldraw
snapshot, can be tens of KB) and `rubric` - for every problem in the list, even though
list views only render title/difficulty/tags/etc. This gets worse linearly as the problem
count grows (see the NeetCode-150-style expansion in this pass). Fixed with explicit
Prisma `select` clauses everywhere problems/categories are listed, and the semi-static
content query (identical for all users, changes only via the seed script) is now cached
with `unstable_cache` (60s).

### Em dashes in app-facing copy

The "never use em dashes" requirement was checked against a full-codebase grep. Two real
hits in genuinely user-facing text: the page `<title>`/OG metadata in `src/app/layout.tsx`
and a form placeholder in `AddEntryForm.tsx`, both fixed (colon/parens instead). Em dashes
remaining in `docs/*.md` and in code comments / the AI grading prompt string
(`src/lib/grading/ai.ts`) were left as-is, those are internal engineering text, not "app
text" a user reads, which is what the requirement was about.

### Unescaped backticks inside template-literal content

While expanding `content/system-design/problems.ts` with inline `` `code span` `` markdown
in `description`/`referenceExplanation` strings (which are themselves backtick template
literals), an inline code span's backtick terminates the outer template literal early,
a straightforward but easy-to-miss authoring mistake since it only surfaces as a `tsc`
syntax error, not a runtime bug. Fixed by escaping every backtick that appears inside an
inline code span (`` \`hash(key) % N\` ``) rather than removing the inline-code styling.
Any future content author adding inline code spans inside a template-literal field needs
to escape the backticks the same way; this is exactly the kind of thing `npx tsc --noEmit`
catches immediately, so run it after any content edit.

### Pre-existing `react-hooks` lint errors (not introduced this pass, not fixed)

`npx eslint .` reports "Calling setState synchronously within an effect" errors in
`AuthProvider.tsx`, `Navbar.tsx`'s search-clear effect, and `ThemeProvider.tsx`, plus an
`any` in `AuthPage.tsx`. All predate this pass (present on the base commit before this
session's work started, confirmed via `git diff main`). Left alone: fixing them means
restructuring the app's core auth/theme initialization timing, which is out of scope for
this pass and risks the explicit "keep the existing frontend look and feel exactly as is"
constraint. Worth a dedicated pass later. This session's own new/changed files
(`practice/[slug]/page.tsx`, `SolutionPanel.tsx`, the canvas/grading additions,
`study-plan/**`) lint clean.

## Open / accepted limitations

- **No automated signed-in browser test.** The Neon migration/content seed and controlled
  Gemini/OnlineCompiler provider smoke checks have been verified, but this repository still
  lacks a Firebase-authenticated browser harness. The remaining manual click-through is
  documented in `docs/RUNBOOK.md`; it should be run after changes to grading, provider
  integrations, schema, or practice-page behavior.
- **LLD code mode uses a plain styled `<textarea>`, not a full code editor** (no syntax
  highlighting, no IntelliSense). A real editor (Monaco/CodeMirror) is a reasonable
  future upgrade but adds meaningful bundle size; given the grading is AI/structural
  (not a compiler), a lightweight editor was judged sufficient for now. See
  `docs/DECISIONS.md`.
- **Weekly goals are a single number ("N sessions"), not broken out by activity type.**
  Any `StudyEntry` counts toward the weekly total, matching how the pre-existing
  `WeeklyProgress` widget already worked.
