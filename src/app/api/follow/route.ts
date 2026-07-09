import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getUidFromRequest } from "@/lib/auth-server";
import { ok, err, toErrorResponse } from "@/lib/api-response";

const bodySchema = z.object({ targetUid: z.string().min(1) });

export async function POST(req: NextRequest) {
  try {
    const uid = await getUidFromRequest(req);
    const { targetUid } = bodySchema.parse(await req.json());
    if (uid === targetUid) return err("Cannot follow yourself", 400);

    await prisma.follow.upsert({
      where: { followerId_followingId: { followerId: uid, followingId: targetUid } },
      create: { followerId: uid, followingId: targetUid },
      update: {},
    });
    return ok({ following: true }, 201);
  } catch (e) {
    return toErrorResponse(e);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const uid = await getUidFromRequest(req);
    const { targetUid } = bodySchema.parse(await req.json());

    await prisma.follow.deleteMany({ where: { followerId: uid, followingId: targetUid } });
    return ok({ following: false });
  } catch (e) {
    return toErrorResponse(e);
  }
}
