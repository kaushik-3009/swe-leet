import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, err, toErrorResponse } from "@/lib/api-response";
import { toUserProfile } from "@/lib/mappers";

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId");
    if (!userId) return err("userId query param required", 400);

    const rows = await prisma.follow.findMany({
      where: { followerId: userId },
      include: { following: true },
      orderBy: { createdAt: "desc" },
    });
    return ok(rows.map((r) => toUserProfile(r.following)));
  } catch (e) {
    return toErrorResponse(e);
  }
}
