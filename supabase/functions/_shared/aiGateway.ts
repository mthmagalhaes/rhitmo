// Centralized helper for calling the Lovable AI Gateway from edge functions.
// Replaces direct calls to api.openai.com so all AI traffic flows through
// the gateway with unified billing, rate-limit handling, and retries.
//
// IMPORTANT: Audio transcription (Whisper) is NOT supported by the gateway
// yet — keep transcribe-audio / upload-meeting on direct OpenAI for now.

import type { Logger } from "./logger.ts";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

// ----- Types -----

export type ChatRole = "system" | "user" | "assistant" | "tool";

export interface ChatMessage {
  role: ChatRole;
  content: string | Array<Record<string, unknown>>;
  tool_call_id?: string;
  tool_calls?: unknown;
  name?: string;
}

export interface AIChatOptions {
  model?: string;
  messages: ChatMessage[];
  tools?: unknown[];
  tool_choice?: unknown;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  response_format?: { type: "json_object" } | { type: "text" };
  reasoning?: { effort: "minimal" | "low" | "medium" | "high" | "xhigh" | "none" };
  /** Optional logger — when provided, an `ai_call` entry is emitted with timing/status. */
  logger?: Logger;
}

// ----- Errors (caller can pattern-match) -----

export class GatewayError extends Error {
  constructor(message: string, public status: number, public body?: string) {
    super(message);
    this.name = "GatewayError";
  }
}
export class RateLimitError extends GatewayError {
  constructor(body?: string) {
    super("Rate limit exceeded on Lovable AI Gateway", 429, body);
    this.name = "RateLimitError";
  }
}
export class PaymentRequiredError extends GatewayError {
  constructor(body?: string) {
    super("Lovable AI workspace credits exhausted", 402, body);
    this.name = "PaymentRequiredError";
  }
}

// ----- Core call -----

const DEFAULT_MODEL = "google/gemini-2.5-flash";

function getApiKey(): string {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("LOVABLE_API_KEY is not configured");
  return key;
}

/**
 * Low-level call. Returns raw Response (use this when you need streaming
 * or raw access to headers). Throws typed errors on 429/402.
 */
export async function aiChatRaw(opts: AIChatOptions): Promise<Response> {
  const model = opts.model ?? DEFAULT_MODEL;
  const body = {
    model,
    messages: opts.messages,
    ...(opts.tools ? { tools: opts.tools } : {}),
    ...(opts.tool_choice ? { tool_choice: opts.tool_choice } : {}),
    ...(opts.temperature !== undefined ? { temperature: opts.temperature } : {}),
    ...(opts.max_tokens !== undefined ? { max_tokens: opts.max_tokens } : {}),
    ...(opts.stream ? { stream: true } : {}),
    ...(opts.response_format ? { response_format: opts.response_format } : {}),
    ...(opts.reasoning ? { reasoning: opts.reasoning } : {}),
  };

  const startedAt = Date.now();
  let resp: Response;
  try {
    resp = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getApiKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    opts.logger?.aiCall({ model, durationMs: Date.now() - startedAt, error: (e as Error).message });
    throw e;
  }

  const durationMs = Date.now() - startedAt;

  if (resp.status === 429) {
    const t = await resp.text().catch(() => "");
    opts.logger?.aiCall({ model, durationMs, status: 429, error: "rate_limit" });
    throw new RateLimitError(t);
  }
  if (resp.status === 402) {
    const t = await resp.text().catch(() => "");
    opts.logger?.aiCall({ model, durationMs, status: 402, error: "no_credits" });
    throw new PaymentRequiredError(t);
  }
  if (!resp.ok) {
    const t = await resp.text().catch(() => "");
    opts.logger?.aiCall({ model, durationMs, status: resp.status, error: `gateway_${resp.status}` });
    throw new GatewayError(`Gateway error ${resp.status}`, resp.status, t);
  }

  opts.logger?.aiCall({ model, durationMs, status: resp.status });
  return resp;
}

/**
 * Returns the parsed JSON body of a non-streaming chat completion.
 */
export async function aiChat(opts: AIChatOptions): Promise<any> {
  if (opts.stream) {
    throw new Error("Use aiChatRaw() for streaming responses");
  }
  const resp = await aiChatRaw(opts);
  return await resp.json();
}

/**
 * Convenience: returns just the assistant text content from the first choice.
 */
export async function aiChatText(opts: AIChatOptions): Promise<string> {
  const data = await aiChat(opts);
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((c: any) => (typeof c === "string" ? c : c?.text ?? ""))
      .join("");
  }
  return "";
}

/**
 * Convenience: forces a tool call and returns the parsed arguments object.
 * Use this for structured-output extraction instead of asking the model to return JSON.
 */
export async function aiToolCall<T = Record<string, unknown>>(
  opts: AIChatOptions & { toolName: string }
): Promise<T> {
  if (!opts.tools || opts.tools.length === 0) {
    throw new Error("aiToolCall requires tools[] in options");
  }
  const data = await aiChat({
    ...opts,
    tool_choice: { type: "function", function: { name: opts.toolName } },
  });
  const call = data?.choices?.[0]?.message?.tool_calls?.[0];
  const args = call?.function?.arguments;
  if (!args) {
    throw new GatewayError(
      `Model did not return a tool call for ${opts.toolName}`,
      500,
      JSON.stringify(data)
    );
  }
  try {
    return JSON.parse(args) as T;
  } catch (e) {
    throw new GatewayError(
      `Failed to parse tool call arguments: ${(e as Error).message}`,
      500,
      args
    );
  }
}

/**
 * Standard JSON response builder for edge functions.
 * Maps gateway errors to user-friendly messages with correct HTTP status.
 */
export function gatewayErrorResponse(
  err: unknown,
  corsHeaders: Record<string, string>
): Response {
  if (err instanceof RateLimitError) {
    return new Response(
      JSON.stringify({ error: "Limite de uso da IA excedido. Tente novamente em instantes." }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  if (err instanceof PaymentRequiredError) {
    return new Response(
      JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos em Configurações." }),
      { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  const msg = err instanceof Error ? err.message : "Unknown gateway error";
  console.error("AI Gateway error:", msg, err instanceof GatewayError ? err.body : "");
  return new Response(
    JSON.stringify({ error: "Erro ao processar requisição de IA." }),
    { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
