import { describe, it, expect } from "vitest";
import { categories } from "./categories";
import { systemDesignProblems } from "./system-design/problems";
import { lldProblems } from "./lld/problems";
import { autoLayoutDiagram } from "./autoLayout";
import { extractGraph } from "../src/lib/grading/extract";
import { matchStructural } from "../src/lib/grading/structural";
import type { ProblemSpec } from "./schema";

const allProblems: ProblemSpec[] = [...systemDesignProblems, ...lldProblems];

// Guards against the exact class of authoring mistakes this content set has hit in
// practice: rubric/diagram drift, em dashes leaking into user-facing copy, and duplicate
// or dangling slugs. Runs against the raw content specs (no database needed), so it's
// cheap enough to run on every change to content/**.
describe("content integrity", () => {
  it("has no duplicate problem slugs", () => {
    const slugs = allProblems.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("has no duplicate category slugs", () => {
    const slugs = categories.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("every problem references an existing category", () => {
    const categorySlugs = new Set(categories.map((c) => c.slug));
    for (const p of allProblems) {
      expect(categorySlugs.has(p.categorySlug), `${p.slug} references unknown category "${p.categorySlug}"`).toBe(true);
    }
  });

  it("every problem's auto-generated reference diagram round-trips to 100% rubric coverage", () => {
    for (const p of allProblems) {
      const diagram = autoLayoutDiagram(p.rubric.requiredComponents, p.rubric.requiredConnections);
      const graph = extractGraph(diagram);
      const result = matchStructural(graph, p.rubric);
      expect(result.coverage, `${p.slug}: reference diagram does not fully cover its own rubric`).toBe(100);
    }
  });

  it("every LLD problem ships a reference solutionCode", () => {
    for (const p of lldProblems) {
      expect(p.solutionCode, `${p.slug} is LLD but has no solutionCode`).toBeTruthy();
    }
  });

  it("has no em dashes in user-facing content fields", () => {
    const offenders: string[] = [];
    const checkField = (owner: string, field: string, value: string | undefined) => {
      if (value?.includes("—")) offenders.push(`${owner}.${field}`);
    };
    for (const c of categories) {
      checkField(c.slug, "description", c.description);
      checkField(c.slug, "articleContent", c.articleContent);
      for (const r of c.resources ?? []) checkField(c.slug, `resource:${r.title}`, r.title);
    }
    for (const p of allProblems) {
      checkField(p.slug, "description", p.description);
      checkField(p.slug, "referenceExplanation", p.referenceExplanation);
      checkField(p.slug, "generalHint", p.generalHint);
      for (const h of p.stepHints ?? []) checkField(p.slug, "stepHints", h);
      for (const s of p.solutionSteps ?? []) {
        checkField(p.slug, `solutionStep:${s.title}`, s.title);
        checkField(p.slug, `solutionStep:${s.title}`, s.body);
      }
    }
    expect(offenders, `em dashes found in: ${offenders.join(", ")}`).toEqual([]);
  });

  it("every problem has at least a general hint or step hints", () => {
    for (const p of allProblems) {
      const hasHints = !!p.generalHint || (p.stepHints?.length ?? 0) > 0;
      expect(hasHints, `${p.slug} has no hints`).toBe(true);
    }
  });

  it("every problem has at least one solution step for progressive reveal", () => {
    for (const p of allProblems) {
      expect((p.solutionSteps?.length ?? 0) > 0, `${p.slug} has no solutionSteps`).toBe(true);
    }
  });
});
