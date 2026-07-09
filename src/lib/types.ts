// Shared client-facing types. Mirrors the legacy Firestore shapes so existing
// components keep working unchanged, plus new roadmap/practice types.

export type EntryKind =
  | "manual"
  | "problem_started"
  | "problem_attempt"
  | "problem_solved"
  | "problem_checklist"
  | "resource_completed"
  | "article_viewed";

export interface StudyEntry {
  id: string;
  topic: string;
  resource: string;
  date: string; // YYYY-MM-DD
  createdAt: number; // epoch millis
  userId: string;
  kind: EntryKind;
  problemId?: string | null;
}

export interface DashboardStats {
  totalEntries: number;
  studyDays: number;
  uniqueTopics: number;
}

export interface DashboardData {
  stats: DashboardStats;
  heatmap: Record<string, number>;
  recentEntries: StudyEntry[];
  weeklyGoal: WeeklyGoalProgress | null;
}

export interface WeeklyGoalProgress {
  weekStart: string;
  targetSessions: number;
  completedSessions: number;
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
export type DiagramType = "ARCHITECTURE" | "SEQUENCE" | "CLASS";
export type ResourceKind = "EXTERNAL" | "ARTICLE";

export interface Category {
  id: string;
  track: Track;
  slug: string;
  title: string;
  description: string;
  order: number;
  articleTitle?: string | null;
}

export interface CategoryDetail extends Category {
  articleContent?: string | null;
}

export interface Resource {
  id: string;
  categoryId: string;
  kind: ResourceKind;
  title: string;
  url: string | null;
  order: number;
  completed: boolean;
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
  diagramType: DiagramType;
}

export interface ProblemDetail extends ProblemSummary {
  description: string;
  generalHint?: string | null;
  stepHints: string[];
  videoUrl?: string | null;
  solutionCodeLanguage: string;
}

export interface Rubric {
  requiredComponents: string[];
  requiredConnections: { from: string; to: string }[];
  weights?: Record<string, number>;
}

export interface SolutionStep {
  title: string;
  body: string;
}

export interface ProblemSolution {
  referenceExplanation: string;
  referenceDiagram: unknown;
  rubric: Rubric;
  solutionCode?: string | null;
  solutionCodeLanguage: string;
  solutionSteps: SolutionStep[];
}

export interface ProblemProgressEntry {
  problemId: string;
  status: ProgressStatus;
  bestScore: number;
  updatedAt: number;
}

// Returned by GET /api/progress?userId= (a public summary of a user's solved/attempted problems).
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

export interface TopicPageData {
  category: CategoryDetail;
  resources: Resource[];
  subsetProblems: (ProblemSummary & { status: ProgressStatus; bestScore: number })[];
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

export interface CodeSubmission {
  id: string;
  userId: string;
  problemId: string;
  version: number;
  code: string;
  language: string;
  score: number;
  feedback: SubmissionFeedback;
  structuralResult: StructuralResult;
  createdAt: number;
}
