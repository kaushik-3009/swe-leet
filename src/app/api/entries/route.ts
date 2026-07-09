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

// Public read: entries are shown on friend profiles without requiring the viewer to be that user.
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId");
    if (!userId) return err("userId query param required", 400);

    const entries = await prisma.studyEntry.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    return ok(entries.map(toStudyEntry));
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
