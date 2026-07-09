import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getUidFromRequest } from "@/lib/auth-server";
import { ok, err, toErrorResponse } from "@/lib/api-response";
import { asSolutionSteps } from "@/lib/mappers";
import type { ProblemSolution } from "@/lib/types";

// Gated: the reference solution is only revealed once the user has made at least
// one attempt (a ProblemProgress row exists), i.e. after a submission or "give up".
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const uid = await getUidFromRequest(req);
    const { slug } = await params;

    const problem = await prisma.problem.findUnique({
      where: { slug },
      select: {
        id: true,
        referenceExplanation: true,
        referenceDiagram: true,
        rubric: true,
        solutionCode: true,
        solutionCodeLanguage: true,
        solutionSteps: true,
      },
    });
    if (!problem) return err("Problem not found", 404);

    const progress = await prisma.problemProgress.findUnique({
      where: { userId_problemId: { userId: uid, problemId: problem.id } },
    });
    if (!progress || progress.status === "NOT_STARTED") {
      return err("Submit an attempt (or give up) before viewing the solution", 403);
    }

    const result: ProblemSolution = {
      referenceExplanation: problem.referenceExplanation,
      referenceDiagram: problem.referenceDiagram,
      rubric: problem.rubric as unknown as ProblemSolution["rubric"],
      solutionCode: problem.solutionCode,
      solutionCodeLanguage: problem.solutionCodeLanguage,
      solutionSteps: asSolutionSteps(problem.solutionSteps),
    };
    return ok(result);
  } catch (e) {
    return toErrorResponse(e);
  }
}
