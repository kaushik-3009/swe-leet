import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getUidFromRequest } from "@/lib/auth-server";
import { ok, toErrorResponse } from "@/lib/api-response";
import { toUserProfile } from "@/lib/mappers";
import { adminAuth } from "@/lib/firebaseAdmin";

const bodySchema = z.object({
  username: z.string().trim().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/, "Username may only contain letters, numbers, and underscores"),
});

// Creates the Postgres User row for a Firebase Auth account that was just signed up client-side.
export async function POST(req: NextRequest) {
  try {
    const uid = await getUidFromRequest(req);
    const { username } = bodySchema.parse(await req.json());
    const normalized = username.toLowerCase();

    const existing = await prisma.user.findUnique({ where: { id: uid } });
    if (existing) return ok(toUserProfile(existing));

    const firebaseUser = await adminAuth().getUser(uid);
    const email = (firebaseUser.email || "").toLowerCase();

    try {
      const user = await prisma.user.create({
        data: { id: uid, username: normalized, displayName: username.trim(), email },
      });
      return ok(toUserProfile(user), 201);
    } catch (e: unknown) {
      if (e && typeof e === "object" && "code" in e && e.code === "P2002") {
        return toErrorResponse(new Error("Username is already taken"));
      }
      throw e;
    }
  } catch (e) {
    return toErrorResponse(e);
  }
}
