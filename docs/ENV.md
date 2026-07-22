# Environment Variables

Copy `.env.example` to `.env` and fill in real values. `.env` is ignored and must never be committed.

## Firebase client authentication

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase web app config |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase web app config |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase web app config |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase web app config |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase web app config |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase web app config |

These values are intentionally public Firebase client configuration. They are not substitutes for server credentials.

## Firebase Admin server credentials

| Variable | Purpose |
|---|---|
| `FIREBASE_ADMIN_PROJECT_ID` | Admin SDK project id |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | Admin SDK service account email |
| `FIREBASE_ADMIN_PRIVATE_KEY` | Admin SDK private key, with literal `\n` escapes in `.env` |

Never prefix these variables with `NEXT_PUBLIC_`.

## Neon Postgres

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Pooled runtime connection used by the Next.js app |
| `DATABASE_URL_UNPOOLED` | Direct connection used by Prisma migration/studio commands |

The initial migration is checked in under `prisma/migrations/`. The current grading/execution migration adds diagram metadata, Python execution specs, CodeRun records, synthetic profile labels, and rate-limit buckets.

## Diagram grading

| Variable | Default | Purpose |
|---|---:|---|
| `GEMINI_API_KEY` | unset | Server-only Google Gemini key |
| `GEMINI_GRADING_ENABLED` | `true` | Set `false` to force structural-only grading |
| `GEMINI_GRADING_MODELS` | requested three-model chain | Comma-separated ordered fallback models |
| `GEMINI_GRADING_TIMEOUT_MS` | `10000` | Per-model grading timeout, bounded by the adapter |

The default order is `gemini-3.5-flash-lite`, then `gemini-3.1-flash-lite`, then `gemini-2.5-flash-lite`. If no key, SDK, or valid response is available, submissions remain scoreable using deterministic structural grading.

`ANTHROPIC_API_KEY` and `GRADING_MODEL` remain for the existing LLD code-quality evaluator. Anthropic is not the diagram evaluator in this phase.

## OnlineCompiler

| Variable | Exposure | Purpose |
|---|---|---|
| `ONLINECOMPILER_REST_API_KEY` | server-only | Authenticated REST execution for trusted public Python tests |
| `ONLINECOMPILER_ENABLED` | server | Set `false` to disable provider execution |

The CodeMirror editor is application-controlled and is the canonical source for both public-test runs and submissions. OnlineCompiler is used server-side as the execution engine. The REST key must never be placed in browser code, `NEXT_PUBLIC_*` variables, logs, prompts, or documentation.

## Synthetic demo data

| Variable | Default | Purpose |
|---|---:|---|
| `DEMO_DATA_ENABLED` | `false` | Enables the guarded compatibility route only |
| `DEMO_ADMIN_SECRET` | unset | Admin header for the compatibility route |

The preferred generator is `npm run demo:generate -- --run-id=<id>` with `--environment=staging`. It creates 75 deterministic profiles marked `isSynthetic=true`. Synthetic profiles are excluded from the default metrics report and must never be described as real users or product traction.

## Safety notes

- `.env.example` is tracked; `.env` is not.
- Rotate any credential that appears in terminal history or chat transcripts.
- Do not add API keys, database URLs, Firebase private keys, provider responses, or raw user code to source, tests, docs, or the private resume brief.
