# Architectural Decisions & Trade-offs

Decisions made during implementation that weren't fully specified in the plan, along with the reasoning. Read alongside `docs/PLAN.md`.

## Database & ORM

**Prisma 7's config format changed mid-flight.** The installed `prisma@7.8.0` no longer allows `url`/`directUrl` in `datasource` inside `schema.prisma` — these moved to a new `prisma.config.ts` file, and `PrismaClient` now takes a driver `adapter` instead of reading `DATABASE_URL` itself. This repo uses `@prisma/adapter-neon`: `src/lib/db.ts` constructs `PrismaNeon({ connectionString: process.env.DATABASE_URL })` directly, while `prisma.config.ts` (used only by the CLI for `migrate`/`studio`) reads `DATABASE_URL_UNPOOLED`. Practically: the app runtime always uses the **pooled** Neon connection string; migrations use the **unpooled** one — both must be set.

**`StudyEntry.id` is a `String @default(cuid())`, not a Firestore-style random doc id.** The migration script explicitly passes the original Firestore document id as the Prisma `id` on `upsert`, so historical entry ids are preserved (useful for idempotent re-runs and for any external references).

## Auth

**Firebase Auth was kept, Firestore was not.** Firebase Auth already worked and re-implementing password auth (reset flows, email verification, etc.) had no upside for this migration. `firebase-admin` (`src/lib/firebaseAdmin.ts`) verifies the ID token on every authenticated API route via `Authorization: Bearer <token>`.

**Signup is a two-step client flow with rollback.** `AuthProvider.signup()` first creates the Firebase Auth user, then calls `POST /api/users/register` to create the matching Postgres `User` row (this is where username-uniqueness is actually enforced, via a `@unique` constraint + Postgres `P2002` error catch). If the Postgres call fails, the Firebase Auth user is deleted (`cred.user.delete()`) so a failed signup doesn't leave an orphaned auth account with no profile.

## API design

**Reads are public by uid, writes require the caller's own token.** Every "view a user's data" endpoint (`GET /api/entries?userId=`, `GET /api/progress?userId=`, `GET /api/follow/followers?userId=`, etc.) takes an explicit `userId` and requires no auth — this is what lets friend profiles work. Every mutation infers the actor from the verified bearer token and ignores any `userId` in the request body, so a client can never act as another user.

**`GET /api/roadmap` returns progress for the *caller*, not for an arbitrary user.** This mattered when wiring up the profile page: naively calling `/api/roadmap` from `user/[username]/page.tsx` would have shown the *viewer's* progress on someone else's profile, because `src/lib/api.ts` always attaches the logged-in user's own ID token. The profile page instead fetches roadmap *structure* from `/api/roadmap` (track/category/problem shape, ignoring the per-viewer status field) and merges it with `/api/progress?userId=<profile.uid>` (public, keyed by the profile being viewed) to compute that user's actual per-category completion.

**Solution reveal is gated on `ProblemProgress` existing, not on a specific "gave up" flag.** `GET /api/problems/[slug]/solution` returns 403 unless the caller has a `ProblemProgress` row in `IN_PROGRESS` or `SOLVED` state. The practice page ensures this by calling `POST /api/progress/touch` (idempotent upsert to `IN_PROGRESS`) both on the user's first canvas edit and right before "View Solution" if they haven't touched the canvas at all — so solution-viewing without any attempt is not possible, matching "after submission or give up" from the spec, without needing a separate boolean flag.

## Code execution editor

**The CodeMirror workspace is canonical; OnlineCompiler is the execution engine.** The embedded OnlineCompiler widget can edit and run code independently, but its documented integration does not expose a supported way for the application to read current editor contents, initialize code, or subscribe to edits. Making it canonical would risk testing/submitting different source than the learner sees. A controlled CodeMirror Python editor keeps one source of truth for prior-version loading, stale-run detection, trusted server-side harness execution, persistence, and grading, while OnlineCompiler remains server-only.

**Provider execution failures are not learner runtime failures.** The adapter treats explicit provider `error` responses, unknown statuses, and generic internal execution messages as `provider_error`; it does not infer compile errors from exit code 1 or runtime errors from any nonempty error string. The UI labels `PROVIDER_ERROR` as retryable service unavailability and preserves bounded diagnostics.

