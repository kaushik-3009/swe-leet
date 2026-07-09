import { extractGraph } from "./extract";
import { matchStructural } from "./structural";
import { gradeWithAi } from "./ai";
import type { Rubric, SubmissionFeedback, StructuralResult } from "@/lib/types";

export { extractGraph } from "./extract";
export { matchStructural } from "./structural";
export { gradeWithAi } from "./ai";

export interface GradeResult {
  score: number;
  feedback: SubmissionFeedback;
  structuralResult: StructuralResult;
}

export async function gradeSubmission(params: {
  problemTitle: string;
  problemDescription: string;
  rubric: Rubric;
  canvasSnapshot: unknown;
}): Promise<GradeResult> {
  const graph = extractGraph(params.canvasSnapshot);
  const structural = matchStructural(graph, params.rubric);
  const ai = await gradeWithAi({
    problemTitle: params.problemTitle,
    problemDescription: params.problemDescription,
    rubric: params.rubric,
    graph,
  });

  const score = ai ? Math.round(0.5 * structural.coverage + 0.5 * ai.score) : structural.coverage;

  const feedback: SubmissionFeedback = ai
    ? { strengths: ai.strengths, missing: ai.missing, improvements: ai.improvements }
    : {
        strengths: structural.matchedComponents.map((c) => `Included ${c}`),
        missing: [
          ...structural.missingComponents.map((c) => `Missing component: ${c}`),
          ...structural.missingConnections.map((c) => `Missing connection: ${c}`),
        ],
        improvements:
          structural.missingConnections.length > 0
            ? ["Add the missing connections between components listed above."]
            : [],
      };

  return {
    score,
    feedback,
    structuralResult: {
      matchedComponents: structural.matchedComponents,
      missingComponents: structural.missingComponents,
      matchedConnections: structural.matchedConnections,
      missingConnections: structural.missingConnections,
      coverage: structural.coverage,
    },
  };
}
