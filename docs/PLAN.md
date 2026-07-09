# System Design + LLD Practice Platform — Plan

This is the plan that was approved before implementation began (branch `feature/system-design-platform`). It is kept here as a historical record; see `docs/DECISIONS.md` for decisions/trade-offs made *during* implementation that refine or extend it.

## Context

The app (`swe-leet` / "SD Tracker") is a Next.js 16 App Router + React 19 + TS + Tailwind v4 study tracker on Firebase (Auth + Firestore). It had a heatmap, an entry log, and a friend/follow system — all client-side Firestore. This work extends it into a LeetCode/NeetCode-style practice platform for **System Design** and **LLD**: curated problem roadmaps, an infinite-canvas practice sandbox, AI-assisted grading against reference solutions, and integration of solved/attempted problems into the existing heatmap, entry log, and friend profiles.

**Locked decisions:**
- DB: **Neon Postgres** via **Prisma** ORM. Migrate all relational data off Firestore.
- Auth: **Keep Firebase Auth.** `firebase-admin` verifies ID tokens server-side. Postgres `User` rows are keyed by the Firebase `uid`.
- Grading: **Hybrid** — structural rubric match + Claude evaluator (Anthropic API).
- Canvas: **tldraw** — typed shape store + arrow bindings make structural extraction/grading feasible; JSON snapshots make save/version trivial.
- The existing design system (CSS variables in `globals.css`, the `max-w-[1400px]` shell, IBM Plex Mono / Inter, inline JS hover/focus styling) is preserved exactly; no new UI framework or token system was introduced.

## What was built

1. **Data layer** — Prisma schema (`prisma/schema.prisma`) covering `User`, `Follow`, `StudyEntry`, `Category`, `Problem`, `ProblemProgress`, `Submission`, `Review`, connected to Neon via `@prisma/adapter-neon`.
2. **Server auth + API layer** — `firebase-admin` ID token verification (`src/lib/auth-server.ts`) and ~20 Next.js Route Handlers under `src/app/api/**` replacing all direct Firestore access from the client.
3. **Data migration** — `scripts/migrate-firestore-to-postgres.ts`, idempotent, paginated, with a post-migration count verification step.
4. **Curated content** — 29 problems (15 System Design, 14 LLD) across 11 categories in `content/`, each with a rubric, a markdown description/explanation, and a reference tldraw diagram generated headlessly from the rubric.
5. **Practice sandbox** — `DesignCanvas` (tldraw wrapper) and `/practice/[slug]`, with autosave-triggered progress tracking, submission versioning, and a feedback panel.
6. **Grading** — `src/lib/grading/*`: deterministic structural matching (`structural.ts`) blended 50/50 with a Claude tool-call evaluator (`ai.ts`), with automatic fallback to structural-only scoring if no API key is configured or the call fails.
7. **Roadmap + profile integration** — `/roadmap` (per-category progress, problem list, status chips) and an extended `/user/[username]` profile showing solved problems and roadmap progress for any user (including friends).
8. **Tests** — Vitest unit tests for the grading engine (extraction, structural matching, AI fallback, score blending) and integration tests for the highest-risk API routes (submissions, entries, progress).

See `docs/SCHEMA.md`, `docs/API.md`, `docs/MIGRATION.md`, `docs/SETUP.md`, and `docs/ENV.md` for the details of each area.
