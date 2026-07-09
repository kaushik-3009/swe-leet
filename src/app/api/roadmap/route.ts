import { NextRequest } from "next/server";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { tryGetUidFromRequest } from "@/lib/auth-server";
import { ok, toErrorResponse } from "@/lib/api-response";
import type { CategoryWithProgress, ProgressStatus, Track } from "@/lib/types";

const PROBLEM_LIST_SELECT = {
  id: true,
  track: true,
  categoryId: true,
  slug: true,
  title: true,
  difficulty: true,
  tags: true,
  estMinutes: true,
  order: true,
  diagramType: true,
} as const;

// Category/problem content is identical for every caller and changes only via the
// content-seeding script, so it's cached at the process level (60s) instead of hitting
// Postgres on every roadmap view. Only the per-user progress join below stays live.
const getCachedContent = unstable_cache(
  async (track: Track | null) => {
    return prisma.category.findMany({
      where: track ? { track } : {},
      orderBy: { order: "asc" },
      select: {
        id: true,
        track: true,
        slug: true,
        title: true,
        description: true,
        order: true,
        articleTitle: true,
        problems: { orderBy: { order: "asc" }, select: PROBLEM_LIST_SELECT },
      },
    });
  },
  ["roadmap-content"],
  { revalidate: 60 }
);

export async function GET(req: NextRequest) {
  try {
    const uid = await tryGetUidFromRequest(req);
    const trackParam = req.nextUrl.searchParams.get("track");
    const track: Track | null = trackParam === "SYSTEM_DESIGN" || trackParam === "LLD" ? trackParam : null;

    const categories = await getCachedContent(track);

    const progressByProblem = new Map<string, { status: ProgressStatus; bestScore: number }>();
    if (uid) {
      const rows = await prisma.problemProgress.findMany({ where: { userId: uid }, select: { problemId: true, status: true, bestScore: true } });
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
          diagramType: p.diagramType,
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
        articleTitle: c.articleTitle,
        problems,
        progressPct,
      };
    });

    return ok(result);
  } catch (e) {
    return toErrorResponse(e);
  }
}
