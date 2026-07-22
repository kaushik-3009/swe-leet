import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  getUidMock,
  consumeRateLimitMock,
  problemFindUniqueMock,
  codeRunCreateMock,
  codeRunFindManyMock,
  runPythonMock,
} = vi.hoisted(() => ({
  getUidMock: vi.fn(),
  consumeRateLimitMock: vi.fn(),
  problemFindUniqueMock: vi.fn(),
  codeRunCreateMock: vi.fn(),
  codeRunFindManyMock: vi.fn(),
  runPythonMock: vi.fn(),
}));

vi.mock("@/lib/auth-server", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth-server")>("@/lib/auth-server");
  return { ...actual, getUidFromRequest: getUidMock };
});
vi.mock("@/lib/rate-limit", () => ({ consumeRateLimit: consumeRateLimitMock }));
vi.mock("@/lib/db", () => ({
  prisma: {
    problem: { findUnique: problemFindUniqueMock },
    codeRun: { create: codeRunCreateMock, findMany: codeRunFindManyMock },
  },
}));
vi.mock("@/lib/compiler/onlineCompiler", async () => {
  const actual = await vi.importActual<typeof import("@/lib/compiler/onlineCompiler")>("@/lib/compiler/onlineCompiler");
  return { ...actual, runPython: runPythonMock };
});

const { POST, GET } = await import("./route");

type RunData = {
  userId: string;
  problemId: string;
  compiler: string;
  language: string;
  codeHash: string;
  codeBytes: number;
  status: string;
  result: unknown;
  durationMs: number | null;
  memoryKb: number | null;
};

function request(body: unknown) {
  return new NextRequest("http://localhost/api/code-runs", {
    method: "POST",
    headers: { authorization: "Bearer test-token", "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  getUidMock.mockReset().mockResolvedValue("user-1");
  consumeRateLimitMock.mockReset().mockResolvedValue({ allowed: true, count: 1, retryAfterSeconds: 60 });
  problemFindUniqueMock.mockReset().mockResolvedValue({
    id: "problem-1",
    track: "LLD",
    executionSpec: { language: "python", compiler: "python-3.14", harness: "assert True" },
  });
  runPythonMock.mockReset().mockResolvedValue({
    status: "success",
    output: "",
    error: "",
    exitCode: 0,
    signal: null,
    durationMs: 12,
    memoryKb: 1024,
  });
  codeRunCreateMock.mockReset().mockImplementation(async ({ data }: { data: RunData }) => ({
    id: "run-1",
    ...data,
    codeSubmissionId: null,
    createdAt: new Date("2026-07-21T00:00:00.000Z"),
  }));
  codeRunFindManyMock.mockReset().mockResolvedValue([]);
});

describe("POST /api/code-runs", () => {
  it("rejects missing code through validation", async () => {
    const response = await POST(request({ problemId: "problem-1", code: "" }));
    expect(response.status).toBe(422);
    expect(problemFindUniqueMock).not.toHaveBeenCalled();
  });

  it("executes trusted public harnesses and persists a passing run", async () => {
    const response = await POST(request({ problemId: "problem-1", code: "class Example: pass" }));
    const body = await response.json();
    expect(response.status).toBe(201);
    expect(body.data.run.status).toBe("PASSED");
    expect(body.data.run.summary).toEqual({ total: 1, passed: 1, failed: 0 });
    expect(runPythonMock).toHaveBeenCalledWith(expect.stringContaining("trusted public test harness"));
    expect(codeRunCreateMock).toHaveBeenCalledWith({ data: expect.objectContaining({ userId: "user-1", problemId: "problem-1", status: "PASSED" }) });
  });

  it("returns named failure results without treating assertion/runtime failure as an API error", async () => {
    runPythonMock.mockResolvedValue({
      status: "runtime_error",
      output: "",
      error: "AssertionError",
      exitCode: 1,
      signal: null,
      durationMs: 8,
      memoryKb: 1000,
    });
    const response = await POST(request({ problemId: "problem-1", code: "class Example: pass" }));
    const body = await response.json();
    expect(response.status).toBe(201);
    expect(body.data.run.status).toBe("RUNTIME_ERROR");
    expect(body.data.run.tests[0]).toMatchObject({ passed: false, status: "runtime_error", error: "AssertionError" });
  });

  it("keeps provider execution failures separate from learner runtime failures", async () => {
    runPythonMock.mockResolvedValue({
      status: "provider_error",
      output: "",
      error: "",
      providerError: "Internal error: code execution failed",
      exitCode: 1,
      signal: null,
      durationMs: null,
      memoryKb: null,
    });
    const response = await POST(request({ problemId: "problem-1", code: "class Example: pass" }));
    const body = await response.json();
    expect(response.status).toBe(201);
    expect(body.data.run.status).toBe("PROVIDER_ERROR");
    expect(body.data.run.tests[0]).toMatchObject({ passed: false, status: "provider_error", error: "Internal error: code execution failed" });
  });

  it("rate limits before loading content", async () => {
    consumeRateLimitMock.mockResolvedValue({ allowed: false, count: 11, retryAfterSeconds: 23 });
    const response = await POST(request({ problemId: "problem-1", code: "print(1)" }));
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("23");
    expect(problemFindUniqueMock).not.toHaveBeenCalled();
  });

  it("returns owner-only run history", async () => {
    codeRunFindManyMock.mockResolvedValue([{
      id: "run-1",
      userId: "user-1",
      problemId: "problem-1",
      codeSubmissionId: null,
      compiler: "python-3.14",
      language: "python",
      codeHash: "hash",
      codeBytes: 10,
      status: "PASSED",
      result: { tests: [], summary: { total: 0, passed: 0, failed: 0 } },
      durationMs: 10,
      memoryKb: 1,
      createdAt: new Date("2026-07-21T00:00:00.000Z"),
    }]);
    const response = await GET(new NextRequest("http://localhost/api/code-runs?problemId=problem-1", { headers: { authorization: "Bearer test-token" } }));
    expect(response.status).toBe(200);
    expect(codeRunFindManyMock).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "user-1", problemId: "problem-1" } }));
    expect((await response.json()).data[0].userId).toBe("user-1");
  });
});
