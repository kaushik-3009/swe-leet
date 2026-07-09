import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getUidFromRequest } from "@/lib/auth-server";
import { ok, toErrorResponse } from "@/lib/api-response";
import { toUserProfile } from "@/lib/mappers";

export async function GET(req: NextRequest) {
  try {
    const uid = await getUidFromRequest(req);
    const q = (req.nextUrl.searchParams.get("q") || "").toLowerCase().trim();
    if (!q) return ok([]);

    const users = await prisma.user.findMany({
      where: { username: { startsWith: q }, NOT: { id: uid } },
      take: 10,
      orderBy: { username: "asc" },
    });
    return ok(users.map(toUserProfile));
  } catch (e) {
    return toErrorResponse(e);
  }
}
