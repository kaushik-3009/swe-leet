import Anthropic from "@anthropic-ai/sdk";
import type { ExtractedGraph } from "./extract";
import type { Rubric } from "@/lib/types";

export interface AiGradeResult {
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
  name: "submit_grade",
  description: "Submit the structured grade for a system design / LLD canvas submission.",
  input_schema: {
    type: "object",
    properties: {
      score: { type: "integer", minimum: 0, maximum: 100, description: "Overall correctness/completeness score, 0-100." },
      strengths: { type: "array", items: { type: "string" }, description: "Specific things the design got right." },
      missing: { type: "array", items: { type: "string" }, description: "Specific required elements that are absent or wrong." },
      improvements: { type: "array", items: { type: "string" }, description: "Specific, actionable suggestions to improve the design." },
    },
    required: ["score", "strengths", "missing", "improvements"],
  },
};

function buildPrompt(params: { problemTitle: string; problemDescription: string; rubric: Rubric; graph: ExtractedGraph }): string {
  const { problemTitle, problemDescription, rubric, graph } = params;
  const nodesList = graph.nodes.map((n) => `- ${n.label}`).join("\n") || "(none)";
  const edgesList = graph.edges.map((e) => {
    const from = graph.nodes.find((n) => n.id === e.from)?.label ?? e.from;
    const to = graph.nodes.find((n) => n.id === e.to)?.label ?? e.to;
    return `- ${from} -> ${to}${e.label ? ` (${e.label})` : ""}`;
  }).join("\n") || "(none)";

  return `You are grading a candidate's system design / low-level design interview practice submission, drawn on a whiteboard canvas.

## Problem: ${problemTitle}
${problemDescription}

## Expected rubric
Required components: ${rubric.requiredComponents.join(", ") || "(none specified)"}
Required connections: ${rubric.requiredConnections.map((c) => `${c.from} -> ${c.to}`).join(", ") || "(none specified)"}

## Candidate's submitted design (extracted from their canvas)
Components drawn:
${nodesList}

Connections drawn:
${edgesList}

Grade this submission for correctness and completeness against the rubric and general best practices for this problem. Be specific and actionable — reference the actual components/connections the candidate drew. Call the submit_grade tool with your evaluation.`;
}

/** Returns null if no API key is configured or the call fails — caller should fall back to structural-only grading. */
export async function gradeWithAi(params: {
  problemTitle: string;
  problemDescription: string;
  rubric: Rubric;
  graph: ExtractedGraph;
}): Promise<AiGradeResult | null> {
  const client = getClient();
  if (!client) return null;

  const model = process.env.GRADING_MODEL || "claude-haiku-4-5";

  try {
    const msg = await client.messages.create({
      model,
      max_tokens: 1024,
      tools: [GRADE_TOOL],
      tool_choice: { type: "tool", name: "submit_grade" },
      messages: [{ role: "user", content: buildPrompt(params) }],
    });

    const toolUse = msg.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
    if (!toolUse || typeof toolUse.input !== "object" || toolUse.input === null) return null;

    const input = toolUse.input as Partial<AiGradeResult>;
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
