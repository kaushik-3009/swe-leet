# Firestore → Postgres Migration

## What moved, and what didn't

Moved to Postgres: `users`, `entries`, and the `following`/`followers` subcollections (flattened into one `Follow` table). Firebase is now used **only for authentication** — no app data lives in Firestore anymore, and `src/lib/firestore.ts` was deleted.

## Running the migration

Prerequisites: `FIREBASE_ADMIN_*` env vars (service account with Firestore read access to the *old* project) and `DATABASE_URL`/`DATABASE_URL_UNPOOLED` pointing at the target Neon database, with the schema already applied (`npm run db:deploy` or `npm run db:migrate`).

```bash
npm run migrate:firestore
```

This runs `scripts/migrate-firestore-to-postgres.ts`, which:

1. **Users** — reads the `users` collection, upserts each into `User` by uid (`username` lowercased, `createdAt` converted from Firestore `Timestamp`).
2. **Study entries** — reads `entries` in pages of 500 (ordered by `__name__`, cursor-paginated so it scales past a single-query limit), upserts each into `StudyEntry` **using the original Firestore document id as the Prisma id** — this keeps entries stable and re-runs idempotent. Entries whose `userId` doesn't match a migrated user are skipped (orphaned data).
3. **Follow graph** — a `collectionGroup('userFollowing')` query fetches every following-relationship across all users in one pass (follower id comes from `doc.ref.parent.parent.id`), and each is upserted into `Follow`. Relationships referencing a user that didn't migrate are skipped.
4. **Verification** — prints Postgres row counts for `User`, `StudyEntry`, and `Follow` at the end so you can eyeball them against the Firestore console.

The script is **idempotent** — every write is an upsert keyed by a stable id, so re-running it after fixing an issue (or to pick up new Firestore writes before cutover) is safe and won't create duplicates.

## What is *not* migrated automatically

- **Firebase Auth accounts themselves** — these aren't touched; users keep logging in with the same Firebase-managed credentials. Only the Postgres `User` profile row is created/updated.
- **The dead `usernames` Firestore collection** — this was write-only in the old code (never read; uniqueness was actually enforced via a query against `users`) and has no Postgres equivalent. Uniqueness is now a Postgres `@unique` constraint on `User.username`.
- **Anything related to the new roadmap/practice features** — there is no legacy data for problems, submissions, or progress; that's all seeded fresh via `npm run seed:content` (see `docs/SETUP.md`).

## Cutover sequence

1. Deploy the Postgres schema (`npm run db:deploy`).
2. Seed roadmap content (`npm run seed:content`).
3. Run the Firestore migration (`npm run migrate:firestore`) against production Firestore, with the app **not yet reading from Postgres** (i.e. before deploying this branch) or during a short maintenance window.
4. Deploy this branch (now reading/writing Postgres exclusively).
5. Re-run `npm run migrate:firestore` once more immediately before/after cutover to catch any writes that happened during the window — it's idempotent, so this is safe.
6. Once verified, Firestore can be left in place as a cold backup or the `entries`/`users`/`following`/`followers` collections deleted.
