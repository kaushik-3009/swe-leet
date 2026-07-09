import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, err, toErrorResponse } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId");
    if (!userId) return err("userId query param required", 400);

    const entries = await prisma.studyEntry.findMany({ where: { userId }, select: { date: true } });
    const counts: Record<string, number> = {};
    for (const e of entries) counts[e.date] = (counts[e.date] || 0) + 1;
    return ok(counts);
  } catch (e) {
    return toErrorResponse(e);
  }
}
