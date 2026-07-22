import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  DEFAULT_GEMINI_MODELS,
  DEFAULT_GEMINI_TIMEOUT_MS,
  generateGeminiContent,
  getGeminiModelChain,
  getGeminiTimeoutMs,
  resetGeminiClientForTests,
} from "./gemini";

const originalGeminiKey = process.env.GEMINI_API_KEY;
const originalGoogleKey = process.env.GOOGLE_API_KEY;

function restoreEnv(name: "GEMINI_API_KEY" | "GOOGLE_API_KEY", value: string | undefined): void {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

describe("Gemini grading provider", () => {
  beforeEach(() => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_API_KEY;
  });

  afterEach(() => {
    restoreEnv("GEMINI_API_KEY", originalGeminiKey);
    restoreEnv("GOOGLE_API_KEY", originalGoogleKey);
    resetGeminiClientForTests();
  });

  it("uses the ordered default model chain", () => {
    expect(getGeminiModelChain({} as NodeJS.ProcessEnv)).toEqual([...DEFAULT_GEMINI_MODELS]);
  });

  it("accepts an ordered comma-separated model chain and bounded timeout", () => {
    expect(
      getGeminiModelChain({ GEMINI_GRADING_MODELS: "first, second,first" } as unknown as NodeJS.ProcessEnv),
    ).toEqual(["first", "second", "first"]);
    expect(getGeminiTimeoutMs({ GEMINI_GRADING_TIMEOUT_MS: "50" } as unknown as NodeJS.ProcessEnv)).toBe(250);
    expect(getGeminiTimeoutMs({ GEMINI_GRADING_TIMEOUT_MS: "999999" } as unknown as NodeJS.ProcessEnv)).toBe(120_000);
    expect(getGeminiTimeoutMs({} as NodeJS.ProcessEnv)).toBe(DEFAULT_GEMINI_TIMEOUT_MS);
  });

  it("returns null without credentials instead of contacting a provider", async () => {
    await expect(
      generateGeminiContent({ model: "gemini-test", prompt: "test", timeoutMs: 250 }),
    ).resolves.toBeNull();
  });
});
