import type {
  User,
  StudyEntry as PrismaStudyEntry,
  Problem,
  Category,
  Resource as PrismaResource,
  ProblemProgress,
  Submission as PrismaSubmission,
  CodeSubmission as PrismaCodeSubmission,
  Review as PrismaReview,
} from "@prisma/client";
import type {
  UserProfile,
  StudyEntry,
  ProblemSummary,
  ProblemDetail,
  Category as CategoryDto,
  CategoryDetail,
  Resource,
  ProblemProgressEntry,
  Submission,
  CodeSubmission,
  Review,
  Rubric,
  SolutionStep,
  SubmissionFeedback,
  StructuralResult,
  GradingMetadata,
} from "./types";

export function toUserProfile(u: User): UserProfile {
  return {
    uid: u.id,
    username: u.username,
    displayName: u.displayName,
    email: u.email,
    createdAt: u.createdAt.getTime(),
    isSynthetic: (u as User & { isSynthetic?: boolean }).isSynthetic,
  };
}

export function toStudyEntry(e: PrismaStudyEntry): StudyEntry {
  return {
    id: e.id,
    topic: e.topic,
    resource: e.resource,
    date: e.date,
    createdAt: e.createdAt.getTime(),
    userId: e.userId,
    kind: e.kind,
    problemId: e.problemId,
  };
}

type ProblemListFields = Pick<
  Problem,
  "id" | "track" | "categoryId" | "slug" | "title" | "difficulty" | "tags" | "estMinutes" | "order" | "diagramType"
>;

export function toProblemSummary(p: ProblemListFields): ProblemSummary {
  return {
    id: p.id,
    track: p.track,
    categoryId: p.categoryId,
    slug: p.slug,
    title: p.title,
    difficulty: p.difficulty,
    tags: p.tags,
    estMinutes: p.estMinutes,
    order: p.order,
    diagramType: p.diagramType,
  };
}

type ProblemDetailFields = ProblemListFields &
  Pick<Problem, "description" | "generalHint" | "stepHints" | "videoUrl" | "solutionCodeLanguage">;

export function toProblemDetail(p: ProblemDetailFields): ProblemDetail {
  return {
    ...toProblemSummary(p),
    description: p.description,
    generalHint: p.generalHint,
    stepHints: p.stepHints,
    videoUrl: p.videoUrl,
    solutionCodeLanguage: p.solutionCodeLanguage,
  };
}

export function toCategory(c: Category): CategoryDto {
  return { id: c.id, track: c.track, slug: c.slug, title: c.title, description: c.description, order: c.order, articleTitle: c.articleTitle };
}

export function toCategoryDetail(c: Category): CategoryDetail {
  return { ...toCategory(c), articleContent: c.articleContent };
}

export function toResource(r: PrismaResource, completed: boolean): Resource {
  return { id: r.id, categoryId: r.categoryId, kind: r.kind, title: r.title, url: r.url, order: r.order, completed };
}

export function toProgressEntry(p: ProblemProgress): ProblemProgressEntry {
  return { problemId: p.problemId, status: p.status, bestScore: p.bestScore, updatedAt: p.updatedAt.getTime() };
}

export function toSubmission(s: PrismaSubmission): Submission {
  return {
    id: s.id,
    userId: s.userId,
    problemId: s.problemId,
    version: s.version,
    canvasSnapshot: s.canvasSnapshot,
    score: s.score,
    feedback: s.feedback as unknown as SubmissionFeedback,
    structuralResult: s.structuralResult as unknown as StructuralResult,
    gradingMetadata: (s as PrismaSubmission & { gradingMetadata?: unknown }).gradingMetadata as GradingMetadata | null,
    createdAt: s.createdAt.getTime(),
  };
}

export function toCodeSubmission(s: PrismaCodeSubmission): CodeSubmission {
  return {
    id: s.id,
    userId: s.userId,
    problemId: s.problemId,
    version: s.version,
    code: s.code,
    language: s.language,
    score: s.score,
    feedback: s.feedback as unknown as SubmissionFeedback,
    structuralResult: s.structuralResult as unknown as StructuralResult,
    createdAt: s.createdAt.getTime(),
  };
}

export function toReview(r: PrismaReview & { user: User }): Review {
  return {
    id: r.id,
    problemId: r.problemId,
    userId: r.userId,
    username: r.user.username,
    rating: r.rating,
    body: r.body,
    createdAt: r.createdAt.getTime(),
  };
}

export function asRubric(json: unknown): Rubric {
  return json as Rubric;
}

export function asSolutionSteps(json: unknown): SolutionStep[] {
  return (json as SolutionStep[] | null) ?? [];
}
