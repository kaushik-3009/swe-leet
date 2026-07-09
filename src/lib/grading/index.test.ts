import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Rubric } from "@/lib/types";

const { gradeWithAiMock } = vi.hoisted(() => ({ gradeWithAiMock: vi.fn() }));
vi.mock("./ai", () => ({ gradeWithAi: gradeWithAiMock }));

// Imported after the mock so gradeSubmission picks up the mocked gradeWithAi.
const { gradeSubmission } = await import("./index");

function snapshotFor(labels: string[]) {
  const store: Record<string, unknown> = {};
  labels.forEach((label, i) => {
    store[`shape:${i}`] = {
      id: `shape:${i}`,
      typeName: "shape",
      type: "geo",
      props: { richText: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: label }] }] } },
    };
  });
  return { document: { store } };
}

const rubric: Rubric = { requiredComponents: ["Client", "Server"], requiredConnections: [] };

describe("gradeSubmission", () => {
  beforeEach(() => {
    gradeWithAiMock.mockReset();
  });

  it("falls back to structural-only scoring when the AI grader is unavailable", async () => {
    gradeWithAiMock.mockResolvedValue(null);
    const result = await gradeSubmission({
      problemTitle: "Test",
      problemDescription: "desc",
      rubric,
      canvasSnapshot: snapshotFor(["Client"]),
    });
    // 1 of 2 required components matched -> 50% structural coverage, no AI signal.
    expect(result.score).toBe(50);
    expect(result.feedback.missing).toContain("Missing component: Server");
    expect(result.structuralResult.coverage).toBe(50);
  });

  it("blends structural coverage and AI score 50/50 when the AI grader succeeds", async () => {
    gradeWithAiMock.mockResolvedValue({ score: 90, strengths: ["good"], missing: ["x"], improvements: ["y"] });
    const result = await gradeSubmission({
      problemTitle: "Test",
      problemDescription: "desc",
      rubric,
      canvasSnapshot: snapshotFor(["Client", "Server"]), // 100% structural
    });
    // 0.5*100 + 0.5*90 = 95
    expect(result.score).toBe(95);
    expect(result.feedback).toEqual({ strengths: ["good"], missing: ["x"], improvements: ["y"] });
  });

  it("produces empty-canvas feedback listing every required component as missing", async () => {
    gradeWithAiMock.mockResolvedValue(null);
    const result = await gradeSubmission({
      problemTitle: "Test",
      problemDescription: "desc",
      rubric,
      canvasSnapshot: snapshotFor([]),
    });
    expect(result.score).toBe(0);
    expect(result.feedback.strengths).toEqual([]);
    expect(result.feedback.missing).toEqual(
      expect.arrayContaining(["Missing component: Client", "Missing component: Server"])
    );
  });
});
