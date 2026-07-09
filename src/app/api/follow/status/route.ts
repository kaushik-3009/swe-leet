import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getUidFromRequest } from "@/lib/auth-server";
import { ok, err, toErrorResponse } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const uid = await getUidFromRequest(req);
    const targetUid = req.nextUrl.searchParams.get("targetUid");
    if (!targetUid) return err("targetUid query param required", 400);

    const follow = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: uid, followingId: targetUid } },
    });
    return ok({ following: !!follow });
  } catch (e) {
    return toErrorResponse(e);
  }
}
