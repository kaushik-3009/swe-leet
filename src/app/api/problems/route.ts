import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, toErrorResponse } from "@/lib/api-response";
import { toProblemSummary } from "@/lib/mappers";

export async function GET(req: NextRequest) {
  try {
    const track = req.nextUrl.searchParams.get("track");
    const categoryId = req.nextUrl.searchParams.get("categoryId");

    const problems = await prisma.problem.findMany({
      where: {
        ...(track === "SYSTEM_DESIGN" || track === "LLD" ? { track } : {}),
        ...(categoryId ? { categoryId } : {}),
      },
      orderBy: [{ categoryId: "asc" }, { order: "asc" }],
    });
    return ok(problems.map(toProblemSummary));
  } catch (e) {
    return toErrorResponse(e);
  }
}
