# Low-Level Design

Module-level design of the app itself (not to be confused with the LLD *practice content*
users solve, see `content/lld/problems.ts` for that). Companion to `docs/ARCHITECTURE.md`
(system-level) and `docs/SCHEMA.md` (data model). Read this when you need to know exactly
how a specific piece works internally, not just where it sits in the system.

## Auth: token verification and the two-tier read model

`src/lib/auth-server.ts` exposes two functions:
- `getUidFromRequest(req)`: reads `Authorization: Bearer <token>`, verifies it via
  `firebase-admin`, throws `AuthError(401)` on missing/invalid tokens. Used by every
  mutation and every "my own data" read.
- `tryGetUidFromRequest(req)`: same, but returns `null` instead of throwing on a missing
  token. Used by routes that are meant to work for both logged-in personalization
  (e.g. "is this resource checked off for me") and public/anonymous reads (e.g. viewing a
  friend's profile without exposing your own progress markers).

`src/lib/api.ts` on the client attaches the token automatically from
`auth.currentUser.getIdToken()` on every request; routes that don't require auth simply
ignore a missing header.

## Grading pipeline internals

### Canvas extraction (`src/lib/grading/extract.ts`)

Walks a `TLStoreSnapshot`'s serialized record dictionary directly (no live `Editor`
instance needed, since grading happens server-side in a Route Handler with no DOM).
`geo`/`text`/`note` shapes become graph nodes (id + label, label pulled from the shape's
rich text); `arrow` shapes with both `start`/`end` bindings resolved become edges. Shapes
without a resolvable binding (an arrow with a loose end) are dropped rather than guessed.
Freehand `draw` shapes, images, and frames are intentionally ignored, see
`docs/DECISIONS.md` for why.

### Structural matching (`src/lib/grading/structural.ts`, `codeStructural.ts`)

Two independent implementations of the same idea (fuzzy match extracted signal against a
rubric), because the input shape is different:
- `matchStructural`: works on `{nodes, edges}` graphs. Labels are normalized (lowercased,
  punctuation stripped, whitespace collapsed) and passed through a hand-maintained
  synonym table (`lb` -> `load balancer`, `db`/`redis`/`memcached` -> ... ) before a
  substring-containment match. A rubric connection matches if both endpoint nodes'
  normalized labels match the rubric's `from`/`to`.
- `matchCodeStructural`: works on a raw code string. Same normalization idea but simpler
  (strip to alphanumerics only, since identifiers don't have spaces), and a "connection"
  match is approximated as "both endpoint names appear somewhere in the code" (there's no
  cheap way to verify an actual code relationship without parsing an AST, so this is
  explicitly a coarse signal, weighted lower in the blend than the canvas version).

Both return the same `StructuralMatchResult` shape (`matchedComponents`,
`missingComponents`, `matchedConnections`, `missingConnections`, `coverage: 0-100`), which
is what lets `src/lib/grading/index.ts` treat them uniformly.

### AI grading (`src/lib/grading/ai.ts`, `code.ts`)

Both call the Anthropic Messages API with `tool_choice: "tool"` forcing a structured
`{score, strengths, missing, improvements}` response (no freeform-text parsing, no risk of
the model wrapping JSON in prose). Client is created lazily and cached (`cachedClient`
module-level variable); if `ANTHROPIC_API_KEY` is unset the client is `null` and the
grading functions return `null` immediately, which the caller treats as "fall back to
structural-only," never as an error. Any API failure (rate limit, timeout, malformed tool
response) is caught and also returns `null`, same fallback path, so a flaky AI call never
blocks a submission from being scored.

### Blending (`src/lib/grading/index.ts`)

- `gradeSubmission()` (canvas): `score = ai ? round(0.5*structural + 0.5*ai) :
  structural`. Feedback comes from the AI response when available (more specific/
  actionable), or is synthesized from the structural match's matched/missing lists as a
  fallback.
- `gradeCodeSubmission()` (LLD code): same shape, but `0.3*structural + 0.7*ai`, since the
  code structural signal is weaker (see above) and code quality genuinely needs an LLM's
  judgment more than a diagram's component/connection presence does.

Both persist a versioned row (`version = max(existing) + 1`, never overwritten) so a
user's submission history is a real timeline, and both update `ProblemProgress` with
`bestScore = max(existing, new)`, never regressing a user's recorded best on a worse
retry.

## Canvas: snapshot lifecycle and the shape palette

`DesignCanvas` (`src/components/canvas/DesignCanvas.tsx`) is a controlled wrapper: it
never owns save state itself. `snapshot` flows in as a prop (loaded from a
`Submission.canvasSnapshot` or `undefined` for a blank canvas), and `onChange` fires a
debounced (800ms, cleared/reset on every store mutation) callback with a fresh
`editor.store.getStoreSnapshot()`. The parent page (`practice/[slug]/page.tsx`) is the one
that decides what to do with that snapshot (store it in a ref for submission, mark the
problem "touched" on first change).

