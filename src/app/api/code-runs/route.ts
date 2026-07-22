import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getUidFromRequest } from "@/lib/auth-server";
import { err, errWithHeaders, ok, toErrorResponse } from "@/lib/api-response";
import { consumeRateLimit } from "@/lib/rate-limit";
import { hashCode } from "@/lib/compiler/onlineCompiler";
import { executePublicTests } from "@/lib/compiler/publicTests";
import type { CodeRunStatus, CodeRunTestResult } from "@/lib/types";

const bodySchema = z.object({
  problemId: z.string().min(1),
  code: z.string().min(1).max(100_000),
  language: z.literal("python").default("python"),
});

const db = prisma as unknown as {
  problem: {
    findUnique(args: unknown): Promise<{ id: string; track: string; executionSpec: unknown } | null>;
  };
  codeRun: {
    create(args: { data: unknown }): Promise<CodeRunRow>;
    findMany(args: unknown): Promise<CodeRunRow[]>;
  };
};

type CodeRunRow = {
  id: string;
  userId: string;
  problemId: string;
  codeSubmissionId: string | null;
  compiler: string;
  language: string;
  codeHash: string;
  codeBytes: number;
  status: CodeRunStatus;
  result: unknown;
  durationMs: number | null;
  memoryKb: number | null;
  createdAt: Date;
};

function toClientRun(row: CodeRunRow) {
  const result = row.result && typeof row.result === "object"
    ? row.result as { tests?: CodeRunTestResult[]; summary?: { total: number; passed: number; failed: number } }
    : {};
  return {
    id: row.id,
    userId: row.userId,
    problemId: row.problemId,
    codeSubmissionId: row.codeSubmissionId,
    compiler: row.compiler,
    language: row.language,
    codeHash: row.codeHash,
    codeBytes: row.codeBytes,
    status: row.status,
    tests: result.tests ?? [],
    summary: result.summary ?? { total: 0, passed: 0, failed: 0 },
    durationMs: row.durationMs,
    memoryKb: row.memoryKb,
    createdAt: row.createdAt.getTime(),
  };
}

export async function POST(req: NextRequest) {
  try {
    const uid = await getUidFromRequest(req);
    const body = bodySchema.parse(await req.json());
    const rate = await consumeRateLimit({ subject: uid, bucket: "code-run", limit: 10, windowMs: 60_000 });
    if (!rate.allowed) {
      return errWithHeaders("Too many code runs. Try again shortly.", 429, { "Retry-After": String(rate.retryAfterSeconds) });
    }

    const problem = await db.problem.findUnique({
      where: { id: body.problemId },
      select: { id: true, track: true, executionSpec: true },
    });
    if (!problem) return err("Problem not found", 404);
    if (problem.track !== "LLD") return err("Public code runs are only supported for LLD problems", 422);

    const publicRun = await executePublicTests(body.code, problem.executionSpec, problem.id);
    if (!publicRun) return err("This LLD problem has no supported public Python test contract", 422);

    const row = await db.codeRun.create({
      data: {
        userId: uid,
        problemId: problem.id,
        compiler: publicRun.compiler,
        language: body.language,
        codeHash: hashCode(body.code),
        codeBytes: Buffer.byteLength(body.code, "utf8"),
        status: publicRun.status,
        result: publicRun.result,
        durationMs: publicRun.durationMs,
        memoryKb: publicRun.memoryKb,
      },
    });

    return ok({ run: toClientRun(row) }, 201);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function GET(req: NextRequest) {
  try {
    const uid = await getUidFromRequest(req);
    const problemId = req.nextUrl.searchParams.get("problemId");
    if (!problemId) return err("problemId query param required", 400);
    const rows = await db.codeRun.findMany({
      where: { userId: uid, problemId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    return ok(rows.map(toClientRun));
  } catch (error) {
    return toErrorResponse(error);
  }
}
