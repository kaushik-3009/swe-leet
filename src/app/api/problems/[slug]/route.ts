import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, err, toErrorResponse } from "@/lib/api-response";
import { toProblemDetail } from "@/lib/mappers";

// Excludes solution-only fields (referenceDiagram, rubric, solutionCode, solutionSteps) -
// those can be multi-KB JSON/text blobs and are only needed after a submission or a
// "give up", via GET /api/problems/[slug]/solution.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const problem = await prisma.problem.findUnique({
      where: { slug },
      select: {
        id: true,
        track: true,
        categoryId: true,
        slug: true,
        title: true,
        description: true,
        difficulty: true,
        tags: true,
        estMinutes: true,
        order: true,
        diagramType: true,
        generalHint: true,
        stepHints: true,
        videoUrl: true,
        solutionCodeLanguage: true,
      },
    });
    if (!problem) return err("Problem not found", 404);
    return ok(toProblemDetail(problem));
  } catch (e) {
    return toErrorResponse(e);
  }
}
