import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, err, toErrorResponse } from "@/lib/api-response";

// Lightweight distinct-topic list for the "Log Study Session" autocomplete - previously
// the caller fetched the user's entire entries table (every topic/resource/date/kind
// field, unbounded) just to read off unique topic strings. This does the distinct in
// Postgres and returns only what the UI needs.
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId");
    if (!userId) return err("userId query param required", 400);

    const rows = await prisma.studyEntry.groupBy({ by: ["topic"], where: { userId } });
    return ok(rows.map((r) => r.topic).sort());
  } catch (e) {
    return toErrorResponse(e);
  }
}