## Grading

**Structural extraction only understands `geo`/`text`/`note` shapes as nodes and `arrow` bindings as edges.** This covers the overwhelming majority of how people actually draw system/object diagrams in tldraw (boxes + labeled arrows). Freehand `draw` shapes, images, and frames are ignored for grading purposes — they don't carry the required-component/connection signal the rubric checks for, and treating every shape type as a potential "component" would make fuzzy label-matching much noisier.

**The Gemini diagram grader is an optional supplement, not a hard requirement.** `gradeWithAi()` returns `null` (not a thrown error) if `GEMINI_API_KEY` is unset or the Gemini call fails for any reason, and `gradeSubmission()` falls back to `structural.coverage` alone with auto-generated feedback strings. Anthropic remains optional and separate for LLD code-quality grading. This is covered by the Gemini and grading tests, including blended-vs-fallback score math.

**The 50/50 blend and the 70% solved threshold are both env-configurable but not per-problem.** `SOLVED_THRESHOLD` (default 70) and the blend weighting are global constants rather than per-problem tuning knobs — reference diagrams' rubrics were validated (see below) to reliably hit 100% structural coverage on an exact match, so a single global threshold is meaningful across the whole content set.

**Every reference diagram is generated from its own rubric, not hand-drawn separately.** `content/autoLayout.ts` builds each problem's `referenceDiagram` directly from `rubric.requiredComponents` / `requiredConnections`, using a headless tldraw store (`content/diagramBuilder.ts`, built with `createTLStore()` + `store.getStoreSnapshot()` — no DOM/Editor needed at seed time). This guarantees the rubric and the diagram can never drift out of sync, and it's asserted by a round-trip check (extract the diagram back out with `extractGraph`, run it through `matchStructural`, expect 100% coverage) across the seeded catalog.

## tldraw integration specifics

**tldraw v5's `getSnapshot(store)` requires a live Editor session and cannot run headlessly**, despite its type signature accepting only a `TLStore`. `store.getStoreSnapshot()` (from `@tldraw/store`) is the store-only equivalent and is what both the headless diagram builder and the client-side `DesignCanvas` autosave use — this is also why `Problem.referenceDiagram` and `Submission.canvasSnapshot` are typed/stored as a `TLStoreSnapshot` (`{ store, schema }`), not a full `TLEditorSnapshot`. `Tldraw`'s `snapshot` prop accepts either shape, so this required no compromise on the editing side.

**tldraw's fractional-index keys (`IndexKey`) are not simple integers.** An early version of the diagram builder generated `"a1", "a2", ..., "a10"` for shape z-order, which failed tldraw's own validator (`"a10"` is not a valid key in its fractional-indexing scheme) — caught by running the content-validation round-trip script before considering the content task done. Fixed by using tldraw's own `getIndexAbove()` generator instead of hand-rolling index strings.

**`<Tldraw>` is loaded via `next/dynamic` with `ssr: false`.** tldraw depends on browser-only APIs (ResizeObserver, canvas measurement, etc.) that break on the server render pass; `DesignCanvas` dynamically imports it client-only, matching the standard tldraw + Next.js App Router integration pattern.

## Content authoring

**No markdown library was added.** Problem descriptions and reference explanations use a small, deliberately limited markdown subset (paragraphs, `**bold**`, `- ` bullet lists) rendered by a ~70-line hand-written component (`src/components/Markdown.tsx`) rather than pulling in `react-markdown` or similar — the content doesn't need tables, code blocks, or nested lists, and a dependency-free renderer keeps bundle size down and trivially matches the existing design tokens (no prose-CSS override fighting needed).

**15 problems per track rather than "15-20" exactly (30 total: 15 System Design, 15 LLD).** Chosen to keep every problem's description, rubric, and explanation genuinely substantive (interview-realistic requirements, specific non-obvious trade-off callouts in the reference explanation) rather than padding the count with filler entries. The schema and seed script scale to hundreds of problems without changes, so growing the catalog later is just adding more `ProblemSpec` entries.
