-- Gemini diagram metadata and trusted Python execution contracts
ALTER TABLE "User"
  ADD COLUMN "isSynthetic" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "syntheticRunId" TEXT;

ALTER TABLE "Problem"
  ADD COLUMN "executionSpec" JSONB;

ALTER TABLE "Submission"
  ADD COLUMN "gradingMetadata" JSONB;

CREATE UNIQUE INDEX "Submission_userId_problemId_version_key"
  ON "Submission"("userId", "problemId", "version");

CREATE UNIQUE INDEX "CodeSubmission_userId_problemId_version_key"
  ON "CodeSubmission"("userId", "problemId", "version");

CREATE INDEX "User_isSynthetic_syntheticRunId_idx"
  ON "User"("isSynthetic", "syntheticRunId");

CREATE TYPE "CodeRunStatus" AS ENUM (
  'PASSED',
  'FAILED',
  'COMPILE_ERROR',
  'RUNTIME_ERROR',
  'TIMEOUT',
  'PROVIDER_ERROR',
  'RATE_LIMITED'
);

CREATE TABLE "CodeRun" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "problemId" TEXT NOT NULL,
  "codeSubmissionId" TEXT,
  "compiler" TEXT NOT NULL,
  "language" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "codeBytes" INTEGER NOT NULL,
  "status" "CodeRunStatus" NOT NULL,
  "result" JSONB NOT NULL,
  "durationMs" INTEGER,
  "memoryKb" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CodeRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RateLimitBucket" (
  "id" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "bucket" TEXT NOT NULL,
  "windowStart" TIMESTAMP(3) NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RateLimitBucket_subject_bucket_windowStart_key"
  ON "RateLimitBucket"("subject", "bucket", "windowStart");
CREATE INDEX "RateLimitBucket_subject_bucket_idx"
  ON "RateLimitBucket"("subject", "bucket");
CREATE INDEX "CodeRun_userId_problemId_createdAt_idx"
  ON "CodeRun"("userId", "problemId", "createdAt");
CREATE INDEX "CodeRun_codeSubmissionId_idx"
  ON "CodeRun"("codeSubmissionId");
CREATE INDEX "CodeRun_codeHash_idx"
  ON "CodeRun"("codeHash");

ALTER TABLE "CodeRun"
  ADD CONSTRAINT "CodeRun_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "CodeRun_problemId_fkey"
    FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "CodeRun_codeSubmissionId_fkey"
    FOREIGN KEY ("codeSubmissionId") REFERENCES "CodeSubmission"("id") ON DELETE SET NULL ON UPDATE CASCADE;
