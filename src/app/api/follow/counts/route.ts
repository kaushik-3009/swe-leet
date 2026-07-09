import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, err, toErrorResponse } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId");
    if (!userId) return err("userId query param required", 400);

    const [followers, following] = await Promise.all([
      prisma.follow.count({ where: { followingId: userId } }),
      prisma.follow.count({ where: { followerId: userId } }),
    ]);
    return ok({ followers, following });
  } catch (e) {
    return toErrorResponse(e);
  }
}
