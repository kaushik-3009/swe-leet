import { beforeEach, describe, expect, it, vi } from "vitest";

const { runPythonMock } = vi.hoisted(() => ({ runPythonMock: vi.fn() }));

vi.mock("./onlineCompiler", async () => {
  const actual = await vi.importActual<typeof import("./onlineCompiler")>("./onlineCompiler");
  return { ...actual, runPython: runPythonMock };
});

const { executePublicTests, trustedTests } = await import("./publicTests");

describe("public LLD test execution", () => {
  beforeEach(() => {
    runPythonMock.mockReset().mockResolvedValue({
      status: "success",
      output: "ok\n",
      error: "",
      exitCode: 0,
      signal: null,
      durationMs: 12,
      memoryKb: 1024,
    });
  });

  it("normalizes the compatibility harness shape", () => {
    expect(trustedTests({ language: "python", harness: "assert True" }, "parking-lot")).toEqual({
      compiler: "python-3.14",
      tests: [{ id: "parking-lot-public", name: "Public behavior", harness: "assert True" }],
    });
  });

  it("runs named public tests and aggregates results", async () => {
    const result = await executePublicTests("class Example: pass", {
      language: "python",
      compiler: "python-3.14",
      publicTests: [
        { id: "basic", name: "Basic behavior", harness: "assert True" },
        { id: "edge", name: "Edge behavior", harness: "assert True" },
      ],
    }, "example");

    expect(result?.status).toBe("PASSED");
    expect(result?.result.summary).toEqual({ total: 2, passed: 2, failed: 0 });
    expect(result?.tests[0]).toMatchObject({ id: "basic", passed: true, exitCode: 0, signal: null });
    expect(runPythonMock).toHaveBeenCalledTimes(2);
  });

  it("turns wrapped candidate exceptions into normal test failures", async () => {
    runPythonMock.mockResolvedValue({
      status: "success",
      output: '__SD_TRACKER_EXECUTION__{"status":"runtime_error","output":"","error":"NameError: missing class"}',
      error: "",
      exitCode: 0,
      signal: null,
      durationMs: 10,
      memoryKb: 1000,
    });

    const result = await executePublicTests("class Example: pass", {
      language: "python",
      harness: "assert True",
    }, "example");

    expect(result?.status).toBe("RUNTIME_ERROR");
    expect(result?.tests[0]).toMatchObject({ status: "runtime_error", passed: false, error: "NameError: missing class" });
  });

  it("preserves provider failures as provider errors", async () => {
    runPythonMock.mockResolvedValue({
      status: "provider_error",
      output: "",
      error: "",
      providerError: "Internal error: code execution failed",
      exitCode: 1,
      signal: null,
      durationMs: null,
      memoryKb: null,
    });

    const result = await executePublicTests("print(1)", {
      language: "python",
      harness: "assert True",
    }, "example");

    expect(result?.status).toBe("PROVIDER_ERROR");
    expect(result?.tests[0]).toMatchObject({
      passed: false,
      status: "provider_error",
      error: "Internal error: code execution failed",
      exitCode: 1,
    });
  });
});
