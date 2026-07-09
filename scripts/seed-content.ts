/**
 * Idempotent content seed: upserts roadmap categories and problems (by slug) into
 * Postgres, generating each problem's reference diagram from its rubric.
 *
 * Usage: npx tsx scripts/seed-content.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/db";
import { categories } from "../content/categories";
import { systemDesignProblems } from "../content/system-design/problems";
import { lldProblems } from "../content/lld/problems";
import { autoLayoutDiagram } from "../content/autoLayout";
import type { ProblemSpec } from "../content/schema";

async function seedCategories() {
  const categoryIdBySlug = new Map<string, string>();
  for (const c of categories) {
    const row = await prisma.category.upsert({
      where: { slug: c.slug },
      create: { slug: c.slug, track: c.track, title: c.title, description: c.description, order: c.order },
      update: { track: c.track, title: c.title, description: c.description, order: c.order },
    });
    categoryIdBySlug.set(c.slug, row.id);
  }
  return categoryIdBySlug;
}

async function seedProblem(spec: ProblemSpec, categoryIdBySlug: Map<string, string>) {
  const categoryId = categoryIdBySlug.get(spec.categorySlug);
  if (!categoryId) throw new Error(`Unknown category slug "${spec.categorySlug}" for problem "${spec.slug}"`);

  const referenceDiagram = autoLayoutDiagram(
    spec.rubric.requiredComponents,
    spec.rubric.requiredConnections
  );

  await prisma.problem.upsert({
    where: { slug: spec.slug },
    create: {
      slug: spec.slug,
      track: spec.track,
      categoryId,
      title: spec.title,
      description: spec.description,
      difficulty: spec.difficulty,
      tags: spec.tags,
      estMinutes: spec.estMinutes,
      order: spec.order,
      referenceExplanation: spec.referenceExplanation,
      referenceDiagram: referenceDiagram as object,
      rubric: spec.rubric as object,
    },
    update: {
      track: spec.track,
      categoryId,
      title: spec.title,
      description: spec.description,
      difficulty: spec.difficulty,
      tags: spec.tags,
      estMinutes: spec.estMinutes,
      order: spec.order,
      referenceExplanation: spec.referenceExplanation,
      referenceDiagram: referenceDiagram as object,
      rubric: spec.rubric as object,
    },
  });
}

async function main() {
  console.log("Seeding categories...");
  const categoryIdBySlug = await seedCategories();
  console.log(`  -> ${categories.length} categories`);

  const allProblems = [...systemDesignProblems, ...lldProblems];
  console.log(`Seeding ${allProblems.length} problems (${systemDesignProblems.length} System Design, ${lldProblems.length} LLD)...`);

  for (const spec of allProblems) {
    await seedProblem(spec, categoryIdBySlug);
    console.log(`  -> ${spec.slug}`);
  }

  console.log("\nSeed complete.");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
