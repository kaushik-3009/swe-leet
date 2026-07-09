# Local Setup

## Worktree

This feature was built on branch `feature/system-design-platform`, in an isolated git worktree so `main` was never touched during development:

```bash
git worktree add ../swe-leet-sdp feature/system-design-platform
cd ../swe-leet-sdp
```

To merge later: open a PR from `feature/system-design-platform` into `main` as usual, or `git merge feature/system-design-platform` from a `main` checkout. To remove the worktree once merged: `git worktree remove ../swe-leet-sdp`.

## Prerequisites

- Node.js (matching the version `next@16` expects — Node 20+)
- A [Neon](https://neon.tech) Postgres project (free tier is enough for development)
- A Firebase project with Auth (Email/Password) enabled — reuse the existing one from before this feature
- (Optional) An [Anthropic API key](https://console.anthropic.com) for AI-assisted grading feedback

## First-time setup

```bash
npm install

cp .env.example .env
# fill in .env — see docs/ENV.md for where each value comes from

npm run db:migrate      # applies prisma/schema.prisma to your Neon database
npm run seed:content    # seeds the 11 categories + 29 System Design/LLD problems

npm run dev
```

Open http://localhost:3000, sign up (this creates both a Firebase Auth account and a Postgres `User` row), and:
- Use "Load Demo" on the dashboard to seed 5 demo users with study history (heatmap/entry log), same as before this feature.
- Visit `/roadmap` to browse System Design / LLD problems.
- Open a problem to reach `/practice/[slug]` — the tldraw canvas, submit-for-grading, and view-solution flow.

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

## Deployment notes

- Still deploys to Vercel with zero extra config beyond the new env vars (Vercel's Postgres integration is Neon under the hood, so `DATABASE_URL`/`DATABASE_URL_UNPOOLED` can come directly from a Vercel-managed Neon instance too).
- Run `npm run db:deploy` (not `db:migrate`, which is interactive) as part of your deploy pipeline before the new app version starts serving traffic.
