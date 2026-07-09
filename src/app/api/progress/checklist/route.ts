import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getUidFromRequest } from "@/lib/auth-server";
import { ok, err, toErrorResponse } from "@/lib/api-response";
import { todayStr } from "@/lib/dates";

const bodySchema = z.object({ problemId: z.string().min(1), done: z.boolean() });
const SOLVED_THRESHOLD = Number(process.env.SOLVED_THRESHOLD ?? 70);

// Manual "mark done" checkbox for the problem list / study-plan problem subset. This is
// intentionally the *same* ProblemProgress row that grading writes to (single source of
// truth - see docs/DECISIONS.md), so checking a problem off here shows up as solved
// everywhere else (roadmap, study-plan subset, friend profile) and vice versa.
//
// Unchecking a problem that was actually earned via grading (bestScore >= threshold) is
// a no-op: grading is authoritative and a manual uncheck shouldn't erase a real result.
export async function POST(req: NextRequest) {
  try {
    const uid = await getUidFromRequest(req);
    const { problemId, done } = bodySchema.parse(await req.json());

    const problem = await prisma.problem.findUnique({ where: { id: problemId }, select: { title: true } });
    if (!problem) return err("Problem not found", 404);

    const existing = await prisma.problemProgress.findUnique({
      where: { userId_problemId: { userId: uid, problemId } },
    });

    if (done) {
      if (existing?.status === "SOLVED") {
        return ok({ status: existing.status, bestScore: existing.bestScore });
      }
      const progress = await prisma.problemProgress.upsert({
        where: { userId_problemId: { userId: uid, problemId } },
        create: { userId: uid, problemId, status: "SOLVED", bestScore: existing?.bestScore ?? 0 },
        update: { status: "SOLVED" },
      });
      await prisma.studyEntry.create({
        data: {
          userId: uid,
          topic: problem.title,
          resource: "Marked done from the problem list",
          date: todayStr(),
          kind: "problem_checklist",
          problemId,
        },
      });
      return ok({ status: progress.status, bestScore: progress.bestScore });
    }

    // Unchecking.
    if (!existing || existing.status !== "SOLVED") {
      return ok({ status: existing?.status ?? "NOT_STARTED", bestScore: existing?.bestScore ?? 0 });
    }
    if (existing.bestScore >= SOLVED_THRESHOLD) {
      // Earned via grading - grading is authoritative, ignore the uncheck.
      return ok({ status: existing.status, bestScore: existing.bestScore });
    }
    const progress = await prisma.problemProgress.update({
      where: { userId_problemId: { userId: uid, problemId } },
      data: { status: "IN_PROGRESS" },
    });
    return ok({ status: progress.status, bestScore: progress.bestScore });
  } catch (e) {
    return toErrorResponse(e);
  }
}
