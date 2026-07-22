import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const {
  generateGeminiContentMock,
  getGeminiModelChainMock,
  getGeminiTimeoutMsMock,
} = vi.hoisted(() => ({
  generateGeminiContentMock: vi.fn(),
  getGeminiModelChainMock: vi.fn(() => ["gemini-test"]),
  getGeminiTimeoutMsMock: vi.fn(() => 1_000),
}));

vi.mock("./gemini", () => ({
  generateGeminiContent: generateGeminiContentMock,
  getGeminiModelChain: getGeminiModelChainMock,
  getGeminiTimeoutMs: getGeminiTimeoutMsMock,
}));

const { gradeWithAi } = await import("./ai");

const originalGeminiKey = process.env.GEMINI_API_KEY;
const originalGoogleKey = process.env.GOOGLE_API_KEY;

const params = {
  problemTitle: "Test",
  problemDescription: "desc",
  rubric: { requiredComponents: ["Client"], requiredConnections: [] },
  graph: { nodes: [{ id: "client", label: "Client" }], edges: [] },
};

function restoreEnv(name: "GEMINI_API_KEY" | "GOOGLE_API_KEY", value: string | undefined): void {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

describe("gradeWithAi", () => {
  beforeEach(() => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_API_KEY;
    generateGeminiContentMock.mockReset();
    getGeminiModelChainMock.mockReset().mockReturnValue(["gemini-test"]);
    getGeminiTimeoutMsMock.mockReset().mockReturnValue(1_000);
  });

  afterEach(() => {
    restoreEnv("GEMINI_API_KEY", originalGeminiKey);
    restoreEnv("GOOGLE_API_KEY", originalGoogleKey);
  });

  it("returns null immediately when no Gemini key is configured", async () => {
    const result = await gradeWithAi(params);
    expect(result).toBeNull();
    expect(generateGeminiContentMock).not.toHaveBeenCalled();
  });

  it("validates and normalizes a provider response", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    generateGeminiContentMock.mockResolvedValue({
      text: JSON.stringify({
        score: 91.4,
        strengths: ["  clear flow  "],
        missing: ["missing cache"],
        improvements: ["Add cache invalidation"],
      }),
    });

    await expect(gradeWithAi(params)).resolves.toMatchObject({
      score: 91,
      strengths: ["clear flow"],
      missing: ["missing cache"],
      improvements: ["Add cache invalidation"],
      metadata: {
        provider: "gemini",
        servedModel: "gemini-test",
        attemptedModels: ["gemini-test"],
        fallbackIndex: 0,
        status: "ai",
      },
    });
    expect(generateGeminiContentMock).toHaveBeenCalledWith(
      expect.objectContaining({ model: "gemini-test", timeoutMs: 1_000 }),
    );
  });

  it("tries models in order and falls back when a provider response is unusable", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    getGeminiModelChainMock.mockReturnValue(["first-model", "second-model"]);
    generateGeminiContentMock
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ text: "not json" })
      .mockResolvedValueOnce({
        text: JSON.stringify({ score: 70, strengths: [], missing: [], improvements: [] }),
      });
    getGeminiModelChainMock.mockReturnValue(["first-model", "second-model", "third-model"]);

    await expect(gradeWithAi(params)).resolves.toMatchObject({ score: 70 });
    expect(generateGeminiContentMock.mock.calls.map(([request]) => request.model)).toEqual([
      "first-model",
      "second-model",
      "third-model",
    ]);
  });

  it("returns null for a response that fails the grade schema", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    generateGeminiContentMock.mockResolvedValue({ text: JSON.stringify({ score: "90" }) });

    await expect(gradeWithAi(params)).resolves.toBeNull();
  });
});
