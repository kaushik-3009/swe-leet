import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getUidFromRequest } from "@/lib/auth-server";
import { ok, err, toErrorResponse } from "@/lib/api-response";
import { toReview } from "@/lib/mappers";

const bodySchema = z.object({
  problemId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  body: z.string().trim().min(1).max(2000),
});

export async function GET(req: NextRequest) {
  try {
    const problemId = req.nextUrl.searchParams.get("problemId");
    if (!problemId) return err("problemId query param required", 400);

    const reviews = await prisma.review.findMany({
      where: { problemId },
      include: { user: true },
      orderBy: { createdAt: "desc" },
    });
    return ok(reviews.map(toReview));
  } catch (e) {
    return toErrorResponse(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const uid = await getUidFromRequest(req);
    const { problemId, rating, body } = bodySchema.parse(await req.json());

    const problem = await prisma.problem.findUnique({ where: { id: problemId } });
    if (!problem) return err("Problem not found", 404);

    const review = await prisma.review.create({
      data: { problemId, userId: uid, rating, body },
      include: { user: true },
    });
    return ok(toReview(review), 201);
  } catch (e) {
    return toErrorResponse(e);
  }
}
