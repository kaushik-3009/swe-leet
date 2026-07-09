import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { tryGetUidFromRequest } from "@/lib/auth-server";
import { ok, err, toErrorResponse } from "@/lib/api-response";
import { toStudyEntry } from "@/lib/mappers";
import { mondayOf, addDaysStr } from "@/lib/dates";
import type { DashboardData } from "@/lib/types";

const RECENT_LIMIT = 30;

// Single consolidated read for the dashboard: previously Stats, Heatmap, and EntryList
// each independently fetched the caller's *entire* entries table on every page load
// (three full-table round trips for identical data, growing unbounded as history grows).
// This replaces all three with one call: two indexed aggregate queries (date/topic counts
// computed in Postgres, not in the browser) plus a capped recent-entries page.
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId");
    if (!userId) return err("userId query param required", 400);

    const uid = await tryGetUidFromRequest(req);
    const weekStart = mondayOf();

    const [totalEntries, byDate, byTopic, recent, goal, completedThisWeek] = await Promise.all([
      prisma.studyEntry.count({ where: { userId } }),
      prisma.studyEntry.groupBy({ by: ["date"], where: { userId }, _count: { _all: true } }),
      prisma.studyEntry.groupBy({ by: ["topic"], where: { userId } }),
      prisma.studyEntry.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: RECENT_LIMIT }),
      uid && uid === userId ? prisma.weeklyGoal.findUnique({ where: { userId_weekStart: { userId, weekStart } } }) : null,
      uid && uid === userId
        ? prisma.studyEntry.count({ where: { userId, date: { gte: weekStart, lt: addDaysStr(weekStart, 7) } } })
        : 0,
    ]);

    const heatmap: Record<string, number> = {};
    for (const row of byDate) heatmap[row.date] = row._count._all;

    const data: DashboardData = {
      stats: { totalEntries, studyDays: byDate.length, uniqueTopics: byTopic.length },
      heatmap,
      recentEntries: recent.map(toStudyEntry),
      weeklyGoal: goal ? { weekStart: goal.weekStart, targetSessions: goal.targetSessions, completedSessions: completedThisWeek } : null,
    };

    return ok(data);
  } catch (e) {
    return toErrorResponse(e);
  }
}
