import { NextRequest } from "next/server";
import { adminAuth } from "./firebaseAdmin";

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

/** Verifies the Firebase ID token in the Authorization header and returns the uid. */
export async function getUidFromRequest(req: NextRequest): Promise<string> {
  const header = req.headers.get("authorization") || req.headers.get("Authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  if (!token) throw new AuthError("Missing bearer token");

  try {
    const decoded = await adminAuth().verifyIdToken(token);
    return decoded.uid;
  } catch {
    throw new AuthError("Invalid or expired token");
  }
}

/** Same as getUidFromRequest but returns null instead of throwing (for optional-auth routes). */
export async function tryGetUidFromRequest(req: NextRequest): Promise<string | null> {
  try {
    return await getUidFromRequest(req);
  } catch {
    return null;
  }
}
