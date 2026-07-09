import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getUidFromRequest } from "@/lib/auth-server";
import { ok, err, toErrorResponse } from "@/lib/api-response";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const uid = await getUidFromRequest(req);
    const { id } = await params;

    const entry = await prisma.studyEntry.findUnique({ where: { id } });
    if (!entry) return err("Entry not found", 404);
    if (entry.userId !== uid) return err("Forbidden", 403);

    await prisma.studyEntry.delete({ where: { id } });
    return ok({ deleted: true });
  } catch (e) {
    return toErrorResponse(e);
  }
}
