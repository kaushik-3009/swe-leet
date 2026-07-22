import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CompilerProviderError,
  composeHarness,
  hashCode,
  runPython,
} from "./onlineCompiler";

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.ONLINECOMPILER_REST_API_KEY;
  delete process.env.ONLINECOMPILER_ENABLED;
});

describe("OnlineCompiler adapter", () => {
  it("composes trusted harnesses and hashes code", () => {
    expect(composeHarness("class A:\n    pass", "assert A() is not None")).toContain("trusted public test harness");
    expect(hashCode("print(1)")).toHaveLength(64);
  });

  it("rejects missing provider configuration without a network call", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(runPython("print(1)")).rejects.toBeInstanceOf(CompilerProviderError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends the documented compiler request and normalizes success", async () => {
    process.env.ONLINECOMPILER_REST_API_KEY = "server-test-key";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      output: "ok\n",
      error: "",
      status: "success",
      exit_code: 0,
      total: "0.0330",
      memory: "8192",
    }), { status: 200, headers: { "content-type": "application/json" } })));

    const result = await runPython("print('ok')", "");
    expect(result.status).toBe("success");
    expect(result.output).toBe("ok\n");
    expect(result.durationMs).toBe(33);
    expect(result.memoryKb).toBe(8192);

    expect(fetch).toHaveBeenCalledWith(
      "https://api.onlinecompiler.io/api/run-code-sync/",
      expect.objectContaining({
        method: "POST",
        headers: { Authorization: "server-test-key", "Content-Type": "application/json" },
        body: JSON.stringify({ compiler: "python-3.14", code: "print('ok')", input: "" }),
      }),
    );
  });

  it("keeps explicit compiler errors as normal results", async () => {
    process.env.ONLINECOMPILER_REST_API_KEY = "server-test-key";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      output: "",
      error: "SyntaxError",
      status: "compile_error",
      exit_code: 1,
    }), { status: 200 })));

    await expect(runPython("bad python")).resolves.toMatchObject({
      status: "compile_error",
      error: "SyntaxError",
    });
  });

  it("turns wrapped candidate exceptions into normal execution failures", async () => {
    process.env.ONLINECOMPILER_REST_API_KEY = "server-test-key";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      output: '__SD_TRACKER_EXECUTION__{"status":"runtime_error","output":"","error":"NameError: missing class"}',
      error: "",
      status: "success",
      exit_code: 0,
    }), { status: 200 })));

    await expect(runPython("class Example: pass")).resolves.toMatchObject({
      status: "runtime_error",
      error: "NameError: missing class",
      output: "",
    });
  });

  it("treats provider internal execution errors as provider failures", async () => {
    process.env.ONLINECOMPILER_REST_API_KEY = "server-test-key";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      output: "",
      error: "Internal error: code execution failed",
      status: "error",
      exit_code: 1,
    }), { status: 200 })));

    await expect(runPython("print(1)")).resolves.toMatchObject({
      status: "provider_error",
      error: "",
      providerError: "Internal error: code execution failed",
    });
  });

  it("does not infer a compiler error from an undocumented status", async () => {
    process.env.ONLINECOMPILER_REST_API_KEY = "server-test-key";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      output: "",
      error: "SyntaxError: invalid syntax",
      exit_code: 1,
    }), { status: 200 })));

    await expect(runPython("bad python")).resolves.toMatchObject({
      status: "provider_error",
      providerError: "SyntaxError: invalid syntax",
    });
  });

  it("normalizes provider saturation as a provider error", async () => {
    process.env.ONLINECOMPILER_REST_API_KEY = "server-test-key";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "busy" }), { status: 429 })));
    await expect(runPython("print(1)")).rejects.toMatchObject({ message: "OnlineCompiler is busy; try again shortly" });
  });
});
