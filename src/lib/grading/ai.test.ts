import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("gradeWithAi", () => {
  const originalKey = process.env.ANTHROPIC_API_KEY;

  beforeEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
    vi.resetModules();
  });

  afterEach(() => {
    if (originalKey) process.env.ANTHROPIC_API_KEY = originalKey;
  });

  it("returns null immediately when ANTHROPIC_API_KEY is not configured", async () => {
    const { gradeWithAi } = await import("./ai");
    const result = await gradeWithAi({
      problemTitle: "Test",
      problemDescription: "desc",
      rubric: { requiredComponents: [], requiredConnections: [] },
      graph: { nodes: [], edges: [] },
    });
    expect(result).toBeNull();
  });
});
