import type { Rubric } from "@/lib/types";
import type { StructuralMatchResult } from "./structural";

// Coarse, deterministic signal for LLD code submissions: does the rubric's expected
// vocabulary (component/class names, and both ends of a stated relationship) actually
// show up in the submitted code? This can't verify real usage (that's the AI grader's
// job), it just catches the "didn't even attempt the required class" case cheaply and
// without an API call, mirroring the canvas structural check's role in the blended score.
function normalize(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function matchCodeStructural(code: string, rubric: Rubric): StructuralMatchResult {
  const normalizedCode = normalize(code);

  const matchedComponents: string[] = [];
  const missingComponents: string[] = [];
  for (const required of rubric.requiredComponents) {
    const found = normalizedCode.includes(normalize(required));
    (found ? matchedComponents : missingComponents).push(required);
  }

  const matchedConnections: string[] = [];
  const missingConnections: string[] = [];
  for (const conn of rubric.requiredConnections) {
    const label = `${conn.from} -> ${conn.to}`;
    const found = normalizedCode.includes(normalize(conn.from)) && normalizedCode.includes(normalize(conn.to));
    (found ? matchedConnections : missingConnections).push(label);
  }

  const total = rubric.requiredComponents.length + rubric.requiredConnections.length;
  const matched = matchedComponents.length + matchedConnections.length;
  const coverage = total === 0 ? 100 : Math.round((matched / total) * 100);

  return { matchedComponents, missingComponents, matchedConnections, missingConnections, coverage };
}
