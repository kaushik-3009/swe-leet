import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { prismaMock, getUidMock, gradeCodeSubmissionMock } = vi.hoisted(() => ({
  prismaMock: {
    problem: { findUnique: vi.fn() },
    codeSubmission: { aggregate: vi.fn(), create: vi.fn(), findMany: vi.fn() },
    problemProgress: { findUnique: vi.fn(), upsert: vi.fn() },
    studyEntry: { create: vi.fn() },
  },
  getUidMock: vi.fn(),
  gradeCodeSubmissionMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth-server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth-server")>();
  return { ...actual, getUidFromRequest: getUidMock };
});
vi.mock("@/lib/grading", () => ({ gradeCodeSubmission: gradeCodeSubmissionMock }));

const { POST, GET } = await import("./route");

const LLD_PROBLEM = {
  id: "problem-1",
  title: "Parking Lot",
  description: "desc",
  track: "LLD",
  rubric: { requiredComponents: ["ParkingLot"], requiredConnections: [] },
};

function postRequest(body: unknown) {
  return new NextRequest("http://localhost/api/code-submissions", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/code-submissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUidMock.mockResolvedValue("user-1");
    prismaMock.problem.findUnique.mockResolvedValue(LLD_PROBLEM);
    prismaMock.codeSubmission.aggregate.mockResolvedValue({ _max: { version: null } });
    prismaMock.problemProgress.findUnique.mockResolvedValue(null);
  });

  it("grades and marks SOLVED when the score clears the threshold", async () => {
    gradeCodeSubmissionMock.mockResolvedValue({
      score: 90,
      feedback: { strengths: [], missing: [], improvements: [] },
      structuralResult: { matchedComponents: [], missingComponents: [], matchedConnections: [], missingConnections: [], coverage: 90 },
    });
    prismaMock.codeSubmission.create.mockResolvedValue({
      id: "sub-1", userId: "user-1", problemId: "problem-1", version: 1, code: "class ParkingLot: pass", language: "python", score: 90,
      feedback: {}, structuralResult: {}, createdAt: new Date(),
    });
    prismaMock.problemProgress.upsert.mockResolvedValue({ status: "SOLVED", bestScore: 90 });

    const res = await POST(postRequest({ problemId: "problem-1", code: "class ParkingLot: pass", language: "python" }));
    expect(res.status).toBe(201);
    expect(prismaMock.studyEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ kind: "problem_solved", problemId: "problem-1" }) })
    );
  });

  it("rejects code submissions for a System Design problem", async () => {
    prismaMock.problem.findUnique.mockResolvedValue({ ...LLD_PROBLEM, track: "SYSTEM_DESIGN" });
    const res = await POST(postRequest({ problemId: "problem-1", code: "x = 1", language: "python" }));
    expect(res.status).toBe(422);
    expect(prismaMock.codeSubmission.create).not.toHaveBeenCalled();
  });

  it("returns 404 when the problem does not exist", async () => {
    prismaMock.problem.findUnique.mockResolvedValue(null);
    const res = await POST(postRequest({ problemId: "missing", code: "x = 1", language: "python" }));
    expect(res.status).toBe(404);
  });

  it("returns 422 for an empty code body", async () => {
    const res = await POST(postRequest({ problemId: "problem-1", code: "", language: "python" }));
    expect(res.status).toBe(422);
    expect(prismaMock.codeSubmission.create).not.toHaveBeenCalled();
  });
});

describe("GET /api/code-submissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUidMock.mockResolvedValue("user-1");
  });

  it("returns 400 when problemId query param is missing", async () => {
    const res = await GET(new NextRequest("http://localhost/api/code-submissions"));
    expect(res.status).toBe(400);
  });

  it("returns the current user's code submissions for the given problem", async () => {
    prismaMock.codeSubmission.findMany.mockResolvedValue([
      { id: "s1", userId: "user-1", problemId: "p1", version: 1, code: "x", language: "python", score: 80, feedback: {}, structuralResult: {}, createdAt: new Date() },
    ]);
    const res = await GET(new NextRequest("http://localhost/api/code-submissions?problemId=p1"));
    expect(res.status).toBe(200);
    expect(prismaMock.codeSubmission.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user-1", problemId: "p1" }, orderBy: { version: "desc" } })
    );
  });
});
