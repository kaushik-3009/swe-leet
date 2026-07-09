# Database Schema

Postgres (Neon), managed via Prisma. Source of truth: `prisma/schema.prisma`.

## Core (migrated from Firestore)

### `User`
| Field | Type | Notes |
|---|---|---|
| `id` | `String` (PK) | Firebase Auth `uid` — not a generated id |
| `username` | `String` `@unique` | lowercase, 3-30 chars, `[a-zA-Z0-9_]` |
| `displayName` | `String` | original-case username at signup |
| `email` | `String` | lowercase |
| `createdAt` | `DateTime` | |

### `Follow`
Composite PK `(followerId, followingId)`, both FKs to `User.id`, cascade on delete. Replaces the old Firestore `following/{uid}/userFollowing/{targetUid}` + `followers/{uid}/userFollowers/{followerUid}` dual-write subcollections with a single flat table.

### `StudyEntry`
| Field | Type | Notes |
|---|---|---|
| `id` | `String` (PK, `cuid()`) | matches the original Firestore doc id after migration |
| `userId` | `String` (FK) | |
| `topic` / `resource` | `String` | as before |
| `date` | `String` | `YYYY-MM-DD`, unchanged format — this is what the heatmap groups by |
| `createdAt` | `DateTime` | |
| `kind` | enum `manual \| problem_attempt \| problem_solved` | new — lets problem activity flow into the same heatmap/entry log as manual study sessions |
| `problemId` | `String?` (FK, `SetNull` on delete) | set when `kind != manual` |

Indexes: `(userId, createdAt)` (entry list ordering), `(userId, date)` (heatmap aggregation).

## Roadmap content

### `Category`
Track (`SYSTEM_DESIGN | LLD`), `slug` (unique), `title`, `description`, `order`. 11 seeded categories, 5-6 per track, ordered foundational → advanced.

### `Problem`
Belongs to a `Category`. Fields: `track`, `slug` (unique), `title`, `description` (markdown), `difficulty` (`EASY|MEDIUM|HARD`), `tags: String[]`, `estMinutes`, `order`, `referenceExplanation` (markdown), `referenceDiagram` (`Json` — a tldraw `TLStoreSnapshot`), `rubric` (`Json`):

```ts
interface Rubric {
  requiredComponents: string[];
  requiredConnections: { from: string; to: string; label?: string }[];
  weights?: Record<string, number>; // reserved, unused by the current grader
}
```

29 seeded problems (15 System Design, 14 LLD) — see `content/system-design/problems.ts` and `content/lld/problems.ts`.

## Per-user progress & submissions

### `ProblemProgress`
Composite PK `(userId, problemId)`. `status: NOT_STARTED | IN_PROGRESS | SOLVED`, `bestScore` (max across all submissions), `updatedAt`. Created lazily — first row appears when a user touches the canvas (`POST /api/progress/touch`) or submits.

### `Submission`
One row per graded attempt. `userId`, `problemId`, `version` (auto-incrementing per user+problem), `canvasSnapshot` (`Json`, a tldraw `TLStoreSnapshot`), `score` (0-100), `feedback` (`Json`, `{ strengths, missing, improvements }`), `structuralResult` (`Json`, the raw rubric-match output). Versioned so users can revise and resubmit without losing history.

### `Review`
`problemId`, `userId`, `rating` (1-5), `body`, `createdAt`. Simple problem reviews; not surfaced in the UI yet beyond the API (`GET/POST /api/reviews`) — left in place for the roadmap page to grow into.

## Entity relationship summary

```
User ──< Follow >── User (self-referential, follower/following)
User ──< StudyEntry >── Problem (optional)
User ──< ProblemProgress >── Problem
User ──< Submission >── Problem
User ──< Review >── Problem
Category ──< Problem
```
