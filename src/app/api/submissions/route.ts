import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getUidFromRequest } from "@/lib/auth-server";
import { ok, err, toErrorResponse } from "@/lib/api-response";
import { toSubmission, asRubric } from "@/lib/mappers";
import { gradeSubmission } from "@/lib/grading";

const bodySchema = z.object({
  problemId: z.string().min(1),
  canvasSnapshot: z.unknown(),
});

const SOLVED_THRESHOLD = Number(process.env.SOLVED_THRESHOLD ?? 70);

export async function POST(req: NextRequest) {
  try {
    const uid = await getUidFromRequest(req);
    const { problemId, canvasSnapshot } = bodySchema.parse(await req.json());

    const problem = await prisma.problem.findUnique({ where: { id: problemId } });
    if (!problem) return err("Problem not found", 404);

    const { score, feedback, structuralResult } = await gradeSubmission({
      problemTitle: problem.title,
      problemDescription: problem.description,
      rubric: asRubric(problem.rubric),
      canvasSnapshot,
    });

    const lastVersion = await prisma.submission.aggregate({
      where: { userId: uid, problemId },
      _max: { version: true },
    });
    const version = (lastVersion._max.version ?? 0) + 1;

    const submission = await prisma.submission.create({
      data: {
        userId: uid,
        problemId,
        version,
        canvasSnapshot: canvasSnapshot as object,
        score,
        feedback: feedback as unknown as object,
        structuralResult: structuralResult as unknown as object,
      },
    });

    const solved = score >= SOLVED_THRESHOLD;
    const existingProgress = await prisma.problemProgress.findUnique({
      where: { userId_problemId: { userId: uid, problemId } },
    });
    const bestScore = Math.max(existingProgress?.bestScore ?? 0, score);
    const status = solved ? "SOLVED" : (existingProgress?.status ?? "IN_PROGRESS");

    const progress = await prisma.problemProgress.upsert({
      where: { userId_problemId: { userId: uid, problemId } },
      create: { userId: uid, problemId, status, bestScore },
      update: { status, bestScore },
    });

    await prisma.studyEntry.create({
      data: {
        userId: uid,
        topic: problem.title,
        resource: `${problem.track === "SYSTEM_DESIGN" ? "System Design" : "LLD"} practice — ${solved ? "solved" : "attempted"} (score ${score})`,
        date: new Date().toISOString().split("T")[0],
        kind: solved ? "problem_solved" : "problem_attempt",
        problemId,
      },
    });

    return ok({ submission: toSubmission(submission), status: progress.status, bestScore: progress.bestScore }, 201);
  } catch (e) {
    return toErrorResponse(e);
  }
}

export async function GET(req: NextRequest) {
  try {
    const uid = await getUidFromRequest(req);
    const problemId = req.nextUrl.searchParams.get("problemId");
    if (!problemId) return err("problemId query param required", 400);

    const submissions = await prisma.submission.findMany({
      where: { userId: uid, problemId },
      orderBy: { version: "desc" },
    });
    return ok(submissions.map(toSubmission));
  } catch (e) {
    return toErrorResponse(e);
  }
}
