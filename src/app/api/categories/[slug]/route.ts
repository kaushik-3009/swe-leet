import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { tryGetUidFromRequest } from "@/lib/auth-server";
import { ok, err, toErrorResponse } from "@/lib/api-response";
import { toCategoryDetail, toResource } from "@/lib/mappers";
import type { TopicPageData } from "@/lib/types";

// Powers a study-plan topic page: the on-site article, the curated external+own-article
// resource list (each checkbox-trackable), and the small "bridge into practice" problem
// subset for this topic. Resource completion and problem status are only meaningful for
// an authenticated caller; unauthenticated reads still work (all flags false).
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const uid = await tryGetUidFromRequest(req);

    const category = await prisma.category.findUnique({
      where: { slug },
      include: {
        resources: { orderBy: { order: "asc" } },
        problems: {
          where: { inStudyPlanSubset: true },
          orderBy: { order: "asc" },
          select: {
            id: true, track: true, categoryId: true, slug: true, title: true,
            difficulty: true, tags: true, estMinutes: true, order: true, diagramType: true,
          },
        },
      },
    });
    if (!category) return err("Category not found", 404);

    const [completions, progressRows] = await Promise.all([
      uid ? prisma.resourceProgress.findMany({ where: { userId: uid, resourceId: { in: category.resources.map((r) => r.id) } } }) : [],
      uid ? prisma.problemProgress.findMany({ where: { userId: uid, problemId: { in: category.problems.map((p) => p.id) } } }) : [],
    ]);
    const completedIds = new Set(completions.map((c) => c.resourceId));
    const progressByProblem = new Map(progressRows.map((p) => [p.problemId, p]));

    const result: TopicPageData = {
      category: toCategoryDetail(category),
      resources: category.resources.map((r) => toResource(r, completedIds.has(r.id))),
      subsetProblems: category.problems.map((p) => {
        const prog = progressByProblem.get(p.id);
        return { ...p, status: prog?.status ?? "NOT_STARTED", bestScore: prog?.bestScore ?? 0 };
      }),
    };

    return ok(result);
  } catch (e) {
    return toErrorResponse(e);
  }
}
