import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getUidFromRequest } from "@/lib/auth-server";
import { ok, toErrorResponse } from "@/lib/api-response";
import { mondayOf, addDaysStr } from "@/lib/dates";
import type { WeeklyGoalProgress } from "@/lib/types";

const setSchema = z.object({
  targetSessions: z.number().int().min(1).max(200),
});

export async function POST(req: NextRequest) {
  try {
    const uid = await getUidFromRequest(req);
    const { targetSessions } = setSchema.parse(await req.json());
    const weekStart = mondayOf();

    const goal = await prisma.weeklyGoal.upsert({
      where: { userId_weekStart: { userId: uid, weekStart } },
      create: { userId: uid, weekStart, targetSessions },
      update: { targetSessions },
    });

    const completedSessions = await prisma.studyEntry.count({
      where: { userId: uid, date: { gte: weekStart, lt: addDaysStr(weekStart, 7) } },
    });

    const result: WeeklyGoalProgress = { weekStart: goal.weekStart, targetSessions: goal.targetSessions, completedSessions };
    return ok(result);
  } catch (e) {
    return toErrorResponse(e);
  }
}
