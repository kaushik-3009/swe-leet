import { prisma } from "@/lib/db";

type BucketClient = {
  rateLimitBucket: {
    upsert(args: {
      where: { subject_bucket_windowStart: { subject: string; bucket: string; windowStart: Date } };
      create: { subject: string; bucket: string; windowStart: Date; count: number };
      update: { count: { increment: number } };
    }): Promise<{ count: number }>;
  };
};

const db = prisma as unknown as BucketClient;

export interface RateLimitResult {
  allowed: boolean;
  count: number;
  retryAfterSeconds: number;
}

/** Database-backed fixed-window limiter suitable for multiple serverless instances. */
export async function consumeRateLimit(params: {
  subject: string;
  bucket: string;
  limit: number;
  windowMs: number;
}): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStart = new Date(Math.floor(now / params.windowMs) * params.windowMs);
  const row = await db.rateLimitBucket.upsert({
    where: {
      subject_bucket_windowStart: {
        subject: params.subject,
        bucket: params.bucket,
        windowStart,
      },
    },
    create: { subject: params.subject, bucket: params.bucket, windowStart, count: 1 },
    update: { count: { increment: 1 } },
  });
  const retryAfterSeconds = Math.max(1, Math.ceil((windowStart.getTime() + params.windowMs - now) / 1000));
  return { allowed: row.count <= params.limit, count: row.count, retryAfterSeconds };
}
