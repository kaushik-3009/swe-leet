import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getUidFromRequest } from "@/lib/auth-server";
import { ok, err, toErrorResponse } from "@/lib/api-response";
import { todayStr } from "@/lib/dates";

const bodySchema = z.object({ resourceId: z.string().min(1), done: z.boolean() });

export async function POST(req: NextRequest) {
  try {
    const uid = await getUidFromRequest(req);
    const { resourceId, done } = bodySchema.parse(await req.json());

    const resource = await prisma.resource.findUnique({
      where: { id: resourceId },
      select: { title: true, category: { select: { title: true } } },
    });
    if (!resource) return err("Resource not found", 404);

    const existing = await prisma.resourceProgress.findUnique({
      where: { userId_resourceId: { userId: uid, resourceId } },
    });

    if (done) {
      if (existing) return ok({ completed: true, completedAt: existing.completedAt.getTime() });
      const created = await prisma.resourceProgress.create({ data: { userId: uid, resourceId } });
      await prisma.studyEntry.create({
        data: {
          userId: uid,
          topic: resource.category.title,
          resource: `Resource: ${resource.title}`,
          date: todayStr(),
          kind: "resource_completed",
        },
      });
      return ok({ completed: true, completedAt: created.completedAt.getTime() });
    }

    if (existing) {
      await prisma.resourceProgress.delete({ where: { userId_resourceId: { userId: uid, resourceId } } });
    }
    return ok({ completed: false });
  } catch (e) {
    return toErrorResponse(e);
  }
}
