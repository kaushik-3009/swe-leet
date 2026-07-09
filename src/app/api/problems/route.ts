import { NextRequest } from "next/server";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { ok, toErrorResponse } from "@/lib/api-response";
import { toProblemSummary } from "@/lib/mappers";
import type { Track } from "@/lib/types";

const getCachedProblems = unstable_cache(
  async (track: Track | null, categoryId: string | null) => {
    return prisma.problem.findMany({
      where: {
        ...(track ? { track } : {}),
        ...(categoryId ? { categoryId } : {}),
      },
      orderBy: [{ categoryId: "asc" }, { order: "asc" }],
      select: {
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
      },
    });
  },
  ["problems-list"],
  { revalidate: 60 }
);

export async function GET(req: NextRequest) {
  try {
    const trackParam = req.nextUrl.searchParams.get("track");
    const track: Track | null = trackParam === "SYSTEM_DESIGN" || trackParam === "LLD" ? trackParam : null;
    const categoryId = req.nextUrl.searchParams.get("categoryId");

    const problems = await getCachedProblems(track, categoryId);
    return ok(problems.map(toProblemSummary));
  } catch (e) {
    return toErrorResponse(e);
  }
}
