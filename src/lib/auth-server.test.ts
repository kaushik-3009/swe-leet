import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { verifyIdTokenMock } = vi.hoisted(() => ({ verifyIdTokenMock: vi.fn() }));
vi.mock("./firebaseAdmin", () => ({ adminAuth: () => ({ verifyIdToken: verifyIdTokenMock }) }));

const { getUidFromRequest, tryGetUidFromRequest, AuthError } = await import("./auth-server");

function requestWithAuth(header?: string) {
  return new NextRequest("http://localhost/api/whatever", {
    headers: header ? { Authorization: header } : {},
  });
}

describe("getUidFromRequest", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws AuthError when the Authorization header is missing", async () => {
    await expect(getUidFromRequest(requestWithAuth())).rejects.toThrow(AuthError);
  });

  it("throws AuthError when the header isn't a Bearer token", async () => {
    await expect(getUidFromRequest(requestWithAuth("Basic abc123"))).rejects.toThrow(AuthError);
  });

  it("returns the uid for a valid token", async () => {
    verifyIdTokenMock.mockResolvedValue({ uid: "user-42" });
    await expect(getUidFromRequest(requestWithAuth("Bearer good-token"))).resolves.toBe("user-42");
  });

  it("throws AuthError when token verification fails", async () => {
    verifyIdTokenMock.mockRejectedValue(new Error("expired"));
    await expect(getUidFromRequest(requestWithAuth("Bearer bad-token"))).rejects.toThrow(AuthError);
  });
});

describe("tryGetUidFromRequest", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns null instead of throwing when there is no token", async () => {
    await expect(tryGetUidFromRequest(requestWithAuth())).resolves.toBeNull();
  });

  it("returns the uid when the token is valid", async () => {
    verifyIdTokenMock.mockResolvedValue({ uid: "user-1" });
    await expect(tryGetUidFromRequest(requestWithAuth("Bearer good-token"))).resolves.toBe("user-1");
  });
});
