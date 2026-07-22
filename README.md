<div align="center">

# System Design Tracker

A study tracker and interview-practice platform for System Design and Low-Level Design preparation.

![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=flat&logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat&logo=typescript&logoColor=white)
![Postgres](https://img.shields.io/badge/Postgres-Neon-00E5A0?style=flat&logo=postgresql&logoColor=white)
![Firebase Auth](https://img.shields.io/badge/Auth-Firebase-FFCA28?style=flat&logo=firebase&logoColor=black)

</div>

## What it does

- Curated System Design and LLD study plans with resources, articles, hints, and progressive solution reveals.
- A tldraw practice canvas with deterministic graph extraction and rubric matching.
- Optional Gemini semantic diagram feedback with the configured model fallback chain:
  `gemini-3.5-flash-lite`, `gemini-3.1-flash-lite`, `gemini-2.5-flash-lite`.
- LLD code mode with typed Python public-test contracts. The current content has 15 LLD problems and no hidden tests.
- Firebase Authentication with Postgres and Prisma for profiles, activity, progress, submissions, and social relationships.
- Explicitly labeled synthetic staging data for deterministic demo and load checks. Synthetic rows are excluded from default metrics.

## Tech stack

- Next.js 16 App Router and React 19
- TypeScript and Tailwind CSS v4
- Prisma 7 with Neon Postgres and `@prisma/adapter-neon`
- Firebase Authentication, with Firebase Admin token verification on the server
- tldraw for the diagram canvas
- Vitest for unit, API, and content-integrity tests

## Local setup

### Prerequisites

- Node.js 20 or newer
- A Firebase project with Email/Password authentication enabled
- A Neon Postgres database

### Install

```bash
npm install
cp .env.example .env
```

Fill in the Firebase Admin and database variables. Keep `DATABASE_URL` pooled for runtime traffic and `DATABASE_URL_UNPOOLED` for Prisma migrations.

Generate the Prisma client and apply the checked-in migrations:

```bash
npm run db:generate
npm run db:deploy
npm run seed:content
```

For local development, `npm run db:migrate` can be used after reviewing the pending migration against the target database.

Start the app:

```bash
npm run dev
```

Open <http://localhost:3000> and create an account. Firebase Auth creates the identity, and the signup route creates the matching Postgres `User` row.

## Environment variables

Copy `.env.example` and add values locally. Important server-only variables include:

- `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, `FIREBASE_ADMIN_PRIVATE_KEY`
- `DATABASE_URL`, `DATABASE_URL_UNPOOLED`
- `GEMINI_API_KEY` for optional diagram semantics
- `ONLINECOMPILER_REST_API_KEY` for server-side Python execution
- `DEMO_ADMIN_SECRET` for any explicitly enabled demo compatibility route

The LLD CodeMirror workspace is application-controlled; OnlineCompiler runs trusted public tests server-side. Never put the REST key, Gemini key, Firebase Admin private key, or database password in client code.

## Testing

```bash
npm test
npm run lint
npx tsc --noEmit
npm run build
```

The current automated verification baseline is 90 passing tests across 15 files, successful
TypeScript validation, a successful production build, an up-to-date Prisma migration state,
and a clean `git diff --check`. Full-repository lint still reports pre-existing errors in
`AuthPage.tsx`, `AuthProvider.tsx`, `Navbar.tsx`, and `ThemeProvider.tsx`; changed feature
files lint clean. Content integrity tests validate that every LLD reference solution and
public harness are present; a controlled provider smoke pass currently verifies all 15
reference solutions remotely. Provider integrations should be tested with mocked responses
in unit tests and with rotated credentials only in a controlled staging environment; see
[`docs/SETUP.md`](./docs/SETUP.md) for smoke-check commands.

## Synthetic demo data

Synthetic data is not real-user evidence. It must only be generated in staging or another explicitly approved non-production environment:

```bash
npm run demo:generate -- --run-id=synthetic-demo-v1
npm run metrics:report
npm run metrics:report -- --include-synthetic
```

The generator creates 75 deterministic profiles labeled `isSynthetic=true`, along with repeatable sample activity and progress. The default metrics report excludes them. The optional synthetic section is labeled as test data and must not be described as adoption, DAU, retention, or customer growth.

## Architecture and operations

See the detailed guides in [`docs/`](./docs/):

- [`ARCHITECTURE.md`](./docs/ARCHITECTURE.md)
- [`API.md`](./docs/API.md)
- [`SCHEMA.md`](./docs/SCHEMA.md)
- [`LLD.md`](./docs/LLD.md)
- [`ENV.md`](./docs/ENV.md)
- [`SETUP.md`](./docs/SETUP.md)
- [`RUNBOOK.md`](./docs/RUNBOOK.md)

## License

MIT. See [`LICENSE`](./LICENSE).
