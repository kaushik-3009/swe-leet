import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getUidFromRequest } from "@/lib/auth-server";
import { ok, err, toErrorResponse } from "@/lib/api-response";
import { toUserProfile } from "@/lib/mappers";

export async function GET(req: NextRequest) {
  try {
    const uid = await getUidFromRequest(req);
    const user = await prisma.user.findUnique({ where: { id: uid } });
    if (!user) return err("User profile not found", 404);
    return ok(toUserProfile(user));
  } catch (e) {
    return toErrorResponse(e);
  }
}
