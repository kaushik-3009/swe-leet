import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getUidFromRequest } from "@/lib/auth-server";
import { ok, err, toErrorResponse } from "@/lib/api-response";
import { todayStr } from "@/lib/dates";

// Auto-logged the first time in a day a user opens a topic's own written article -
// called once by the topic page on mount, deduped server-side (not just client-side)
// so refreshing the page doesn't spam the entry log.
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const uid = await getUidFromRequest(req);
    const { slug } = await params;
    const category = await prisma.category.findUnique({ where: { slug }, select: { id: true, title: true, articleContent: true } });
    if (!category || !category.articleContent) return err("Article not found", 404);

    const today = todayStr();
    const alreadyLogged = await prisma.studyEntry.findFirst({
      where: { userId: uid, kind: "article_viewed", date: today, topic: category.title },
    });
    if (alreadyLogged) return ok({ logged: false });

    await prisma.studyEntry.create({
      data: {
        userId: uid,
        topic: category.title,
        resource: "Read our topic article",
        date: today,
        kind: "article_viewed",
      },
    });
    return ok({ logged: true });
  } catch (e) {
    return toErrorResponse(e);
  }
}
