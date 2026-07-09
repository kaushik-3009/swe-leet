import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getUidFromRequest } from "@/lib/auth-server";
import { ok, toErrorResponse } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  try {
    const uid = await getUidFromRequest(req);
    await prisma.studyEntry.deleteMany({ where: { userId: uid } });
    return ok({ cleared: true });
  } catch (e) {
    return toErrorResponse(e);
  }
}
