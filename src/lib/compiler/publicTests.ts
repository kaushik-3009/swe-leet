import {
  CompilerDeadlineError,
  CompilerProviderError,
  composeHarness,
  runPython,
  ONLINE_COMPILER,
  type CompilerResult,
} from "./onlineCompiler";
import type { CodeRunStatus, CodeRunTestResult } from "@/lib/types";

export type TrustedPublicTest = { id: string; name: string; harness: string };

export interface PublicTestRun {
  compiler: string;
  tests: CodeRunTestResult[];
  result: { tests: CodeRunTestResult[]; summary: { total: number; passed: number; failed: number } };
  status: CodeRunStatus;
  durationMs: number | null;
  memoryKb: number | null;
}

export function trustedTests(raw: unknown, problemId: string): { compiler: string; tests: TrustedPublicTest[] } | null {
  if (!raw || typeof raw !== "object") return null;
  const spec = raw as Record<string, unknown>;
  if (spec.language !== "python") return null;
  const compiler = typeof spec.compiler === "string" ? spec.compiler : ONLINE_COMPILER;
  if (compiler !== ONLINE_COMPILER) return null;

  if (Array.isArray(spec.publicTests)) {
    const tests = spec.publicTests.flatMap((value, index) => {
      if (!value || typeof value !== "object") return [];
      const item = value as Record<string, unknown>;
      if (typeof item.harness !== "string" || !item.harness.trim()) return [];
      return [{
        id: typeof item.id === "string" ? item.id.slice(0, 80) : `public-${index + 1}`,
        name: typeof item.name === "string" ? item.name.slice(0, 120) : `Public test ${index + 1}`,
        harness: item.harness,
      }];
    });
    return tests.length > 0 ? { compiler, tests } : null;
  }

  if (typeof spec.harness === "string" && spec.harness.trim()) {
    return { compiler, tests: [{ id: `${problemId}-public`, name: "Public behavior", harness: spec.harness }] };
  }
  return null;
}

const EXECUTION_MARKER = "__SD_TRACKER_EXECUTION__";

function normalizeWrappedResult(result: CompilerResult): CompilerResult {
  if (result.status !== "success") return result;
  const markerIndex = result.output.lastIndexOf(EXECUTION_MARKER);
  if (markerIndex < 0) return result;

  try {
    const payload = JSON.parse(result.output.slice(markerIndex + EXECUTION_MARKER.length).trim()) as {
      status?: unknown;
      output?: unknown;
      error?: unknown;
    };
    if (payload.status !== "success" && payload.status !== "compile_error" && payload.status !== "runtime_error") return result;
    return {
      ...result,
      status: payload.status,
      output: typeof payload.output === "string" ? payload.output.slice(0, 4_000) : "",
      error: payload.status === "success" ? "" : typeof payload.error === "string" ? payload.error.slice(0, 4_000) : "Execution failed",
    };
  } catch {
    return result;
  }
}

function toTestResult(test: TrustedPublicTest, rawResult: CompilerResult): CodeRunTestResult {
  const result = normalizeWrappedResult(rawResult);
  return {
    id: test.id,
    name: test.name,
    passed: result.status === "success",
    status: result.status,
    output: result.output,
    error: result.error || result.providerError || "",
    exitCode: result.exitCode,
    signal: result.signal,
    durationMs: result.durationMs,
    memoryKb: result.memoryKb,
  };
}

function failureResult(error: unknown): CompilerResult {
  if (error instanceof CompilerDeadlineError) {
    return { status: "timeout", output: "", error: error.message, exitCode: 124, signal: null, durationMs: null, memoryKb: null };
  }
  if (error instanceof CompilerProviderError) {
    return { status: "provider_error", output: "", error: "", providerError: error.message, exitCode: null, signal: null, durationMs: null, memoryKb: null };
  }
  return { status: "provider_error", output: "", error: error instanceof Error ? error.message : "Execution failed", exitCode: null, signal: null, durationMs: null, memoryKb: null };
}

function statusForTests(tests: CodeRunTestResult[]): CodeRunStatus {
  if (tests.every((test) => test.passed)) return "PASSED";
  if (tests.some((test) => test.status === "provider_error")) return "PROVIDER_ERROR";
  if (tests.some((test) => test.status === "timeout")) return "TIMEOUT";
  if (tests.some((test) => test.status === "compile_error")) return "COMPILE_ERROR";
  if (tests.some((test) => test.status === "runtime_error")) return "RUNTIME_ERROR";
  return "FAILED";
}

export async function executePublicTests(code: string, specRaw: unknown, problemId: string): Promise<PublicTestRun | null> {
  const spec = trustedTests(specRaw, problemId);
  if (!spec) return null;
  const tests: CodeRunTestResult[] = [];
  for (const test of spec.tests) {
    try {
      tests.push(toTestResult(test, await runPython(composeHarness(code, test.harness))));
    } catch (error) {
      tests.push(toTestResult(test, failureResult(error)));
    }
  }
  const passed = tests.filter((test) => test.passed).length;
  const durationMs = tests.reduce<number | null>((total, test) => {
    if (test.durationMs === null) return total;
    return total === null ? test.durationMs : total + test.durationMs;
  }, null);
  const memoryKb = tests.reduce<number | null>((max, test) => test.memoryKb === null ? max : Math.max(max ?? 0, test.memoryKb), null);
  return {
    compiler: spec.compiler,
    tests,
    result: { tests, summary: { total: tests.length, passed, failed: tests.length - passed } },
    status: statusForTests(tests),
    durationMs,
    memoryKb,
  };
}
