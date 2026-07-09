import type { User, StudyEntry as PrismaStudyEntry, Problem, Category, ProblemProgress, Submission as PrismaSubmission, Review as PrismaReview } from "@prisma/client";
import type {
  UserProfile,
  StudyEntry,
  ProblemSummary,
  ProblemDetail,
  Category as CategoryDto,
  ProblemProgressEntry,
  Submission,
  Review,
  Rubric,
  SubmissionFeedback,
  StructuralResult,
} from "./types";

export function toUserProfile(u: User): UserProfile {
  return {
    uid: u.id,
    username: u.username,
    displayName: u.displayName,
    email: u.email,
    createdAt: u.createdAt.getTime(),
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

export function toProblemSummary(p: Problem): ProblemSummary {
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
  };
}

export function toProblemDetail(p: Problem): ProblemDetail {
  return { ...toProblemSummary(p), description: p.description };
}

export function toCategory(c: Category): CategoryDto {
  return { id: c.id, track: c.track, slug: c.slug, title: c.title, description: c.description, order: c.order };
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
