import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { prismaMock, getUidMock } = vi.hoisted(() => ({
  prismaMock: { problemProgress: { upsert: vi.fn() } },
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

  it("upserts IN_PROGRESS status for the caller and problem", async () => {
    prismaMock.problemProgress.upsert.mockResolvedValue({ status: "IN_PROGRESS" });
    const res = await POST(postRequest({ problemId: "problem-1" }));
    expect(res.status).toBe(200);
    expect(prismaMock.problemProgress.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_problemId: { userId: "user-1", problemId: "problem-1" } },
        create: expect.objectContaining({ status: "IN_PROGRESS" }),
        update: {},
      })
    );
  });

  it("rejects with 422 when problemId is missing", async () => {
    const res = await POST(postRequest({}));
    expect(res.status).toBe(422);
    expect(prismaMock.problemProgress.upsert).not.toHaveBeenCalled();
  });

  it("rejects with 401 when unauthenticated", async () => {
    const { AuthError } = await import("@/lib/auth-server");
    getUidMock.mockRejectedValue(new AuthError("Missing bearer token"));
    const res = await POST(postRequest({ problemId: "problem-1" }));
    expect(res.status).toBe(401);
  });
});
