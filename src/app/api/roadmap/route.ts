import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { tryGetUidFromRequest } from "@/lib/auth-server";
import { ok, toErrorResponse } from "@/lib/api-response";
import type { CategoryWithProgress, ProgressStatus } from "@/lib/types";

export async function GET(req: NextRequest) {
  try {
    const uid = await tryGetUidFromRequest(req);
    const track = req.nextUrl.searchParams.get("track");

    const categories = await prisma.category.findMany({
      where: track === "SYSTEM_DESIGN" || track === "LLD" ? { track } : {},
      orderBy: { order: "asc" },
      include: { problems: { orderBy: { order: "asc" } } },
    });

    const progressByProblem = new Map<string, { status: ProgressStatus; bestScore: number }>();
    if (uid) {
      const rows = await prisma.problemProgress.findMany({ where: { userId: uid } });
      for (const r of rows) progressByProblem.set(r.problemId, { status: r.status, bestScore: r.bestScore });
    }

    const result: CategoryWithProgress[] = categories.map((c) => {
      const problems = c.problems.map((p) => {
        const prog = progressByProblem.get(p.id);
        return {
          id: p.id,
          track: p.track,
          categoryId: p.categoryId,
          slug: p.slug,
          title: p.title,
          difficulty: p.difficulty,
          tags: p.tags,
          estMinutes: p.estMinutes,
          order: p.order,
          status: prog?.status ?? "NOT_STARTED",
          bestScore: prog?.bestScore ?? 0,
        };
      });
      const solved = problems.filter((p) => p.status === "SOLVED").length;
      const progressPct = problems.length === 0 ? 0 : Math.round((solved / problems.length) * 100);
      return {
        id: c.id,
        track: c.track,
        slug: c.slug,
        title: c.title,
        description: c.description,
        order: c.order,
        problems,
        progressPct,
      };
    });

    return ok(result);
  } catch (e) {
    return toErrorResponse(e);
  }
}
