# Environment Variables

Copy `.env.example` to `.env` and fill in real values. All variables below are new except the `NEXT_PUBLIC_FIREBASE_*` block, which is unchanged from before this feature.

## Firebase (client-side auth) — unchanged

| Var | Where to get it |
|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase Console → Project Settings → General → Web app config |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | same |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | same |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | same |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | same |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | same |

## Firebase Admin (server-side, new)

Used to verify ID tokens on API routes (`src/lib/firebaseAdmin.ts`) and, one-off, by the Firestore migration script.

| Var | Where to get it |
|---|---|
| `FIREBASE_ADMIN_PROJECT_ID` | Firebase Console → Project Settings → Service Accounts → "Generate new private key" downloads a JSON with this field |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | same JSON, `client_email` |
| `FIREBASE_ADMIN_PRIVATE_KEY` | same JSON, `private_key` — **keep the literal `\n` sequences** in the `.env` value (wrap in quotes); the app calls `.replace(/\\n/g, "\n")` on read |

## Database (Neon Postgres, new)

| Var | Notes |
|---|---|
| `DATABASE_URL` | **Pooled** connection string (via PgBouncer) — used by the running app (`src/lib/db.ts`, through `@prisma/adapter-neon`). Get both from the Neon dashboard → your project → Connection Details. |
| `DATABASE_URL_UNPOOLED` | **Direct** connection string — used only by `prisma migrate`/`prisma studio` (configured in `prisma.config.ts`). Prisma Migrate needs a direct connection; pooled connections can't run schema migrations reliably. |

## Grading (Anthropic, new)

| Var | Default | Notes |
|---|---|---|
| `ANTHROPIC_API_KEY` | *(unset)* | Optional. If unset, grading silently falls back to structural-only scoring — no error, no degraded UX beyond less specific feedback. Get a key from the Anthropic Console. |
| `GRADING_MODEL` | `claude-haiku-4-5` | Model used to grade submissions. Deliberately a cheap/fast model since grading runs on every submission; upgrade if feedback quality needs to improve. |
| `SOLVED_THRESHOLD` | `70` | Score (0-100) at or above which a submission marks the problem `SOLVED` rather than `IN_PROGRESS`. |

## Notes

- `.env.example` is tracked in git (the `.gitignore` has an explicit `!.env.example` exception); `.env` itself is never committed.
- None of the new server-side variables (`FIREBASE_ADMIN_*`, `DATABASE_URL*`, `ANTHROPIC_API_KEY`) should ever be prefixed `NEXT_PUBLIC_` — doing so would bundle them into client JS.
