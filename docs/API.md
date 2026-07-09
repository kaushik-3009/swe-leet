# API Reference

All routes are Next.js Route Handlers under `src/app/api/`. Every response is one of:

```ts
{ data: T }       // 2xx
{ error: string } // 4xx/5xx
```

Auth: send `Authorization: Bearer <Firebase ID token>` on any route marked **auth required**. The client wrapper (`src/lib/api.ts`) attaches this automatically from the current Firebase session. Routes marked **public** take an explicit `userId`/`problemId` and require no token — this is what powers reading a friend's profile.

## Users

| Route | Method | Auth | Notes |
|---|---|---|---|
| `/api/users/register` | POST | required | Creates the Postgres `User` row after Firebase signup. Body `{ username }`. 409-equivalent (422) if taken. |
| `/api/users/me` | GET | required | Current user's profile. |
| `/api/users/search?q=` | GET | required | Prefix search on username, excludes self, max 10. |
| `/api/users/[username]` | GET | public | Profile lookup by username. |

## Entries (study log / heatmap source)

| Route | Method | Auth | Notes |
|---|---|---|---|
| `/api/entries?userId=` | GET | public | All entries for a user, newest first. |
| `/api/entries` | POST | required | Body `{ topic, resource }`. Always creates for the caller; `kind: manual`. |
| `/api/entries/[id]` | DELETE | required | Owner-only (403 otherwise). |
| `/api/heatmap?userId=` | GET | public | `{ [date: string]: count }`, derived from entries. |
| `/api/demo/seed` | POST | required | Seeds 5 demo users (idempotent) + 30 days of random entries for the caller. |
| `/api/demo/clear` | POST | required | Deletes all of the caller's entries. |

## Follow graph

| Route | Method | Auth | Notes |
|---|---|---|---|
| `/api/follow` | POST | required | Body `{ targetUid }`. Upsert (idempotent). |
| `/api/follow` | DELETE | required | Body `{ targetUid }`. |
| `/api/follow/status?targetUid=` | GET | required | `{ following: boolean }` for the caller. |
| `/api/follow/counts?userId=` | GET | public | `{ followers, following }`. |
| `/api/follow/followers?userId=` | GET | public | Full profile list. |
| `/api/follow/following?userId=` | GET | public | Full profile list. |

## Roadmap & problems

| Route | Method | Auth | Notes |
|---|---|---|---|
| `/api/problems?track=&categoryId=` | GET | public | List of `ProblemSummary` (no description/rubric). |
| `/api/problems/[slug]` | GET | public | Full `ProblemDetail` including description. Rubric/diagram/explanation are **not** included here. |
| `/api/problems/[slug]/solution` | GET | required | Reference diagram + explanation + rubric. **403** unless the caller has a `ProblemProgress` row (i.e. has touched the canvas or submitted at least once). |
| `/api/roadmap?track=` | GET | optional | Categories + problems. If authenticated, each problem includes **the caller's own** status/bestScore; unauthenticated calls return `NOT_STARTED` for everything. |
| `/api/progress?userId=` | GET | public | Solved/attempted problems for the given user — this, not `/api/roadmap`, is what friend profiles use to show someone else's progress. |
| `/api/progress/touch` | POST | required | Body `{ problemId }`. Idempotent upsert to `IN_PROGRESS` if not already started. Called on first canvas edit and before solution reveal. |

## Submissions (grading)

| Route | Method | Auth | Notes |
|---|---|---|---|
| `/api/submissions` | POST | required | Body `{ problemId, canvasSnapshot }`. Grades via `src/lib/grading`, persists a new `Submission` version, updates `ProblemProgress` (bestScore = max, status = SOLVED if score ≥ `SOLVED_THRESHOLD`), writes a `StudyEntry` (`kind: problem_attempt` or `problem_solved`) — this is the integration point with the existing heatmap/entry log. |
| `/api/submissions?problemId=` | GET | required | Caller's own submissions for a problem, newest version first. |
| `/api/submissions/[id]` | GET | required | Owner-only. |

## Reviews

| Route | Method | Auth | Notes |
|---|---|---|---|
| `/api/reviews?problemId=` | GET | public | |
| `/api/reviews` | POST | required | Body `{ problemId, rating (1-5), body }`. |

## Error codes

- `400` — malformed request (e.g. missing required query param)
- `401` — missing/invalid bearer token
- `403` — authenticated but not authorized for this resource (e.g. deleting someone else's entry, viewing a solution before attempting)
- `404` — resource not found
- `422` — request body failed zod validation (message is the joined validation errors)
