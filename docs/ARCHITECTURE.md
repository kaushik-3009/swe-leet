# Architecture

High-level shape of the system. For request/response schemas see `docs/API.md`, for the
data model see `docs/SCHEMA.md`, for internal module design see `docs/LLD.md`, for why
specific choices were made see `docs/DECISIONS.md`.

## System overview

```
                         +-------------------+
                         |   Browser (React)  |
                         |  Next.js App Router |
                         +----------+----------+
                                    |
                        Firebase ID token (Bearer)
                                    |
                                    v
                    +---------------------------------+
                    |   Next.js Route Handlers          |
                    |   (src/app/api/**, serverless)    |
                    +---------------+-------------------+
                        |            |              |
             verify token|      Prisma ORM       Anthropic API
                        |            |              |  (optional, grading only)
                        v            v              v
              +----------------+ +----------+  +-----------+
              | Firebase Admin | |  Neon     |  |  Claude   |
              | (Auth only)    | | Postgres  |  |  Haiku    |
              +----------------+ +----------+  +-----------+
```

Two identity systems, deliberately: Firebase Auth remains the source of truth for "who is
this user" (login, password reset, session tokens), while every other piece of app data
(study entries, problems, submissions, follows, progress) lives in Postgres, keyed by the
Firebase `uid`. See `docs/DECISIONS.md` for why Firestore was fully replaced rather than
run alongside Postgres.

## Layers

**Client (React 19, Next.js App Router, `"use client"` pages).** All interactive pages
(`/`, `/study-plan`, `/study-plan/[slug]`, `/roadmap`, `/practice/[slug]`,
`/user/[username]`, `/sessions`) are client components that fetch through
`src/lib/api.ts`, a thin wrapper that attaches the current Firebase ID token as a bearer
header and unwraps the `{data}`/`{error}` envelope. This keeps the existing design system
(CSS variable tokens in `globals.css`, IBM Plex Mono/Inter, the inline-style hover
convention) untouched, since none of this is a server-rendering change, only a
data-fetching one.

**API layer (`src/app/api/**`, Next.js Route Handlers).** Every route follows the same
shape: parse/validate input with `zod`, resolve the caller's uid from the bearer token
(`src/lib/auth-server.ts`), do the Prisma query/mutation, return `ok(data)`/`err(message,
status)` (`src/lib/api-response.ts`). Reads that are meant to be public (viewing a
friend's profile, a problem's list entry) take an explicit `userId` query param and skip
auth; every mutation always uses the *verified* uid from the token, never a client-supplied
one, so a request can never act as another user. See `docs/API.md` for the full route
table and `docs/DECISIONS.md` for the "why public reads" rationale.

**Data layer (Prisma 7 + Neon Postgres, `src/lib/db.ts`).** A single Prisma client backed
by `@prisma/adapter-neon`, which uses Neon's HTTP driver so it works correctly across
Vercel's serverless function model without connection-pool exhaustion. `DATABASE_URL`
(pooled, via PgBouncer) is what the running app uses; `DATABASE_URL_UNPOOLED` (direct) is
only for `prisma migrate`/`studio` at dev/deploy time (`prisma.config.ts`). Full schema in
`docs/SCHEMA.md`.

**Content layer (`content/**`, `scripts/seed-content.ts`).** All Study Plan categories
(with their curated resources and on-site articles) and all problems (System Design + LLD,
with descriptions, hints, rubrics, reference diagrams, LLD reference code, and step-by-step
solutions) are authored as typed TypeScript specs and upserted into Postgres by an
idempotent seed script. This is a deliberate content-as-code approach: content review goes
through the same PR process as everything else, and the seed script safely re-runs after
edits (upsert by slug/title, stale-row pruning for resources) without ever needing a manual
admin UI.

**Canvas layer (tldraw, `src/components/canvas/DesignCanvas.tsx`).** A themed, controlled
wrapper around `<Tldraw>`. Snapshots (`TLStoreSnapshot`, store-only, not a full editor
snapshot) flow in as a prop and out via a debounced (800ms) `onChange` callback, so the
parent page owns save/submit timing rather than the canvas component. An
`ArchitectureShapePalette` sits alongside it and drives the same `Editor` instance
(exposed via `onEditorReady`) to insert pre-styled component shapes (load balancer, cache,
queue, database, CDN, API gateway, ...for System Design; class/interface/abstract
class/enum for LLD), so users aren't limited to tldraw's generic geometry tools when
sketching a design.

**Grading layer (`src/lib/grading/**`).** Two parallel pipelines, one per submission type,
both blending a deterministic structural score with an optional AI score so grading never
hard-fails when `ANTHROPIC_API_KEY` is unset:
- Canvas (System Design + LLD diagrams): extract a `{nodes, edges}` graph from the tldraw
  snapshot (`extract.ts`), fuzzy-match it against the problem's rubric
  (`structural.ts`), and blend 50/50 with a Claude tool-call evaluation (`ai.ts`) via
  `gradeSubmission()`.
- Code (LLD only): a coarse text-presence check against the rubric's expected class/
  relationship vocabulary (`codeStructural.ts`), blended 30/70 (structural/AI, since the
  text-presence check is a much weaker signal than the canvas graph match) with a Claude
  evaluation focused on correctness, structure, and OOP-principle adherence (`code.ts`)
  via `gradeCodeSubmission()`.

Both write a versioned submission row (`Submission`/`CodeSubmission`), update
`ProblemProgress` (bestScore is a running max, status flips to `SOLVED` at
`SOLVED_THRESHOLD`), and log a `StudyEntry` (`problem_attempt`/`problem_solved`), which is
what makes problem activity show up in the existing heatmap/entry log automatically.

## Request flow: submitting a design for grading

```
Practice page (canvas edit)
   -> debounced onChange -> POST /api/progress/touch (first edit only, marks IN_PROGRESS,
                              logs a "problem_started" entry - this is the automatic
                              session-logging requirement, no manual log needed)
   -> user clicks "Submit for Grading"
   -> POST /api/submissions { problemId, canvasSnapshot }
        -> extractGraph(canvasSnapshot)
        -> matchStructural(graph, rubric)              [always runs, deterministic]
        -> gradeWithAi(...)                             [runs if ANTHROPIC_API_KEY set]
        -> blend 50/50 (or structural-only as fallback)
        -> Submission.create (new version)
        -> ProblemProgress.upsert (bestScore = max, status per SOLVED_THRESHOLD)
        -> StudyEntry.create (problem_attempt | problem_solved)
   -> client re-fetches submission history, renders score + feedback
```

## Activity tracking model

Every user-visible action that should show up in the heatmap/entry log writes a
`StudyEntry` with a specific `kind` (`manual`, `problem_started`, `problem_attempt`,
`problem_solved`, `problem_checklist`, `resource_completed`, `article_viewed`). This is a
single funnel: the dashboard heatmap, the entries log, and profile stats all read the same
table, they don't need separate tracking pipelines per activity type. `EntryList.tsx`'s
`KIND_META` lookup is the only place that needs to know how to *display* each kind
differently (color/label/glyph); the write side and the aggregation queries treat
`StudyEntry` uniformly.

## Deployment topology

Vercel (Next.js serverless functions for all `/api/**` routes and SSR/RSC where used) +
Neon (serverless Postgres, HTTP driver, scales to zero when idle in dev, always-on in
production) + Firebase Auth (unchanged). No additional infrastructure (no separate job
queue, no Redis, no container orchestration) is needed at the 20-30 to a-couple-hundred
concurrent user scale this app targets, see `docs/RUNBOOK.md` section 8 for the specific
reasoning.
