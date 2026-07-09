import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, err, toErrorResponse } from "@/lib/api-response";
import { toUserProfile } from "@/lib/mappers";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  try {
    const { username } = await params;
    const user = await prisma.user.findUnique({ where: { username: username.toLowerCase() } });
    if (!user) return err("User not found", 404);
    return ok(toUserProfile(user));
  } catch (e) {
    return toErrorResponse(e);
  }
}
