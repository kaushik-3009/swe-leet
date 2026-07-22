import { createHash } from "node:crypto";

export const ONLINE_COMPILER = "python-3.14" as const;
const ENDPOINT = "https://api.onlinecompiler.io/api/run-code-sync/";
const MAX_OUTPUT = 4_000;
const MAX_ERROR = 4_000;
const PROVIDER_TIMEOUT_MS = 25_000;
const MAX_CONCURRENT_RUNS = 4;
const EXECUTION_MARKER = "__SD_TRACKER_EXECUTION__";

export type CompilerStatus =
  | "success"
  | "compile_error"
  | "runtime_error"
  | "timeout"
  | "provider_error";

export interface CompilerResult {
  status: CompilerStatus;
  output: string;
  error: string;
  exitCode: number | null;
  signal: string | null;
  durationMs: number | null;
  memoryKb: number | null;
  providerError?: string;
}

export class CompilerProviderError extends Error {
  readonly status = 502;
  constructor(message: string) {
    super(message);
    this.name = "CompilerProviderError";
  }
}

export class CompilerDeadlineError extends Error {
  readonly status = 504;
  constructor(message = "Code execution timed out") {
    super(message);
    this.name = "CompilerDeadlineError";
  }
}

let activeRuns = 0;
const waiters: Array<() => void> = [];

async function acquireSlot() {
  if (activeRuns < MAX_CONCURRENT_RUNS) {
    activeRuns += 1;
    return;
  }
  await new Promise<void>((resolve) => waiters.push(resolve));
  activeRuns += 1;
}

function releaseSlot() {
  activeRuns = Math.max(0, activeRuns - 1);
  waiters.shift()?.();
}

function bounded(value: unknown, max: number): string {
  return typeof value === "string" ? value.slice(0, max) : "";
}

