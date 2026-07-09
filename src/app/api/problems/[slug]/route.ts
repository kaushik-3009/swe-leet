import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, err, toErrorResponse } from "@/lib/api-response";
import { toProblemDetail } from "@/lib/mappers";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const problem = await prisma.problem.findUnique({ where: { slug } });
    if (!problem) return err("Problem not found", 404);
    return ok(toProblemDetail(problem));
  } catch (e) {
    return toErrorResponse(e);
  }
}
