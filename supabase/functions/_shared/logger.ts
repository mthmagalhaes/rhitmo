/**
 * Onda 4.1 — Observabilidade unificada
 *
 * Logger centralizado para Edge Functions. Agrega entradas em memória
 * durante o ciclo de vida de uma requisição e faz flush em batch para
 * `public.function_logs` no `finally` do handler.
 *
 * Princípios:
 * - Nunca propaga erro (logger nunca derruba a função)
 * - Flush com timeout duro (não bloqueia resposta)
 * - request_id propagado via header `x-request-id`
 *
 * Uso típico:
 *   const requestId = req.headers.get('x-request-id') ?? crypto.randomUUID();
 *   const log = createLogger({ functionName: 'chat-mentor', requestId });
 *   try {
 *     log.info('start');
 *     ...
 *     log.info('end', { duration_ms });
 *   } catch (e) {
 *     log.error('failed', e);
 *     throw e;
 *   } finally {
 *     await log.flush();
 *   }
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LoggerContext {
  functionName: string;
  requestId: string;
  userId?: string | null;
  workspaceId?: string | null;
}

export interface LogEntry {
  level: LogLevel;
  event: string;
  duration_ms?: number;
  metadata?: Record<string, unknown>;
  error_message?: string;
}

interface QueuedRow {
  request_id: string;
  function_name: string;
  level: LogLevel;
  event: string;
  duration_ms: number | null;
  user_id: string | null;
  workspace_id: string | null;
  metadata: Record<string, unknown>;
  error_message: string | null;
}

const FLUSH_TIMEOUT_MS = 800;

function getServiceClient(): SupabaseClient | null {
  const url = Deno.env.get('SUPABASE_URL') ?? Deno.env.get('VITE_SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export interface Logger {
  ctx: LoggerContext;
  setUser(userId: string | null): void;
  setWorkspace(workspaceId: string | null): void;
  debug(event: string, metadata?: Record<string, unknown>): void;
  info(event: string, metadata?: Record<string, unknown>): void;
  warn(event: string, metadata?: Record<string, unknown>): void;
  error(event: string, err?: unknown, metadata?: Record<string, unknown>): void;
  aiCall(args: { model: string; durationMs: number; tokensIn?: number; tokensOut?: number; status?: number; error?: string }): void;
  flush(): Promise<void>;
}

export function createLogger(initial: LoggerContext): Logger {
  const ctx: LoggerContext = { ...initial };
  const queue: QueuedRow[] = [];
  let flushed = false;

  function enqueue(entry: LogEntry) {
    // Mirror to console for live debugging via Supabase logs
    const tag = `[${ctx.functionName}/${ctx.requestId.slice(0, 8)}]`;
    const line = `${tag} ${entry.level.toUpperCase()} ${entry.event}`;
    if (entry.level === 'error' || entry.level === 'warn') {
      console.warn(line, entry.metadata ?? '', entry.error_message ?? '');
    } else {
      console.log(line, entry.metadata ?? '');
    }

    queue.push({
      request_id: ctx.requestId,
      function_name: ctx.functionName,
      level: entry.level,
      event: entry.event,
      duration_ms: entry.duration_ms ?? null,
      user_id: ctx.userId ?? null,
      workspace_id: ctx.workspaceId ?? null,
      metadata: entry.metadata ?? {},
      error_message: entry.error_message ?? null,
    });
  }

  function errMsg(err: unknown): string {
    if (!err) return '';
    if (err instanceof Error) return err.message;
    if (typeof err === 'string') return err;
    try { return JSON.stringify(err); } catch { return String(err); }
  }

  return {
    ctx,
    setUser(userId) { ctx.userId = userId; },
    setWorkspace(workspaceId) { ctx.workspaceId = workspaceId; },
    debug(event, metadata) { enqueue({ level: 'debug', event, metadata }); },
    info(event, metadata) {
      const dur = typeof metadata?.duration_ms === 'number' ? metadata.duration_ms as number : undefined;
      enqueue({ level: 'info', event, metadata, duration_ms: dur });
    },
    warn(event, metadata) { enqueue({ level: 'warn', event, metadata }); },
    error(event, err, metadata) {
      enqueue({ level: 'error', event, metadata, error_message: errMsg(err) });
    },
    aiCall({ model, durationMs, tokensIn, tokensOut, status, error }) {
      enqueue({
        level: error ? 'error' : 'info',
        event: 'ai_call',
        duration_ms: durationMs,
        metadata: { model, tokens_in: tokensIn, tokens_out: tokensOut, status },
        error_message: error,
      });
    },
    async flush() {
      if (flushed || queue.length === 0) { flushed = true; return; }
      flushed = true;
      const rows = queue.splice(0, queue.length);
      const client = getServiceClient();
      if (!client) {
        console.warn('[logger] no service role client — skipping flush');
        return;
      }
      try {
        const insertPromise = client.from('function_logs').insert(rows);
        const timeout = new Promise<{ error: Error }>((resolve) =>
          setTimeout(() => resolve({ error: new Error('flush_timeout') }), FLUSH_TIMEOUT_MS)
        );
        const result = await Promise.race([insertPromise, timeout]);
        // @ts-ignore - result shape varies
        if (result?.error) console.warn('[logger] flush error:', result.error.message ?? result.error);
      } catch (e) {
        console.warn('[logger] flush threw:', (e as Error)?.message);
      }
    },
  };
}

/**
 * Helper to extract or generate a request_id from incoming Request.
 * Always returns a valid UUID. Use the returned id in the response header too.
 */
export function getOrCreateRequestId(req: Request): string {
  const header = req.headers.get('x-request-id');
  if (header && /^[0-9a-f-]{36}$/i.test(header)) return header;
  return crypto.randomUUID();
}
