import { extractGraph } from "./extract";
import { matchStructural } from "./structural";
import { matchCodeStructural } from "./codeStructural";
import { gradeWithAi } from "./ai";
import { gradeCodeWithAi } from "./code";
import type { GradingMetadata, Rubric, SubmissionFeedback, StructuralResult } from "@/lib/types";

export { extractGraph } from "./extract";
export { matchStructural } from "./structural";
export { matchCodeStructural } from "./codeStructural";
export { gradeWithAi } from "./ai";
export {
  DEFAULT_GEMINI_MODELS,
  DEFAULT_GEMINI_TIMEOUT_MS,
  getGeminiModelChain,
  getGeminiTimeoutMs,
} from "./gemini";
export { gradeCodeWithAi } from "./code";

export interface GradeResult {
  score: number;
  feedback: SubmissionFeedback;
  structuralResult: StructuralResult;
  gradingMetadata?: GradingMetadata;
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
    gradingMetadata: ai?.metadata ?? { status: "structural_only" },
  };
}

export async function gradeCodeSubmission(params: {
  problemTitle: string;
  problemDescription: string;
  rubric: Rubric;
  code: string;
  language: string;
}): Promise<GradeResult> {
  const structural = matchCodeStructural(params.code, params.rubric);
  const ai = await gradeCodeWithAi(params);

  const score = ai ? Math.round(0.3 * structural.coverage + 0.7 * ai.score) : structural.coverage;

  const feedback: SubmissionFeedback = ai
    ? { strengths: ai.strengths, missing: ai.missing, improvements: ai.improvements }
    : {
        strengths: structural.matchedComponents.map((c) => `Code references ${c}`),
        missing: [
          ...structural.missingComponents.map((c) => `Missing expected class/component: ${c}`),
          ...structural.missingConnections.map((c) => `Missing expected relationship: ${c}`),
        ],
        improvements:
          structural.missingComponents.length > 0
            ? ["Add the missing classes/components listed above and wire up the relationships between them."]
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
