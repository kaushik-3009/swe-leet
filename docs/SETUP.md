# Local Setup

## Worktree

This feature was built on branch `feature/platform-v2`, in an isolated git worktree so `main` was never touched during development:

```bash
git worktree add ../swe-leet-sdp feature/platform-v2
cd ../swe-leet-sdp
```

To merge later: open a PR from `feature/platform-v2` into `main` as usual, or `git merge feature/platform-v2` from a `main` checkout. To remove the worktree once merged: `git worktree remove ../swe-leet-sdp`.

## Prerequisites

- Node.js (matching the version `next@16` expects — Node 20+)
- A [Neon](https://neon.tech) Postgres project (free tier is enough for development)
- A Firebase project with Auth (Email/Password) enabled — reuse the existing one from before this feature
- (Optional) A [Google AI Studio](https://aistudio.google.com) Gemini key for semantic diagram feedback
- (Optional) An [Anthropic API key](https://console.anthropic.com) for LLD code-quality feedback
- (Optional) An OnlineCompiler REST key for server-side LLD public tests

## First-time setup

```bash
npm install

cp .env.example .env
# fill in .env — see docs/ENV.md for where each value comes from

npm run db:generate
npm run db:deploy       # applies checked-in migrations to Neon
npm run seed:content    # seeds 11 categories + 30 System Design/LLD problems

npm run dev
```

Open http://localhost:3000, sign up (this creates both a Firebase Auth account and a Postgres `User` row), and:
- Visit `/roadmap` to browse 15 System Design and 15 LLD problems.
- Open a problem to reach `/practice/[slug]` — the tldraw canvas, grading, solution flow, and LLD code mode.
- In LLD code mode, use `Run public tests` for the trusted Python harness; exploratory runs do not update progress or the heatmap.
- Use `npm run demo:generate -- --run-id=<id>` only in staging for explicitly labeled synthetic sample data.

## If you have existing production Firestore data to migrate

See `docs/MIGRATION.md`. In short: `npm run migrate:firestore` after setting `FIREBASE_ADMIN_*` and running `npm run db:deploy`.

## Useful scripts

| Command | Does |
|---|---|
| `npm run dev` | Start the Next.js dev server |
| `npm run build` / `npm run start` | Production build / run |
| `npm run lint` | ESLint |
| `npm run test` | Run the Vitest suite once |
| `npm run test:watch` | Vitest in watch mode |
| `npm run test:coverage` | Vitest with a coverage report |
| `npm run db:generate` | Regenerate the Prisma client after a schema change |
| `npm run db:migrate` | Create/apply a dev migration (interactive) |
| `npm run db:deploy` | Apply pending migrations non-interactively (CI/prod) |
| `npm run db:studio` | Prisma Studio — browse/edit the Postgres data visually |
| `npm run seed:content` | Idempotently upsert all roadmap categories/problems |
| `npm run migrate:firestore` | One-time Firestore → Postgres data migration |
| `npm run demo:generate -- --run-id=<id>` | Create deterministic synthetic staging data |
| `npm run metrics:report` | Report non-synthetic operational metrics |
| `npm run metrics:report -- --include-synthetic` | Add a separately labeled synthetic test-data section |

## Provider smoke checks

Run these only with controlled, rotated credentials. The Gemini and OnlineCompiler REST
keys are server-only. The CodeMirror editor remains application-controlled; OnlineCompiler
runs the trusted public harness on the server.

```bash
npx tsx -e 'import "dotenv/config"; import { generateGeminiContent } from "./src/lib/grading/gemini"; void (async () => { const r = await generateGeminiContent({ model: "gemini-3.5-flash-lite", prompt: "Return a JSON grading object with score 100 and empty arrays for strengths, missing, and improvements.", timeoutMs: 10000 }); console.log({ ok: Boolean(r), textLength: r?.text.length ?? 0 }); })();'
npx tsx -e 'import "dotenv/config"; import { runPython } from "./src/lib/compiler/onlineCompiler"; void (async () => { const r = await runPython("print(2 + 2)"); console.log({ status: r.status, output: r.output }); await import("./src/lib/db").then(({ prisma }) => prisma.$disconnect()); })();'
```

The first command verifies the configured Gemini provider boundary. The second verifies
server-side OnlineCompiler execution. Neither command should print credentials. A successful
provider check does not replace a signed-in browser smoke test of `/practice/[slug]`.

## Deployment notes

- Still deploys to Vercel with zero extra config beyond the new env vars (Vercel's Postgres integration is Neon under the hood, so `DATABASE_URL`/`DATABASE_URL_UNPOOLED` can come directly from a Vercel-managed Neon instance too).
- Run `npm run db:deploy` (not `db:migrate`, which is interactive) as part of your deploy pipeline before the new app version starts serving traffic.
- Run `npm run seed:content` after migrations and whenever content changes. It is idempotent and exits only after Prisma cleanup completes.
- Configure `ONLINECOMPILER_REST_API_KEY` only as a server secret. The CodeMirror workspace and server public-test route do not require a browser-exposed OnlineCompiler key.
