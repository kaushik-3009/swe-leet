# Low-Level Design

This document describes the app modules. The practice content lives in `content/lld/problems.ts`.

## Auth and data access

`getUidFromRequest()` verifies a Firebase ID token on server mutations. The client API wrapper attaches the current token. User-owned runs, submissions, progress, and history are always filtered by the verified uid.

## Diagram grading

The canvas pipeline is intentionally hybrid:

1. `extractGraph()` converts supported tldraw nodes and bound arrows into a bounded graph.
2. `matchStructural()` deterministically matches components and directed connections against the authored rubric.
3. `gradeWithAi()` optionally asks Gemini for semantic feedback about correctness and completeness.
4. The score remains `round(0.5 * structural + 0.5 * AI)` when Gemini succeeds, otherwise the structural score is used unchanged.

The default Gemini order is:

```text
gemini-3.5-flash-lite
  -> gemini-3.1-flash-lite
  -> gemini-2.5-flash-lite
  -> structural-only
```

Each model attempt has a bounded timeout. Missing configuration, rate limits, provider failures, malformed JSON, and schema-invalid responses all advance to the next model. Raw snapshots are not sent to the provider. Only the extracted, bounded graph and authored rubric are included. Candidate content is delimited as untrusted data.

The diagram evaluator is separate from the existing Anthropic-backed LLD code-quality evaluator. This prevents a diagram provider outage from blocking deterministic submissions.

## LLD execution contract

LLD problems are class-design exercises and do not share a generic command-line interface. Every problem therefore owns a trusted public Python contract in content. The server may select only:

- language: `python`
- compiler: `python-3.14`
- harness: content-authored public test code

The client cannot submit a compiler, harness, hidden test, or expected result. The runner concatenates the candidate source with the trusted harness, executes each named public test, bounds output/error fields, and returns pass/fail rows. All current tests are public by product decision. There are no hidden tests.

The content integrity suite checks that every authored LLD reference solution and nonempty public harness are present. Full provider-backed execution of reference solutions is a controlled release-time validation step, not a hidden-test or default browser operation.

## CodeRun lifecycle

An exploratory run is authenticated, rate-limited, and persisted as a `CodeRun`. It does not create a heatmap entry, modify progress, or create a code submission. An explicit `Submit Code for Grading` action can reuse the matching public run by code hash or execute it first, then persists the graded `CodeSubmission` and updates progress/activity.

The LLD editor is a controlled CodeMirror Python workspace. Its React state is the single source used for public-test runs, stale-run detection, prior-version loading, and code submission. OnlineCompiler execution is server-only: the REST key is never bundled into the browser, and the server appends the trusted content-owned harness. Provider compile/runtime errors are normal run results; provider outage, timeout, and rate-limit states are normalized separately as provider failures. A provider widget is not used as a source-of-truth integration because its documented embed has no code synchronization API.

## Synthetic demo data

`scripts/generate-demo-data.ts` creates 75 deterministic profiles and repeatable activity/progress rows when called with `--environment=staging`. Every profile has `isSynthetic=true` and a `syntheticRunId`. The generator does not mutate the authenticated caller and does not delete rows. Destructive cleanup remains a reviewed staging database operation with an explicitly named run id.

`src/app/api/demo/seed` is a guarded compatibility stub and the clear route is disabled. Use the CLI generator and metrics script instead.
