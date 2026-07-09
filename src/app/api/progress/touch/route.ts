import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getUidFromRequest } from "@/lib/auth-server";
import { ok, err, toErrorResponse } from "@/lib/api-response";
import { todayStr } from "@/lib/dates";

const bodySchema = z.object({ problemId: z.string().min(1) });

// Marks a problem IN_PROGRESS the first time a user meaningfully interacts with it
// (canvas edit, code edit, or a checkbox), so they can later reveal the reference
// solution even without submitting for grading. On the very first touch ever for this
// (user, problem) pair, also writes a `problem_started` StudyEntry - this is the
// "automatic session logging" hook: opening a problem and doing *something* with it
// shows up in the heatmap/entry log without the user manually logging anything.
export async function POST(req: NextRequest) {
  try {
    const uid = await getUidFromRequest(req);
    const { problemId } = bodySchema.parse(await req.json());

    const existing = await prisma.problemProgress.findUnique({
      where: { userId_problemId: { userId: uid, problemId } },
    });
    if (existing) {
      return ok({ status: existing.status });
    }

    const problem = await prisma.problem.findUnique({ where: { id: problemId }, select: { title: true } });
    if (!problem) return err("Problem not found", 404);

    const [progress] = await prisma.$transaction([
      prisma.problemProgress.create({ data: { userId: uid, problemId, status: "IN_PROGRESS" } }),
      prisma.studyEntry.create({
        data: {
          userId: uid,
          topic: problem.title,
          resource: "Practice sandbox",
          date: todayStr(),
          kind: "problem_started",
          problemId,
        },
      }),
    ]);
    return ok({ status: progress.status });
  } catch (e) {
    return toErrorResponse(e);
  }
}
