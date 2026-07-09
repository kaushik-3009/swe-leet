/**
 * Idempotent content seed: upserts roadmap categories (with their study-plan resources
 * and article), and problems, into Postgres, generating each problem's reference diagram
 * from its rubric.
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
      create: {
        slug: c.slug,
        track: c.track,
        title: c.title,
        description: c.description,
        order: c.order,
        articleTitle: c.articleTitle,
        articleContent: c.articleContent,
      },
      update: {
        track: c.track,
        title: c.title,
        description: c.description,
        order: c.order,
        articleTitle: c.articleTitle,
        articleContent: c.articleContent,
      },
    });
    categoryIdBySlug.set(c.slug, row.id);

    const resources = c.resources ?? [];
    const rows = [
      ...resources.map((r) => ({ kind: "EXTERNAL" as const, title: r.title, url: r.url, order: r.order })),
      ...(c.articleContent ? [{ kind: "ARTICLE" as const, title: c.articleTitle ?? `${c.title} article`, url: null, order: 0 }] : []),
    ];

    const existing = await prisma.resource.findMany({ where: { categoryId: row.id } });
    const existingByTitle = new Map(existing.map((r) => [`${r.kind}:${r.title}`, r]));

    for (const r of rows) {
      const key = `${r.kind}:${r.title}`;
      const found = existingByTitle.get(key);
      if (found) {
        await prisma.resource.update({ where: { id: found.id }, data: { url: r.url, order: r.order } });
        existingByTitle.delete(key);
      } else {
        await prisma.resource.create({ data: { categoryId: row.id, kind: r.kind, title: r.title, url: r.url, order: r.order } });
      }
    }
    // Anything left in existingByTitle is stale content (renamed/removed upstream) - drop it.
    for (const stale of existingByTitle.values()) {
      await prisma.resource.delete({ where: { id: stale.id } });
    }
  }
  return categoryIdBySlug;
}

function defaultDiagramType(spec: ProblemSpec) {
  return spec.diagramType ?? (spec.track === "LLD" ? "CLASS" : "ARCHITECTURE");
}

async function seedProblem(spec: ProblemSpec, categoryIdBySlug: Map<string, string>) {
  const categoryId = categoryIdBySlug.get(spec.categorySlug);
  if (!categoryId) throw new Error(`Unknown category slug "${spec.categorySlug}" for problem "${spec.slug}"`);

  const referenceDiagram = autoLayoutDiagram(
    spec.rubric.requiredComponents,
    spec.rubric.requiredConnections
  );

  const shared = {
    track: spec.track,
    categoryId,
    title: spec.title,
    description: spec.description,
    difficulty: spec.difficulty,
    tags: spec.tags,
    estMinutes: spec.estMinutes,
    order: spec.order,
    diagramType: defaultDiagramType(spec),
    generalHint: spec.generalHint,
    stepHints: spec.stepHints ?? [],
    videoUrl: spec.videoUrl,
    inStudyPlanSubset: spec.inStudyPlanSubset ?? false,
    referenceExplanation: spec.referenceExplanation,
    referenceDiagram: referenceDiagram as object,
    solutionCode: spec.solutionCode,
    solutionCodeLanguage: spec.solutionCodeLanguage ?? "python",
    solutionSteps: (spec.solutionSteps ?? []) as object,
    rubric: spec.rubric as object,
  };

  await prisma.problem.upsert({
    where: { slug: spec.slug },
    create: { slug: spec.slug, ...shared },
    update: shared,
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
