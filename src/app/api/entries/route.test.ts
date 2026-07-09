import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { prismaMock, getUidMock } = vi.hoisted(() => ({
  prismaMock: { studyEntry: { findMany: vi.fn(), create: vi.fn() } },
  getUidMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth-server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth-server")>();
  return { ...actual, getUidFromRequest: getUidMock };
});

const { GET, POST } = await import("./route");

describe("GET /api/entries", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 when userId query param is missing", async () => {
    const res = await GET(new NextRequest("http://localhost/api/entries"));
    expect(res.status).toBe(400);
  });

  it("returns entries for the requested user without requiring auth (public profile reads)", async () => {
    prismaMock.studyEntry.findMany.mockResolvedValue([
      { id: "e1", userId: "u1", topic: "Caching", resource: "book", date: "2026-01-01", createdAt: new Date(), kind: "manual", problemId: null },
    ]);
    const res = await GET(new NextRequest("http://localhost/api/entries?userId=u1"));
    expect(res.status).toBe(200);
    expect(getUidMock).not.toHaveBeenCalled();
    const body = await res.json();
    expect(body.data).toHaveLength(1);
  });
});

describe("POST /api/entries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUidMock.mockResolvedValue("user-1");
  });

  function postRequest(body: unknown) {
    return new NextRequest("http://localhost/api/entries", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    });
  }

  it("creates an entry scoped to the authenticated user, ignoring any userId in the body", async () => {
    prismaMock.studyEntry.create.mockResolvedValue({
      id: "e1", userId: "user-1", topic: "Sharding", resource: "book", date: "2026-01-01", createdAt: new Date(), kind: "manual", problemId: null,
    });
    const res = await POST(postRequest({ topic: "Sharding", resource: "book", userId: "someone-else" }));
    expect(res.status).toBe(201);
    expect(prismaMock.studyEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: "user-1", topic: "Sharding", resource: "book" }) })
    );
  });

  it("rejects an empty topic with 422", async () => {
    const res = await POST(postRequest({ topic: "", resource: "book" }));
    expect(res.status).toBe(422);
    expect(prismaMock.studyEntry.create).not.toHaveBeenCalled();
  });

  it("rejects when unauthenticated", async () => {
    const { AuthError } = await import("@/lib/auth-server");
    getUidMock.mockRejectedValue(new AuthError("Missing bearer token"));
    const res = await POST(postRequest({ topic: "Sharding", resource: "book" }));
    expect(res.status).toBe(401);
  });
});
