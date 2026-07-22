# Runbook

Everything needed to take this app from an empty machine to a running local instance,
and from a running local instance to a live production deployment. For "why" a piece is
built the way it is, see `docs/DECISIONS.md`; for "what each env var is," see `docs/ENV.md`;
for known limitations, see `docs/ISSUES.md`.

## 1. Accounts you need before starting

| Service | Used for | Free tier sufficient? |
|---|---|---|
| [Neon](https://neon.tech) | Postgres database | Yes, for dev and for the 20-30 concurrent user launch target |
| [Firebase](https://console.firebase.google.com) | Auth (Email/Password) | Yes |
| [Google AI Studio](https://aistudio.google.com) | Optional Gemini diagram semantics | Optional (grading falls back to structural-only scoring without it) |
| [Anthropic Console](https://console.anthropic.com) | Existing LLD code-quality grading | Optional |
| [OnlineCompiler](https://onlinecompiler.io/docs) | Server-side Python public-test execution | Configure only after rotating provider credentials |
| [Vercel](https://vercel.com) | Hosting | Yes, for launch scale |

If you're continuing an existing deployment, reuse the same Firebase project as before
this feature (Auth accounts are untouched by anything in this doc); only the database
layer moved from Firestore to Postgres.

## 2. Local environment setup

```bash
git clone <repo>
cd swe-leet   # or the worktree checkout, see docs/SETUP.md

npm install

cp .env.example .env
```

Fill in `.env`:

1. **Firebase client config** (`NEXT_PUBLIC_FIREBASE_*`): Firebase Console -> Project
   Settings -> General -> your web app's config block. Six values, copy verbatim.
2. **Firebase Admin** (`FIREBASE_ADMIN_*`): Firebase Console -> Project Settings ->
   Service Accounts -> "Generate new private key". This downloads a JSON file with
   `project_id`, `client_email`, and `private_key`. Copy those three fields into the
   three `FIREBASE_ADMIN_*` vars. Keep the private key's `\n` escape sequences literal
   and wrap the value in quotes.
3. **Neon Postgres** (`DATABASE_URL`, `DATABASE_URL_UNPOOLED`): create a Neon project,
   open Connection Details, and copy both the pooled ("Pooled connection") and direct
   ("Direct connection") connection strings. Full detail in `docs/ENV.md`.
4. **Gemini** (`GEMINI_API_KEY`, optional): configure a server-only key and leave the
   requested model chain in `GEMINI_GRADING_MODELS`. Set `GEMINI_GRADING_ENABLED=false`
   to force deterministic structural-only grading.
5. **Anthropic** (`ANTHROPIC_API_KEY`, optional): used only for LLD code-quality feedback.
6. **OnlineCompiler**: configure a rotated server-only `ONLINECOMPILER_REST_API_KEY`.
   The CodeMirror workspace is application-controlled, and the REST key is never used in
   browser code.

## 3. Database setup (first time)

```bash
npm run db:generate     # regenerate the Prisma client after schema changes
npm run db:deploy       # apply checked-in migrations non-interactively
npm run seed:content    # idempotently upserts categories/resources/articles/problems
npm run dev
```

Open http://localhost:3000, sign up. This creates a Firebase Auth account and a matching
Postgres `User` row in one step.

Re-running `npm run seed:content` at any time is safe: it's an upsert keyed by slug/title,
so it picks up content edits without duplicating rows, and prunes resources that were
removed from `content/categories.ts`.

## 4. If you have existing production Firestore data

This applies only if you're migrating an older Firestore-only deployment (before this
feature existed) onto the new Postgres schema, not to a fresh install.

```bash
npm run db:deploy           # non-interactive migration apply, safe for existing data
npm run migrate:firestore   # idempotent: users, entries, and the follow graph
```

Full detail, including what is and isn't migrated, in `docs/MIGRATION.md`.

## 5. Running the app locally, day to day

```bash
npm run dev              # dev server, http://localhost:3000
npm run lint              # ESLint
npm run test               # Vitest once
npm run test:watch        # Vitest watch mode
npm run test:coverage     # Vitest with coverage report
npx tsc --noEmit           # type-check without emitting
npm run build              # production build (also type-checks)
```

After changing `prisma/schema.prisma`:

```bash
npm run db:generate   # regenerate the Prisma client
npm run db:migrate     # create + apply a new migration (interactive, dev only)
```

After changing anything under `content/` (categories, problems, resources, hints,
solutions):

```bash
npm run seed:content
```

## 6. Manual smoke test (do this once after any schema/content/grading change)

1. Sign up / log in.
2. Dashboard loads with heatmap, weekly goal widget, recent entries. Click "Load Demo" to
   populate sample history if the account is new.
3. `/study-plan` -> pick a track -> click a topic card -> topic page loads with resources,
   the on-site article, and the practice-problem subset. Check a resource checkbox, open
   the article (confirm it logs a view, visible as a new "Read our topic article" row in
   the entry log after a refresh), check a subset problem.
4. `/roadmap` -> confirm the problem you just checked off in step 3 shows as Solved here
   too (bidirectional sync), and that checking a different problem here works.
5. Open a System Design problem's practice page: draw on the canvas using the shape
   palette buttons, submit for grading, confirm a score and feedback appear, confirm the
   entry log picked up a new `problem_attempt` or `problem_solved` row.
6. Open an LLD problem's practice page: toggle to "Write Code", type something, submit,
   confirm a score appears. Toggle back to "Class Diagram" and confirm the canvas mode
   still works independently.
7. Click "I'm Stuck, Reveal Solution" on any problem: confirm it opens in step-by-step
   mode (not all at once), and that revealing all steps unlocks the full diagram/code/
   rationale.
8. Visit your own `/user/<username>` profile and a friend's, confirm both render and that
   entry-kind badges (manual, problem started, problem solved, checklist, resource, article)
   are visually distinct in the entry log.
9. On an LLD practice page, enter a small Python implementation and click `Run public tests`.
   Verify named pass/fail rows, aggregate counts, duration/memory when available, and the
   stale-run warning after editing the code. Confirm this exploratory run does not create a
   study entry or change problem progress.
10. Click `Submit Code for Grading` and confirm the submission receives code-quality feedback,
    the public execution result is linked to it, and progress/activity behavior remains intact.
11. With Gemini configured, submit a diagram and confirm safe grading metadata identifies the
    served model. Temporarily disable Gemini and confirm deterministic structural-only grading
    still returns a score. Do not place provider keys in browser variables or inspectable source.
12. Verify the CodeMirror Python workspace loads with line numbers, syntax highlighting,
    indentation, and bracket matching. Confirm the visible editor content is exactly what
    `Run public tests` and `Submit Code for Grading` send to the server.

There is no automated end-to-end browser test in this repo (see `docs/ISSUES.md` for why);
this manual pass is the closest substitute and should be run after any change that touches
grading, the schema, provider integrations, or a page that reads `/api/dashboard` or
`/api/roadmap`.

## 7. Synthetic staging data and metrics

Generate deterministic sample data only in staging:

```bash
npm run demo:generate -- --run-id=synthetic-demo-v1
npm run metrics:report
npm run metrics:report -- --include-synthetic
```

The generator creates 75 profiles marked `isSynthetic=true` and repeatable activity. It
never mutates the authenticated caller and never deletes rows. The default metrics report
excludes synthetic users. The optional section is labeled synthetic test data and cannot be
used as evidence of real-user adoption, DAU, retention, or growth.

The HTTP demo routes are disabled by default. The seed compatibility route requires
`DEMO_DATA_ENABLED=true` plus `x-demo-admin-secret` and still points operators to the
staging CLI. Cleanup is a reviewed database-admin operation with an explicitly supplied
synthetic run id, not an unauthenticated endpoint.

## 8. Deploying to production (Vercel + Neon)

1. Push the branch, open a PR into `main`, merge once reviewed.
2. In Vercel, import the repo (or it's already connected: pushing to `main` triggers a
   deploy).
3. Set every env var from `.env` in Vercel's Project Settings -> Environment Variables
   (Production and Preview). If you provision Neon through Vercel's own Postgres
   integration, `DATABASE_URL`/`DATABASE_URL_UNPOOLED` are filled in automatically.
4. Add a "Run Command" pre-deploy step (or run manually once per release) for
   `npm run db:deploy` so pending migrations apply before the new app version serves
   traffic. `db:deploy` is non-interactive and safe to run repeatedly (no-op if there's
   nothing pending).
5. Run `npm run seed:content` once against the production database after the first
   deploy (and again any time `content/` changes ship) — it's a separate step from
   `db:deploy` because it's idempotent content, not a schema migration. Point
   `DATABASE_URL_UNPOOLED` at the production Neon direct connection string when running
   it from a local machine, or run it as a one-off Vercel job.
6. Smoke test against the production URL using the checklist in section 6.

## 8. Scaling notes (why this should hold 20-30 concurrent, then a couple hundred)

- **Database**: Neon Postgres with a pooled connection (`DATABASE_URL`, via PgBouncer)
  for all runtime queries. Every list/aggregate endpoint (`/api/dashboard`,
  `/api/roadmap`, `/api/problems`) uses Postgres-side `groupBy`/aggregation and explicit
  `select` clauses instead of pulling full tables client-side, see `docs/DECISIONS.md`
  and `docs/ISSUES.md` for the specific over-fetch bugs this fixed.
- **Caching**: category/problem content (identical for every user, changes only via
  `seed:content`) is cached with Next.js `unstable_cache` for 60 seconds, so it's not
  re-queried from Postgres on every roadmap/topic page view under load.
- **Pagination**: the entries log uses cursor pagination (`GET /api/entries`), never a
  full unbounded table scan.
- **Grading cost**: AI grading calls a cheap model (`claude-haiku-4-5` by default) and
  only runs on explicit submission, not on every keystroke/autosave (canvas autosave is
  debounced 800ms and only persists a snapshot, it doesn't grade).
- **Serverless-friendly**: Prisma is configured with `@prisma/adapter-neon`
  (`src/lib/db.ts`), which works correctly with Neon's HTTP-based driver over serverless
  function invocations (no long-lived connection pool exhaustion issue that a raw
  `pg` pool would hit on Vercel).
- At a couple hundred users, the main thing to revisit first is the `unstable_cache`
  revalidate window (currently tuned for content freshness over raw throughput) and,
  if AI grading volume grows significantly, `GRADING_MODEL` cost/latency trade-offs.
  Neither requires a schema or API redesign.
