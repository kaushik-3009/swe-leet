import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getUidFromRequest } from "@/lib/auth-server";
import { ok, err, toErrorResponse } from "@/lib/api-response";
import { toCodeSubmission, asRubric } from "@/lib/mappers";
import { gradeCodeSubmission } from "@/lib/grading";
import { todayStr } from "@/lib/dates";

const bodySchema = z.object({
  problemId: z.string().min(1),
  code: z.string().min(1).max(20000),
  language: z.string().min(1).max(30).default("python"),
});

const SOLVED_THRESHOLD = Number(process.env.SOLVED_THRESHOLD ?? 70);

export async function POST(req: NextRequest) {
  try {
    const uid = await getUidFromRequest(req);
    const { problemId, code, language } = bodySchema.parse(await req.json());

    const problem = await prisma.problem.findUnique({
      where: { id: problemId },
      select: { id: true, title: true, description: true, rubric: true, track: true },
    });
    if (!problem) return err("Problem not found", 404);
    if (problem.track !== "LLD") return err("Code submissions are only supported for LLD problems", 422);

    const { score, feedback, structuralResult } = await gradeCodeSubmission({
      problemTitle: problem.title,
      problemDescription: problem.description,
      rubric: asRubric(problem.rubric),
      code,
      language,
    });

    const lastVersion = await prisma.codeSubmission.aggregate({
      where: { userId: uid, problemId },
      _max: { version: true },
    });
    const version = (lastVersion._max.version ?? 0) + 1;

    const submission = await prisma.codeSubmission.create({
      data: {
        userId: uid,
        problemId,
        version,
        code,
        language,
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
        resource: `LLD code practice (${solved ? "solved" : "attempted"}, score ${score})`,
        date: todayStr(),
        kind: solved ? "problem_solved" : "problem_attempt",
        problemId,
      },
    });

    return ok({ submission: toCodeSubmission(submission), status: progress.status, bestScore: progress.bestScore }, 201);
  } catch (e) {
    return toErrorResponse(e);
  }
}

export async function GET(req: NextRequest) {
  try {
    const uid = await getUidFromRequest(req);
    const problemId = req.nextUrl.searchParams.get("problemId");
    if (!problemId) return err("problemId query param required", 400);

    const submissions = await prisma.codeSubmission.findMany({
      where: { userId: uid, problemId },
      orderBy: { version: "desc" },
    });
    return ok(submissions.map(toCodeSubmission));
  } catch (e) {
    return toErrorResponse(e);
  }
}
