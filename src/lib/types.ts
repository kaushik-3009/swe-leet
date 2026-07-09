// Shared client-facing types. Mirrors the legacy Firestore shapes so existing
// components keep working unchanged, plus new roadmap/practice types.

export interface StudyEntry {
  id: string;
  topic: string;
  resource: string;
  date: string; // YYYY-MM-DD
  createdAt: number; // epoch millis
  userId: string;
  kind: "manual" | "problem_attempt" | "problem_solved";
  problemId?: string | null;
}

export interface UserProfile {
  uid: string;
  username: string;
  displayName: string;
  email: string;
  createdAt: number;
}

export type Track = "SYSTEM_DESIGN" | "LLD";
export type Difficulty = "EASY" | "MEDIUM" | "HARD";
export type ProgressStatus = "NOT_STARTED" | "IN_PROGRESS" | "SOLVED";

export interface Category {
  id: string;
  track: Track;
  slug: string;
  title: string;
  description: string;
  order: number;
}

export interface ProblemSummary {
  id: string;
  track: Track;
  categoryId: string;
  slug: string;
  title: string;
  difficulty: Difficulty;
  tags: string[];
  estMinutes: number;
  order: number;
}

export interface ProblemDetail extends ProblemSummary {
  description: string;
}

export interface Rubric {
  requiredComponents: string[];
  requiredConnections: { from: string; to: string }[];
  weights?: Record<string, number>;
}

export interface ProblemSolution {
  referenceExplanation: string;
  referenceDiagram: unknown;
  rubric: Rubric;
}

export interface ProblemProgressEntry {
  problemId: string;
  status: ProgressStatus;
  bestScore: number;
  updatedAt: number;
}

// Returned by GET /api/progress?userId= — a public summary of a user's solved/attempted problems.
export interface SolvedProblemSummary {
  problemId: string;
  slug: string;
  title: string;
  track: Track;
  difficulty: Difficulty;
  status: ProgressStatus;
  bestScore: number;
  updatedAt: number;
}

export interface CategoryWithProgress extends Category {
  problems: (ProblemSummary & { status: ProgressStatus; bestScore: number })[];
  progressPct: number;
}

export interface SubmissionFeedback {
  strengths: string[];
  missing: string[];
  improvements: string[];
}

export interface StructuralResult {
  matchedComponents: string[];
  missingComponents: string[];
  matchedConnections: string[];
  missingConnections: string[];
  coverage: number;
}

export interface Submission {
  id: string;
  userId: string;
  problemId: string;
  version: number;
  canvasSnapshot: unknown;
  score: number;
  feedback: SubmissionFeedback;
  structuralResult: StructuralResult;
  createdAt: number;
}

export interface Review {
  id: string;
  problemId: string;
  userId: string;
  username: string;
  rating: number;
  body: string;
  createdAt: number;
}