`onEditorReady` is a second callback (added alongside `onChange`) purely so a sibling
component, `ArchitectureShapePalette`, can drive the same live `Editor` instance without
the canvas needing to know the palette exists. The palette calls `editor.createShape(...)`
directly with a `geo` shape and a template (label/color/geo-variant), computing placement
from `editor.getViewportPageBounds()` plus an incrementing counter (`placeCountRef`, reset
per-mount) so repeated clicks tile shapes into a grid instead of stacking exactly on top
of each other. Templates are keyed by `DiagramType` (`ARCHITECTURE`/`SEQUENCE`/`CLASS`),
matching each problem's `diagramType` field, so an LLD problem's palette offers
class/interface/abstract-class/enum instead of load-balancer/cache/queue.

## Solution reveal: the progressive-disclosure state machine

`SolutionPanel.tsx` holds a single piece of state, `revealedSteps: number`, starting at 0.
While `revealedSteps < solution.solutionSteps.length`, only the already-revealed step
titles/bodies render, plus a single "Reveal next step" button that increments the counter
by exactly one per click, no skipping ahead. Everything below the steps section (the
side-by-side canvas comparison, the reference code block, the full design rationale, the
rubric breakdown) is gated behind `allStepsRevealed` and simply doesn't render until every
step has been clicked through. This is the entire "give up" flow: there's no separate
give-up button or state on the practice page, clicking "I'm Stuck, Reveal Solution" always
opens this same panel, and the panel itself is what enforces incremental disclosure. A
problem with no authored `solutionSteps` degrades gracefully to `allStepsRevealed = true`
immediately (skips the gate).

## Content authoring pipeline

`content/schema.ts` defines the authoring-time TypeScript shape (`CategorySpec`,
`ResourceSpec`, `ProblemSpec`, `RubricSpec`, `SolutionStepSpec`). Content lives as plain
`.ts` files (`content/categories.ts`, `content/system-design/problems.ts`,
`content/lld/problems.ts`), which means content changes get type-checking, code review,
and git history for free, no CMS.

`scripts/seed-content.ts` is the only thing that writes this content into Postgres:
- Categories: upsert by `slug`; resources are diffed by a `kind:title` composite key so a
  renamed/removed resource in the spec gets deleted from the database rather than
  orphaned, and a synthetic `ARTICLE`-kind resource row is auto-created whenever a
  category has `articleContent`, so the on-site article shows up in the same
  checkbox-tracked resource list as external links without being authored twice.
- Problems: upsert by `slug`. `defaultDiagramType()` fills in `ARCHITECTURE` for System
  Design / `CLASS` for LLD when a spec doesn't override `diagramType`. Every field funnels
  through one `shared` object used identically for both `create` and `update`, so there's
  no drift between what a first-time seed writes and what a re-seed after a content edit
  writes.
- `referenceDiagram` is never hand-authored as raw tldraw JSON: `content/autoLayout.ts` +
  `content/diagramBuilder.ts` generate it headlessly straight from
  `rubric.requiredComponents`/`requiredConnections`, so the rubric and the reference
  diagram can never disagree with each other (verified by a round-trip check: extract the
  generated diagram back out and grade it against its own rubric, expect 100% coverage).

## Frontend data flow: dashboard and topic pages

`src/app/page.tsx` (dashboard) makes exactly one fetch, `GET /api/dashboard?userId=`, and
passes slices of the response down as props to `Stats`, `Heatmap`, `EntryList`, and
`WeeklyProgress`/`AddEntryForm`, all of which are pure presentational components with no
fetch of their own (this replaced the old pattern where each of those five components
fetched the full entries table independently, see `docs/ISSUES.md`).

`src/app/study-plan/[slug]/page.tsx` similarly makes one fetch, `GET /api/categories/
[slug]`, which returns the category (with its article), the resource list (with
per-user completion already joined), and the study-plan problem subset (with per-user
`ProblemProgress` already joined). Checkbox toggles (`toggleResource`, `toggleProblem`)
apply an optimistic local update immediately, then confirm against the API, rolling back
the local state on failure, so the UI never waits on a round trip to feel responsive.

## Bidirectional completion sync

There is exactly one row per `(userId, problemId)` in `ProblemProgress`, full stop. The
study-plan topic page's problem-subset checkboxes, the full `/roadmap` list's checkboxes,
and the grading pipeline's automatic status updates all read and write that same row,
there is no separate "study plan completion" table to keep in sync. The only nuance is in
`POST /api/progress/checklist` (the manual checkbox toggle): unchecking a problem whose
`bestScore` already cleared `SOLVED_THRESHOLD` is a deliberate no-op, since that result was
earned by actual grading and a manual uncheck shouldn't be able to erase it, this is
enforced server-side, not just hidden in the UI, so it holds regardless of which page the
uncheck comes from.
