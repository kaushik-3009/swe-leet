# Resume Brief

A concise, factual summary of this project suitable for a resume bullet, portfolio blurb,
or interview talking point. Pulled together after the v2 build-out; update it if the scope
changes materially.

## One-liner

Built a full-stack System Design + LLD interview practice platform: curated study plans,
an exhaustive problem catalog, an infinite-canvas design sandbox with hybrid AI/structural
grading, and a code-submission mode for LLD, on top of an existing study-tracking app.

## What it does

- **Study plans** for System Design and LLD, organized into topics. Each topic page
  combines curated external resources (docs, blog posts, primers) with an original,
  illustrated on-site article, plus a small "bridge into practice" problem subset, all
  individually checkbox-trackable.
- **Problem catalog**, NeetCode-150-style: dozens of System Design and LLD problems,
  grouped by topic and ordered by difficulty, each with a detailed requirements/
  constraints write-up (not a one-liner), general + incremental step hints, and (where
  verified) a linked walkthrough video.
- **Practice sandbox**: an infinite tldraw canvas with a system-architecture shape
  palette (load balancer, cache, queue, database, CDN, API gateway, etc.) for System
  Design problems and a class-diagram-oriented palette for LLD, plus a dedicated code
  editor mode for LLD problems where users write real implementations instead of (or
  alongside) a diagram.
- **Hybrid grading**: a deterministic structural check (does the submission actually
  contain the required components/relationships) blended with an LLM evaluation
  (correctness, structure, OOP-principle adherence for code; design rationale coverage
  for diagrams), with automatic graceful fallback to structural-only scoring if no AI
  API key is configured.
- **Progressive solution reveal**: instead of a single "show answer" button, solutions
  unlock step by step, the user has to click through each reasoning step before the full
  diagram, reference code, and rationale become visible, an explicit anti-shortcut design
  for a "give up" flow rather than an all-or-nothing dump.
- **Activity tracking** unified across the whole app: a GitHub-style heatmap and entry
  log that automatically capture every kind of study activity (manual log entries, topic
  article reads, resource checkbox completions, problem checklist completions, canvas/
  code submissions), each visually distinguished, with zero manual logging required for
  in-app activity.
- **Social layer** (pre-existing, preserved): friend follow/search and public profile
  pages now also surface roadmap progress and solved-problem history.

## Technical highlights

- **Migrated the data layer from Firestore to Postgres** (Neon, via Prisma 7 and
  `@prisma/adapter-neon`) mid-project, while keeping Firebase for authentication only,
  including a from-scratch idempotent, paginated migration script for existing production
  user/entry/follow data.
- **Diagnosed and fixed a real production performance bug**: the dashboard was making
  five independent full-table fetches of the same growing entries table on every load.
  Replaced with a single aggregated endpoint using Postgres `groupBy`, cursor pagination
  for the full activity log, and `unstable_cache`-backed content caching for semi-static
  roadmap/problem data, verified against the app's 20-30 concurrent user launch target.
- **Built a two-track grading engine** from scratch (canvas graph extraction + fuzzy
  structural matching + tool-call-constrained LLM evaluation for diagrams; a parallel,
  independently-weighted pipeline for code submissions), with deterministic, unit-tested
  fallback behavior when the AI provider is unavailable.
- **Content-as-code authoring pipeline**: typed content specs, an idempotent seed script
  with stale-row pruning, and headless reference-diagram generation directly from each
  problem's grading rubric (verified via an automated round-trip check so content and
  rubric can never silently drift apart).
- Investigated a reported cross-browser canvas bug empirically (Playwright, both Chromium
  and WebKit engines, real pointer-event sequences) rather than assuming it was real,
  found it wasn't reproducible, and documented the investigation so it isn't re-litigated.

## Stack

Next.js 16 (App Router) - React 19 - TypeScript - Tailwind CSS v4 - Neon Postgres - Prisma
7 - Firebase Auth - tldraw - Anthropic Claude (Haiku, tool-use grading) - Vitest - Vercel.
