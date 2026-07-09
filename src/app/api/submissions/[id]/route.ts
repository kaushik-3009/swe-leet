import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getUidFromRequest } from "@/lib/auth-server";
import { ok, err, toErrorResponse } from "@/lib/api-response";
import { toSubmission } from "@/lib/mappers";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const uid = await getUidFromRequest(req);
    const { id } = await params;

    const submission = await prisma.submission.findUnique({ where: { id } });
    if (!submission) return err("Submission not found", 404);
    if (submission.userId !== uid) return err("Forbidden", 403);

    return ok(toSubmission(submission));
  } catch (e) {
    return toErrorResponse(e);
  }
}
