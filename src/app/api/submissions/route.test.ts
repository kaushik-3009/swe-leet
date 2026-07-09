import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { prismaMock, getUidMock, gradeSubmissionMock } = vi.hoisted(() => ({
  prismaMock: {
    problem: { findUnique: vi.fn() },
    submission: { aggregate: vi.fn(), create: vi.fn(), findMany: vi.fn() },
    problemProgress: { findUnique: vi.fn(), upsert: vi.fn() },
    studyEntry: { create: vi.fn() },
  },
  getUidMock: vi.fn(),
  gradeSubmissionMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth-server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth-server")>();
  return { ...actual, getUidFromRequest: getUidMock };
});
vi.mock("@/lib/grading", () => ({ gradeSubmission: gradeSubmissionMock }));

const { POST, GET } = await import("./route");

const PROBLEM = {
  id: "problem-1",
  title: "Rate Limiter",
  description: "desc",
  track: "SYSTEM_DESIGN",
  rubric: { requiredComponents: ["Client"], requiredConnections: [] },
};

function postRequest(body: unknown) {
  return new NextRequest("http://localhost/api/submissions", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/submissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUidMock.mockResolvedValue("user-1");
    prismaMock.problem.findUnique.mockResolvedValue(PROBLEM);
    prismaMock.submission.aggregate.mockResolvedValue({ _max: { version: null } });
    prismaMock.problemProgress.findUnique.mockResolvedValue(null);
  });

  it("marks progress SOLVED and writes a problem_solved entry when the score clears the threshold", async () => {
    gradeSubmissionMock.mockResolvedValue({
      score: 85,
      feedback: { strengths: [], missing: [], improvements: [] },
      structuralResult: { matchedComponents: [], missingComponents: [], matchedConnections: [], missingConnections: [], coverage: 85 },
    });
    prismaMock.submission.create.mockResolvedValue({
      id: "sub-1", userId: "user-1", problemId: "problem-1", version: 1, canvasSnapshot: {}, score: 85,
      feedback: {}, structuralResult: {}, createdAt: new Date(),
    });
    prismaMock.problemProgress.upsert.mockResolvedValue({ status: "SOLVED", bestScore: 85 });

    const res = await POST(postRequest({ problemId: "problem-1", canvasSnapshot: {} }));
    expect(res.status).toBe(201);

    expect(prismaMock.problemProgress.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ status: "SOLVED", bestScore: 85 }),
        update: expect.objectContaining({ status: "SOLVED", bestScore: 85 }),
      })
    );
    expect(prismaMock.studyEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ kind: "problem_solved", userId: "user-1", problemId: "problem-1" }) })
    );
  });

  it("marks progress IN_PROGRESS and writes a problem_attempt entry when below threshold", async () => {
    gradeSubmissionMock.mockResolvedValue({
      score: 40,
      feedback: { strengths: [], missing: [], improvements: [] },
      structuralResult: { matchedComponents: [], missingComponents: [], matchedConnections: [], missingConnections: [], coverage: 40 },
    });
    prismaMock.submission.create.mockResolvedValue({
      id: "sub-1", userId: "user-1", problemId: "problem-1", version: 1, canvasSnapshot: {}, score: 40,
      feedback: {}, structuralResult: {}, createdAt: new Date(),
    });
    prismaMock.problemProgress.upsert.mockResolvedValue({ status: "IN_PROGRESS", bestScore: 40 });

    await POST(postRequest({ problemId: "problem-1", canvasSnapshot: {} }));

    expect(prismaMock.studyEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ kind: "problem_attempt" }) })
    );
  });

  it("keeps bestScore as the max across attempts rather than overwriting it", async () => {
    prismaMock.problemProgress.findUnique.mockResolvedValue({ status: "IN_PROGRESS", bestScore: 70 });
    gradeSubmissionMock.mockResolvedValue({
      score: 55, // worse than the existing best
      feedback: { strengths: [], missing: [], improvements: [] },
      structuralResult: { matchedComponents: [], missingComponents: [], matchedConnections: [], missingConnections: [], coverage: 55 },
    });
    prismaMock.submission.create.mockResolvedValue({
      id: "sub-2", userId: "user-1", problemId: "problem-1", version: 2, canvasSnapshot: {}, score: 55,
      feedback: {}, structuralResult: {}, createdAt: new Date(),
    });
    prismaMock.problemProgress.upsert.mockResolvedValue({ status: "IN_PROGRESS", bestScore: 70 });

    await POST(postRequest({ problemId: "problem-1", canvasSnapshot: {} }));

    expect(prismaMock.problemProgress.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: expect.objectContaining({ bestScore: 70 }) })
    );
  });

  it("returns 422 when problemId is missing", async () => {
    const res = await POST(postRequest({ canvasSnapshot: {} }));
    expect(res.status).toBe(422);
    expect(prismaMock.submission.create).not.toHaveBeenCalled();
  });

  it("returns 404 when the problem does not exist", async () => {
    prismaMock.problem.findUnique.mockResolvedValue(null);
    const res = await POST(postRequest({ problemId: "missing", canvasSnapshot: {} }));
    expect(res.status).toBe(404);
  });

  it("propagates auth failure as 401 without touching the database", async () => {
    const { AuthError } = await import("@/lib/auth-server");
    getUidMock.mockRejectedValue(new AuthError("Missing bearer token"));
    const res = await POST(postRequest({ problemId: "problem-1", canvasSnapshot: {} }));
    expect(res.status).toBe(401);
    expect(prismaMock.submission.create).not.toHaveBeenCalled();
  });
});

describe("GET /api/submissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUidMock.mockResolvedValue("user-1");
  });

  it("returns 400 when problemId query param is missing", async () => {
    const res = await GET(new NextRequest("http://localhost/api/submissions"));
    expect(res.status).toBe(400);
  });

  it("returns the current user's submissions for the given problem, newest version first", async () => {
    prismaMock.submission.findMany.mockResolvedValue([
      { id: "s2", userId: "user-1", problemId: "p1", version: 2, canvasSnapshot: {}, score: 90, feedback: {}, structuralResult: {}, createdAt: new Date() },
    ]);
    const res = await GET(new NextRequest("http://localhost/api/submissions?problemId=p1"));
    expect(res.status).toBe(200);
    expect(prismaMock.submission.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user-1", problemId: "p1" }, orderBy: { version: "desc" } })
    );
  });
});
