# Database Schema

Postgres on Neon, managed through Prisma. The source of truth is `prisma/schema.prisma`.

## Identity and synthetic-data isolation

### `User`

| Field | Type | Notes |
|---|---|---|
| `id` | `String` primary key | Firebase Auth uid |
| `username` | unique string | Lowercase handle |
| `displayName` | string | Display label |
| `email` | string | Lowercase email |
| `isSynthetic` | boolean | Explicit synthetic/demo marker, defaults to `false` |
| `syntheticRunId` | nullable string | Fixture run ownership for reporting and cleanup |
| `createdAt` | timestamp | Creation time |

Synthetic data is identified by schema fields, not by an id prefix. Metrics default to `isSynthetic=false` and only include synthetic rows in a separately labeled report section.

## Activity and roadmap

- `StudyEntry` stores manual, problem, article, and resource activity. It is keyed to `User` and optionally `Problem`.
- `Category` stores typed System Design/LLD topics, articles, and resources.
- `ResourceProgress` stores one completion row per user/resource.
- `ProblemProgress` stores one row per user/problem with status, best score, and update time.
- `Problem.executionSpec` stores trusted content-authored public Python test contracts. It is loaded server-side and is not accepted from clients.

An execution spec has the shape:

```ts
{
  language: "python",
  compiler: "python-3.14",
  harnessVersion: 1,
  publicTests: [{ id: string, name: string, harness: string }]
}
```

The current content authoring layer uses a trusted Python harness string for each of the 15 LLD entries. The seed path persists the execution contract for server-side execution.

## Submissions and grading

### `Submission`

Stores a versioned diagram attempt: user, problem, canvas snapshot, score, feedback, deterministic structural result, and optional safe `gradingMetadata`.

`gradingMetadata` may contain provider, served model, attempted model names, fallback index, latency, grading version, and `ai` or `structural_only` status. It must not contain API keys, prompts, raw provider responses, raw provider errors, or full candidate graph payloads.

A unique constraint on `(userId, problemId, version)` protects version allocation from duplicate concurrent writes.

### `CodeSubmission`

Stores a versioned LLD code submission, its score/feedback, and structural result. It has the same unique version constraint. Code-quality grading remains the existing Anthropic-backed 30/70 structural/AI blend in this phase.

### `CodeRun`

Stores an authenticated public-test execution result without duplicating pre-submit source code:

| Field | Purpose |
|---|---|
| `userId`, `problemId` | Ownership and filtering |
| `codeSubmissionId` | Optional link for an explicit graded submission |
| `compiler`, `language` | Currently restricted to `python-3.14` / `python` |
| `codeHash`, `codeBytes` | Correlation and size metadata without raw exploratory source storage |
| `status` | Passed, failed, compile/runtime error, timeout, provider error, or rate limited |
| `result` | Bounded named public-test results and plain-text-safe output/errors |
| `durationMs`, `memoryKb` | Provider execution metrics when returned |
| `createdAt` | Run timestamp |

Exploratory runs do not create `StudyEntry` rows or change `ProblemProgress`. Explicit submissions remain the progression event.

### `RateLimitBucket`

Relational rate-limit counters keyed by subject, bucket, and time window. This is used instead of process-local memory because Vercel requests can execute on different instances.

## Relationships

```text
User ──< Follow >── User
User ──< StudyEntry >── Problem?
User ──< ProblemProgress >── Problem
User ──< Submission >── Problem
User ──< CodeSubmission >── Problem
User ──< CodeRun >── Problem
CodeRun ──> CodeSubmission?
Category ──< Resource
Category ──< Problem
```
