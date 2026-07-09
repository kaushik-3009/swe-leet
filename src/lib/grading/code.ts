import Anthropic from "@anthropic-ai/sdk";
import type { Rubric } from "@/lib/types";

export interface AiCodeGradeResult {
  score: number; // 0-100
  strengths: string[];
  missing: string[];
  improvements: string[];
}

let cachedClient: Anthropic | null | undefined;

function getClient(): Anthropic | null {
  if (cachedClient !== undefined) return cachedClient;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  cachedClient = apiKey ? new Anthropic({ apiKey }) : null;
  return cachedClient;
}

const GRADE_TOOL: Anthropic.Tool = {
  name: "submit_code_grade",
  description: "Submit the structured grade for an LLD code submission.",
  input_schema: {
    type: "object",
    properties: {
      score: { type: "integer", minimum: 0, maximum: 100, description: "Overall correctness, structure, and OOP-principle adherence, 0-100." },
      strengths: { type: "array", items: { type: "string" }, description: "Specific things the code got right (design, structure, OOP principles)." },
      missing: { type: "array", items: { type: "string" }, description: "Specific required classes/behaviors/edge cases that are absent or wrong." },
      improvements: { type: "array", items: { type: "string" }, description: "Specific, actionable suggestions: structure, naming, SOLID adherence, missing edge-case handling." },
    },
    required: ["score", "strengths", "missing", "improvements"],
  },
};

function buildPrompt(params: { problemTitle: string; problemDescription: string; rubric: Rubric; code: string; language: string }): string {
  const { problemTitle, problemDescription, rubric, code, language } = params;
  return `You are grading a candidate's low-level design (LLD) interview practice submission: working code, not just a diagram.

## Problem: ${problemTitle}
${problemDescription}

## Expected design vocabulary (classes/relationships the solution should likely involve)
Required components: ${rubric.requiredComponents.join(", ") || "(none specified)"}
Required relationships: ${rubric.requiredConnections.map((c) => `${c.from} <-> ${c.to}`).join(", ") || "(none specified)"}

## Candidate's submitted code (${language})
\`\`\`${language}
${code}
\`\`\`

Grade this for:
1. Correctness: does it plausibly solve the stated requirements?
2. Structure: reasonable class/method decomposition, appropriate use of interfaces/abstraction where useful.
3. OOP principle adherence: encapsulation, single-responsibility, open-closed where relevant, no obviously leaky abstractions.
4. Edge cases: does it visibly consider the edge cases implied by the requirements?

Be specific and actionable, reference actual class/method names from the candidate's code. Call the submit_code_grade tool with your evaluation.`;
}

/** Returns null if no API key is configured or the call fails, caller should fall back to structural-only grading. */
export async function gradeCodeWithAi(params: {
  problemTitle: string;
  problemDescription: string;
  rubric: Rubric;
  code: string;
  language: string;
}): Promise<AiCodeGradeResult | null> {
  const client = getClient();
  if (!client) return null;

  const model = process.env.GRADING_MODEL || "claude-haiku-4-5";

  try {
    const msg = await client.messages.create({
      model,
      max_tokens: 1536,
      tools: [GRADE_TOOL],
      tool_choice: { type: "tool", name: "submit_code_grade" },
      messages: [{ role: "user", content: buildPrompt(params) }],
    });

    const toolUse = msg.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
    if (!toolUse || typeof toolUse.input !== "object" || toolUse.input === null) return null;

    const input = toolUse.input as Partial<AiCodeGradeResult>;
    if (typeof input.score !== "number") return null;

    return {
      score: Math.max(0, Math.min(100, Math.round(input.score))),
      strengths: Array.isArray(input.strengths) ? input.strengths : [],
      missing: Array.isArray(input.missing) ? input.missing : [],
      improvements: Array.isArray(input.improvements) ? input.improvements : [],
    };
  } catch {
    return null;
  }
}
