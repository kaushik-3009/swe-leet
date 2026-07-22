/** The ordered, low-cost model fallback chain used for diagram grading. */
export const DEFAULT_GEMINI_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-2.5-flash-lite",
] as const;

export const DEFAULT_GEMINI_TIMEOUT_MS = 10_000;

export interface GeminiContentRequest {
  model: string;
  prompt: string;
  timeoutMs: number;
}

export interface GeminiContentResponse {
  text: string;
}

interface GeminiSdkResponse {
  text?: unknown;
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: unknown }>;
    };
  }>;
}

interface GeminiSdkClient {
  models: {
    generateContent(request: {
      model: string;
      contents: string;
      config: {
        responseMimeType: "application/json";
        responseSchema: Record<string, unknown>;
      };
    }): Promise<GeminiSdkResponse>;
  };
}

interface GeminiSdkModule {
  GoogleGenAI: new (options: { apiKey: string }) => GeminiSdkClient;
}

const GRADE_RESPONSE_SCHEMA: Record<string, unknown> = {
  type: "object",
  properties: {
    score: { type: "number", minimum: 0, maximum: 100 },
    strengths: { type: "array", items: { type: "string" } },
    missing: { type: "array", items: { type: "string" } },
    improvements: { type: "array", items: { type: "string" } },
  },
  required: ["score", "strengths", "missing", "improvements"],
  additionalProperties: false,
};

let cachedSdk: GeminiSdkModule | null | undefined;
let cachedClient: GeminiSdkClient | null | undefined;

function getApiKey(): string | null {
  const key = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
  return key?.trim() || null;
}

/**
 * Keep the SDK optional at install time. This also lets tests mock the provider
 * boundary without importing or contacting the real SDK.
 */
async function loadSdk(): Promise<GeminiSdkModule | null> {
  if (cachedSdk !== undefined) return cachedSdk;

  try {
    // A runtime import prevents deployments without @google/genai from failing
    // at module-load time. The official SDK is used automatically when present.
    const load = new Function("specifier", "return import(specifier)") as (
      specifier: string,
    ) => Promise<GeminiSdkModule>;
    cachedSdk = await load("@google/genai");
  } catch {
    cachedSdk = null;
  }
  return cachedSdk;
}

async function getClient(): Promise<GeminiSdkClient | null> {
  if (cachedClient !== undefined) return cachedClient;
  const apiKey = getApiKey();
  if (!apiKey) {
    cachedClient = null;
    return null;
  }

  const sdk = await loadSdk();
  cachedClient = sdk ? new sdk.GoogleGenAI({ apiKey }) : null;
  return cachedClient;
}

function responseText(response: GeminiSdkResponse): string {
  if (typeof response.text === "string") return response.text;
  return (
    response.candidates
      ?.flatMap((candidate) => candidate.content?.parts ?? [])
      .map((part) => (typeof part.text === "string" ? part.text : ""))
      .join("") ?? ""
  );
}

function parseTimeout(value: string | undefined): number {
  if (!value) return DEFAULT_GEMINI_TIMEOUT_MS;
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? Math.min(Math.max(Math.round(parsed), 250), 120_000)
    : DEFAULT_GEMINI_TIMEOUT_MS;
}

/** Resolve a comma-separated model list without ever exposing environment values. */
export function getGeminiModelChain(env: NodeJS.ProcessEnv = process.env): string[] {
  const configured = env.GEMINI_GRADING_MODELS ?? env.GRADING_MODELS;
  if (configured) {
    const models = configured.split(",").map((model) => model.trim()).filter(Boolean);
    if (models.length > 0) return models;
  }

  const singleModel =
    env.GEMINI_GRADING_MODEL ??
    (env.GRADING_MODEL?.startsWith("gemini-") ? env.GRADING_MODEL : undefined);
  return singleModel?.trim() ? [singleModel.trim()] : [...DEFAULT_GEMINI_MODELS];
}

export function getGeminiTimeoutMs(env: NodeJS.ProcessEnv = process.env): number {
  return parseTimeout(env.GEMINI_GRADING_TIMEOUT_MS ?? env.GRADING_TIMEOUT_MS);
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Provider boundary for diagram grading. A missing SDK/key or any provider
 * failure is represented by null so callers retain structural-only grading.
 */
export async function generateGeminiContent(
  request: GeminiContentRequest,
): Promise<GeminiContentResponse | null> {
  const client = await getClient();
  if (!client) return null;

  try {
    const response = await withTimeout(
      client.models.generateContent({
        model: request.model,
        contents: request.prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: GRADE_RESPONSE_SCHEMA,
        },
      }),
      request.timeoutMs,
    );
    if (!response) return null;
    const text = responseText(response);
    return text ? { text } : null;
  } catch {
    return null;
  }
}

/** Test-only reset hook; it does not expose key/client state. */
export function resetGeminiClientForTests(): void {
  cachedSdk = undefined;
  cachedClient = undefined;
}
