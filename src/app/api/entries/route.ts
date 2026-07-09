import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getUidFromRequest } from "@/lib/auth-server";
import { ok, err, toErrorResponse } from "@/lib/api-response";
import { toStudyEntry } from "@/lib/mappers";

const createSchema = z.object({
  topic: z.string().trim().min(1).max(200),
  resource: z.string().trim().min(1).max(300),
});

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;

// Public read: entries are shown on friend profiles without requiring the viewer to be
// that user. Cursor-paginated (by entry id, newest first) so the full study log - which
// grows unboundedly over months of use - never requires a single unbounded table scan
// or an unbounded JSON payload; the dashboard widget uses the small default page, and
// /sessions ("View All") pages through the rest with `cursor`.
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId");
    if (!userId) return err("userId query param required", 400);

    const limitParam = Number(req.nextUrl.searchParams.get("limit") ?? DEFAULT_LIMIT);
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(1, limitParam), MAX_LIMIT) : DEFAULT_LIMIT;
    const cursor = req.nextUrl.searchParams.get("cursor");

    const entries = await prisma.studyEntry.findMany({
      where: { userId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = entries.length > limit;
    const page = hasMore ? entries.slice(0, limit) : entries;

    return ok({
      entries: page.map(toStudyEntry),
      nextCursor: hasMore ? page[page.length - 1].id : null,
    });
  } catch (e) {
    return toErrorResponse(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const uid = await getUidFromRequest(req);
    const { topic, resource } = createSchema.parse(await req.json());

    const entry = await prisma.studyEntry.create({
      data: {
        userId: uid,
        topic,
        resource,
        date: new Date().toISOString().split("T")[0],
        kind: "manual",
      },
    });
    return ok(toStudyEntry(entry), 201);
  } catch (e) {
    return toErrorResponse(e);
  }
}
