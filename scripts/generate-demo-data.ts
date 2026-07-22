/**
 * Generate deterministic, explicitly synthetic demo data for staging/load checks.
 * This command only creates or upserts rows. Use an explicitly reviewed database
 * cleanup operation to remove a synthetic run; generation never deletes data.
 *
 * Usage:
 *   npx tsx scripts/generate-demo-data.ts --environment=staging
 *   npx tsx scripts/generate-demo-data.ts --environment=staging --run-id=demo-v1
 */
import "dotenv/config";
import { prisma } from "../src/lib/db";

const DEFAULT_RUN_ID = "synthetic-demo-v1";
const PROFILE_COUNT = 75;
const HISTORY_DAYS = 90;
const BASE_DATE = "2026-07-21T12:00:00.000Z";

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

function option(name: string, fallback: string): string {
  const prefix = `${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || fallback;
}

function assertSafeEnvironment() {
  const environment = option("--environment", "");
  const allowProduction = hasFlag("--allow-production-demo-data");
  if (environment !== "staging" && !(allowProduction && process.env.DEMO_DATA_ENABLED === "true")) {
    throw new Error(
      "Synthetic data is disabled by default. Pass --environment=staging; production also requires DEMO_DATA_ENABLED=true and --allow-production-demo-data.",
    );
  }
  if (process.env.NODE_ENV === "production" && !allowProduction) {
    throw new Error("Refusing to generate synthetic data in production without explicit allow flag.");
  }
}

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function dateAtOffset(offset: number): { date: string; createdAt: Date } {
  const base = new Date(BASE_DATE);
  base.setUTCDate(base.getUTCDate() - offset);
  const date = base.toISOString().slice(0, 10);
  return { date, createdAt: new Date(base.getTime() + offset * 1_000) };
}

function buildEntries(userId: string, index: number, runId: string, random: () => number) {
  const topics = [
    ["Caching", "Synthetic study fixture: cache eviction"],
    ["Load Balancing", "Synthetic study fixture: request routing"],
    ["Message Queues", "Synthetic study fixture: delivery semantics"],
    ["Database Sharding", "Synthetic study fixture: partitioning"],
    ["Object Design", "Synthetic study fixture: class responsibilities"],
  ] as const;
  const entries: Array<{
    id: string;
    userId: string;
    topic: string;
    resource: string;
    date: string;
    createdAt: Date;
    kind: "manual";
  }> = [];

  for (let offset = 0; offset < HISTORY_DAYS; offset += 1) {
    const activityChance = 0.18 + (index % 5) * 0.08;
    if (random() > activityChance) continue;
    const count = random() > 0.82 ? 2 : 1;
    const { date, createdAt } = dateAtOffset(offset);
    for (let item = 0; item < count; item += 1) {
      const [topic, resource] = topics[Math.floor(random() * topics.length)];
      entries.push({
        id: `synthetic-entry-${runId}-${String(index + 1).padStart(2, "0")}-${offset}-${item}`,
        userId,
        topic,
        resource,
        date,
        createdAt: new Date(createdAt.getTime() + item * 1_000),
        kind: "manual",
      });
    }
  }
  return entries;
}

async function main() {
  assertSafeEnvironment();
  const runId = option("--run-id", DEFAULT_RUN_ID).trim();
  if (!/^[a-zA-Z0-9._-]{1,80}$/.test(runId)) throw new Error("Invalid synthetic run id");

  const random = seededRandom(0x51eede + runId.length);
  const users = Array.from({ length: PROFILE_COUNT }, (_, index) => {
    const number = String(index + 1).padStart(2, "0");
    return {
      id: `synthetic_${runId}_${number}`,
      username: `sample_learner_${number}`,
      displayName: `Sample learner ${number}`,
      email: `sample-${number}@synthetic.invalid`,
      isSynthetic: true,
      syntheticRunId: runId,
    };
  });

  for (const user of users) {
    await prisma.user.upsert({
      where: { id: user.id },
      create: user,
      update: {
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        isSynthetic: true,
        syntheticRunId: runId,
      } as never,
    });
  }

  const entries = users.flatMap((user, index) => buildEntries(user.id, index, runId, random));
  if (entries.length > 0) await prisma.studyEntry.createMany({ data: entries, skipDuplicates: true });

  const problems = await prisma.problem.findMany({ select: { id: true } });
  const progress = users.flatMap((user, userIndex) =>
    problems
      .filter((_, problemIndex) => (problemIndex + userIndex) % 4 === 0)
      .map((problem, problemIndex) => ({
        userId: user.id,
        problemId: problem.id,
        status: problemIndex % 3 === 0 ? ("SOLVED" as const) : ("IN_PROGRESS" as const),
        bestScore: problemIndex % 3 === 0 ? 70 + ((userIndex + problemIndex) % 31) : 35 + ((userIndex + problemIndex) % 35),
      })),
  );
  for (const row of progress) {
    await prisma.problemProgress.upsert({
      where: { userId_problemId: { userId: row.userId, problemId: row.problemId } },
      create: row,
      update: { status: row.status, bestScore: row.bestScore },
    });
  }

  const followRows = users.map((user, index) => ({
    followerId: user.id,
    followingId: users[(index + 1) % users.length].id,
  }));
  await prisma.follow.createMany({ data: followRows, skipDuplicates: true });

  console.log(JSON.stringify({
    synthetic: true,
    runId,
    profiles: users.length,
    entries: entries.length,
    progress: progress.length,
    follows: followRows.length,
    baseDate: BASE_DATE,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error("Synthetic data generation failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
