import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { prismaMock, getUidMock } = vi.hoisted(() => ({
  prismaMock: {
    problemProgress: { findUnique: vi.fn(), create: vi.fn() },
    problem: { findUnique: vi.fn() },
    studyEntry: { create: vi.fn() },
    $transaction: vi.fn(),
  },
  getUidMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth-server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth-server")>();
  return { ...actual, getUidFromRequest: getUidMock };
});

const { POST } = await import("./route");

function postRequest(body: unknown) {
  return new NextRequest("http://localhost/api/progress/touch", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/progress/touch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUidMock.mockResolvedValue("user-1");
  });

  it("returns the existing status without writing a StudyEntry on repeat touches", async () => {
    prismaMock.problemProgress.findUnique.mockResolvedValue({ status: "SOLVED" });
    const res = await POST(postRequest({ problemId: "problem-1" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual({ status: "SOLVED" });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("creates IN_PROGRESS status and a problem_started StudyEntry on first touch", async () => {
    prismaMock.problemProgress.findUnique.mockResolvedValue(null);
    prismaMock.problem.findUnique.mockResolvedValue({ title: "Rate Limiter" });
    prismaMock.$transaction.mockResolvedValue([{ status: "IN_PROGRESS" }, {}]);

    const res = await POST(postRequest({ problemId: "problem-1" }));
    expect(res.status).toBe(200);
    expect(prismaMock.$transaction).toHaveBeenCalled();
    const body = await res.json();
    expect(body.data).toEqual({ status: "IN_PROGRESS" });
  });

  it("returns 404 when the problem does not exist", async () => {
    prismaMock.problemProgress.findUnique.mockResolvedValue(null);
    prismaMock.problem.findUnique.mockResolvedValue(null);
    const res = await POST(postRequest({ problemId: "missing" }));
    expect(res.status).toBe(404);
  });

  it("rejects with 422 when problemId is missing", async () => {
    const res = await POST(postRequest({}));
    expect(res.status).toBe(422);
    expect(prismaMock.problemProgress.findUnique).not.toHaveBeenCalled();
  });

  it("rejects with 401 when unauthenticated", async () => {
    const { AuthError } = await import("@/lib/auth-server");
    getUidMock.mockRejectedValue(new AuthError("Missing bearer token"));
    const res = await POST(postRequest({ problemId: "problem-1" }));
    expect(res.status).toBe(401);
  });
});
