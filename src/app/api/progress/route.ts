import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, err, toErrorResponse } from "@/lib/api-response";

// Public: powers "solved problems" on friend profiles.
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId");
    if (!userId) return err("userId query param required", 400);

    const rows = await prisma.problemProgress.findMany({
      where: { userId, status: { not: "NOT_STARTED" } },
      include: { problem: { select: { slug: true, title: true, track: true, difficulty: true } } },
      orderBy: { updatedAt: "desc" },
    });

    return ok(
      rows.map((r) => ({
        problemId: r.problemId,
        slug: r.problem.slug,
        title: r.problem.title,
        track: r.problem.track,
        difficulty: r.problem.difficulty,
        status: r.status,
        bestScore: r.bestScore,
        updatedAt: r.updatedAt.getTime(),
      }))
    );
  } catch (e) {
    return toErrorResponse(e);
  }
}