function numeric(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function hashCode(code: string): string {
  return createHash("sha256").update(code, "utf8").digest("hex");
}

type ExecutionMarker = {
  status: "success" | "compile_error" | "runtime_error";
  output?: unknown;
  error?: unknown;
};

function parseExecutionMarker(output: string): ExecutionMarker | null {
  const markerIndex = output.lastIndexOf(EXECUTION_MARKER);
  if (markerIndex < 0) return null;
  const encoded = output.slice(markerIndex + EXECUTION_MARKER.length).trim().split("\n", 1)[0];
  try {
    const parsed = JSON.parse(encoded) as ExecutionMarker;
    return parsed && (parsed.status === "success" || parsed.status === "compile_error" || parsed.status === "runtime_error")
      ? parsed
      : null;
  } catch {
    return null;
  }
}

function normalizeResponse(payload: unknown): CompilerResult {
  if (!payload || typeof payload !== "object") {
    throw new CompilerProviderError("OnlineCompiler returned an invalid response");
  }

  const body = payload as Record<string, unknown>;
  const providerStatus = typeof body.status === "string" ? body.status : null;
  const exitCode = numeric(body.exit_code);
  const error = bounded(body.error, MAX_ERROR);
  let output = bounded(body.output, MAX_OUTPUT);
  const duration = numeric(body.total ?? body.time);
  const durationMs = duration === null ? null : duration < 100 ? Math.round(duration * 1000) : Math.round(duration);
  const memory = numeric(body.memory);

  let status: CompilerStatus;
  let normalizedError = error;
  let providerError: string | undefined;

  switch (providerStatus) {
    case "success":
      status = exitCode !== null && exitCode !== 0 ? "runtime_error" : "success";
      break;
    case "compile_error":
      status = "compile_error";
      break;
    case "runtime_error":
      status = "runtime_error";
      break;
    case "timeout":
      status = "timeout";
      break;
    case "error":
      status = "provider_error";
      normalizedError = "";
      providerError = error || "OnlineCompiler could not execute the code";
      break;
    default:
      // Do not infer a learner-code failure from an undocumented or missing
      // provider status. The provider owns this response contract.
      status = "provider_error";
      normalizedError = "";
      providerError = error || "OnlineCompiler returned an unrecognized execution status";
      break;
  }

  if (status === "provider_error" && !providerError) {
    providerError = "OnlineCompiler could not execute the code";
  }

  if (status === "success") {
    const marker = parseExecutionMarker(output);
    if (marker) {
      status = marker.status;
      output = bounded(marker.output, MAX_OUTPUT);
      normalizedError = marker.status === "success" ? "" : bounded(marker.error, MAX_ERROR);
    }
  }

  return {
    status,
    output,
    error: normalizedError,
    exitCode,
    signal: typeof body.signal === "string" ? body.signal.slice(0, 80) : null,
    durationMs,
    memoryKb: memory === null ? null : Math.round(memory),
    ...(providerError ? { providerError } : {}),
  };
}

export async function runPython(code: string, input = ""): Promise<CompilerResult> {
  if (code.length === 0 || code.length > 100_000) {
    throw new Error("Code must contain between 1 and 100,000 characters");
  }
  if (input.length > 100_000) throw new Error("Input is too large");
  if (process.env.ONLINECOMPILER_ENABLED === "false") {
    throw new CompilerProviderError("OnlineCompiler execution is disabled");
  }

  const apiKey = process.env.ONLINECOMPILER_REST_API_KEY?.trim();
  if (!apiKey) throw new CompilerProviderError("OnlineCompiler is not configured");

  await acquireSlot();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);
  try {
    let response: Response;
    try {
      response = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ compiler: ONLINE_COMPILER, code, input }),
        signal: controller.signal,
      });
    } catch (error) {
      if (controller.signal.aborted) throw new CompilerDeadlineError();
      throw new CompilerProviderError(error instanceof Error ? error.message : "OnlineCompiler request failed");
    }

    const raw = await response.text();
    let payload: unknown;
    try {
      payload = JSON.parse(raw);
    } catch {
      throw new CompilerProviderError("OnlineCompiler returned malformed JSON");
    }

    if (response.status === 429) throw new CompilerProviderError("OnlineCompiler is busy; try again shortly");
    if (!response.ok) {
      const message = payload && typeof payload === "object" && "error" in payload
        ? bounded((payload as { error?: unknown }).error, MAX_ERROR)
        : `OnlineCompiler returned HTTP ${response.status}`;
      throw new CompilerProviderError(message || `OnlineCompiler returned HTTP ${response.status}`);
    }

    return normalizeResponse(payload);
  } finally {
    clearTimeout(timeout);
    releaseSlot();
  }
}

export function composeHarness(code: string, harness: string): string {
  const candidateSource = JSON.stringify(code);
  const publicHarness = JSON.stringify(harness);

  return `# --- trusted public test harness ---
import contextlib
import io
import json

__sd_tracker_namespace = {"__builtins__": __builtins__}
__sd_tracker_capture = io.StringIO()
__sd_tracker_status = "success"
__sd_tracker_error = ""

try:
    with contextlib.redirect_stdout(__sd_tracker_capture):
        exec(compile(${candidateSource}, "<candidate>", "exec"), __sd_tracker_namespace, __sd_tracker_namespace)
        exec(compile(${publicHarness}, "<public-test>", "exec"), __sd_tracker_namespace, __sd_tracker_namespace)
except SyntaxError as __sd_error:
    __sd_tracker_status = "compile_error"
    __sd_tracker_error = f"SyntaxError: {__sd_error}"
except BaseException as __sd_error:
    __sd_tracker_status = "runtime_error"
    __sd_tracker_error = f"{type(__sd_error).__name__}: {__sd_error}"
finally:
    print(${JSON.stringify(EXECUTION_MARKER)} + json.dumps({
        "status": __sd_tracker_status,
        "output": __sd_tracker_capture.getvalue()[:2000],
        "error": __sd_tracker_error[:2000],
    }))
`;
}
