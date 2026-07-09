import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getUidFromRequest } from "@/lib/auth-server";
import { ok, toErrorResponse } from "@/lib/api-response";

const bodySchema = z.object({ problemId: z.string().min(1) });

// Marks a problem IN_PROGRESS the first time a user opens/saves the canvas, so
// they can later reveal the reference solution even without submitting for grading.
export async function POST(req: NextRequest) {
  try {
    const uid = await getUidFromRequest(req);
    const { problemId } = bodySchema.parse(await req.json());

    const progress = await prisma.problemProgress.upsert({
      where: { userId_problemId: { userId: uid, problemId } },
      create: { userId: uid, problemId, status: "IN_PROGRESS" },
      update: {},
    });
    return ok({ status: progress.status });
  } catch (e) {
    return toErrorResponse(e);
  }
}
