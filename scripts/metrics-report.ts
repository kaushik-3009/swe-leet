/**
 * Print honest platform metrics. Synthetic rows are excluded unless explicitly requested,
 * and are always emitted under a separate synthetic section.
 *
 * Usage: npm run metrics:report -- --include-synthetic
 */
import "dotenv/config";
import { prisma } from "../src/lib/db";

const includeSynthetic = process.argv.includes("--include-synthetic");

type Scope = { isSynthetic: boolean };
type MetricsPrisma = {
  user: {
    count(args: { where: Scope }): Promise<number>;
    findMany(args: { where: Scope; select: { id: true } }): Promise<Array<{ id: string }>>;
  };
  studyEntry: { count(args: { where: { userId: { in: string[] } } }): Promise<number> };
  problemProgress: { count(args: { where: { userId: { in: string[] } } }): Promise<number> };
  submission: { count(args: { where: { userId: { in: string[] } } }): Promise<number> };
  codeSubmission: { count(args: { where: { userId: { in: string[] } } }): Promise<number> };
  codeRun: {
    count(args: { where: { userId: { in: string[] } } }): Promise<number>;
    groupBy(args: { by: ["status"]; where: { userId: { in: string[] } }; _count: { _all: true } }): Promise<Array<{ status: string; _count: { _all: number } }>>;
  };
};

const metricsPrisma = prisma as unknown as MetricsPrisma;

async function reportScope(scope: Scope) {
  const users = await metricsPrisma.user.count({ where: scope });
  const userIds = await metricsPrisma.user.findMany({ where: scope, select: { id: true } });
  const ids = userIds.map((user) => user.id);
  if (ids.length === 0) {
    return { users: 0, entries: 0, problemProgress: 0, submissions: 0, codeSubmissions: 0, codeRuns: 0 };
  }

  const [entries, problemProgress, submissions, codeSubmissions, codeRuns] = await Promise.all([
    metricsPrisma.studyEntry.count({ where: { userId: { in: ids } } }),
    metricsPrisma.problemProgress.count({ where: { userId: { in: ids } } }),
    metricsPrisma.submission.count({ where: { userId: { in: ids } } }),
    metricsPrisma.codeSubmission.count({ where: { userId: { in: ids } } }),
    metricsPrisma.codeRun.count({ where: { userId: { in: ids } } }),
  ]);

  const codeRunStatuses = await metricsPrisma.codeRun.groupBy({
    by: ["status"],
    where: { userId: { in: ids } },
    _count: { _all: true },
  });

  return {
    users,
    entries,
    problemProgress,
    submissions,
    codeSubmissions,
    codeRuns,
    codeRunStatuses: Object.fromEntries(codeRunStatuses.map((row) => [row.status, row._count._all])),
  };
}

async function main() {
  const production = await reportScope({ isSynthetic: false });
  const output: Record<string, unknown> = {
    generatedAt: new Date().toISOString(),
    scope: "non_synthetic_only",
    production,
  };
  if (includeSynthetic) {
    output.synthetic = {
      note: "Synthetic staging/demo data. Not real-user traction or adoption evidence.",
      metrics: await reportScope({ isSynthetic: true }),
    };
  }
  console.log(JSON.stringify(output, null, 2));
}

main()
  .catch((error) => {
    console.error("Metrics report failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
