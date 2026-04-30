/**
 * Safe Supabase wrappers — Onda 1 do refactor estrutural.
 *
 * Por que existem:
 * 1. `PostgrestBuilder` é "thenable" mas NÃO é uma Promise nativa, então `.catch()`
 *    direto nele lança `TypeError: ... .catch is not a function` em runtime
 *    (foi a causa raiz do bug que travou o vídeo de verificação Google).
 * 2. `supabase.functions.invoke()` retorna erros encapsulados em `FunctionsHttpError`
 *    com payload JSON dentro de `error.context.json()` — extrair manualmente em
 *    cada call site é repetitivo e fácil de errar.
 * 3. Centralizar dá um único ponto para adicionar telemetria, timeouts e logging.
 *
 * Uso:
 *   const data = await safeRpc('get_account_context', { p_user_id: id });
 *   const data = await safeFunctionInvoke('chat-mentor', { message: '...' });
 *   const rows = await safeQuery(supabase.from('teams').select('*'));
 */
import { supabase } from '@/integrations/supabase/client';
import type { PostgrestError } from '@supabase/supabase-js';

export class SupabaseSafeError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'SupabaseSafeError';
  }
}

/**
 * Chama um RPC e normaliza o resultado. Lança em caso de erro.
 * Substitui o anti-pattern: `supabase.rpc(...).catch(...)` (que crasha).
 */
export async function safeRpc<T = unknown>(
  name: string,
  args?: Record<string, unknown>,
): Promise<T> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc(name, args ?? {});
  if (error) {
    const pgError = error as PostgrestError;
    throw new SupabaseSafeError(
      `RPC ${name} failed: ${pgError.message}`,
      pgError,
      pgError.code,
    );
  }
  return data as T;
}

/**
 * Variante "best-effort" de safeRpc: nunca lança, retorna null em erro.
 * Use para operações de housekeeping (cleanup, telemetria) onde falhar é aceitável.
 */
export async function tryRpc<T = unknown>(
  name: string,
  args?: Record<string, unknown>,
): Promise<T | null> {
  try {
    return await safeRpc<T>(name, args);
  } catch (err) {
    console.warn(`[tryRpc] ${name} failed (best-effort):`, err);
    return null;
  }
}

/**
 * Invoca uma Edge Function e extrai a mensagem de erro real do body, em vez do
 * genérico "Edge Function returned a non-2xx status code".
 */
export async function safeFunctionInvoke<TResponse = unknown, TBody = unknown>(
  name: string,
  payload?: TBody,
  options?: { timeoutMs?: number },
): Promise<TResponse> {
  const invokePromise = supabase.functions.invoke(name, {
    body: payload as Record<string, unknown> | undefined,
  });

  const timed = options?.timeoutMs
    ? Promise.race([
        invokePromise,
        new Promise<never>((_, reject) =>
          setTimeout(
            () =>
              reject(
                new SupabaseSafeError(
                  `Function ${name} timed out after ${options.timeoutMs}ms`,
                  null,
                  'TIMEOUT',
                ),
              ),
            options.timeoutMs,
          ),
        ),
      ])
    : invokePromise;

  const { data, error } = await timed;

  if (error) {
    let detail: string | null = null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ctx = (error as any).context;
      if (ctx && typeof ctx.json === 'function') {
        const body = await ctx.json();
        detail = body?.error || body?.message || null;
      }
    } catch {
      /* ignore body parse errors */
    }
    throw new SupabaseSafeError(
      detail || error.message || `Function ${name} failed`,
      error,
    );
  }

  return data as TResponse;
}

/**
 * Executa um query builder (select/insert/update/delete) e normaliza o erro.
 * Aceita qualquer thenable do Postgrest.
 */
export async function safeQuery<T = unknown>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  builder: PromiseLike<{ data: T | null; error: PostgrestError | null }>,
): Promise<T> {
  const { data, error } = await builder;
  if (error) {
    throw new SupabaseSafeError(
      `Query failed: ${error.message}`,
      error,
      error.code,
    );
  }
  return data as T;
}

/**
 * Variante de safeQuery que retorna null em vez de lançar quando o resultado
 * é nulo (útil para `.maybeSingle()`).
 */
export async function safeMaybeQuery<T = unknown>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  builder: PromiseLike<{ data: T | null; error: PostgrestError | null }>,
): Promise<T | null> {
  const { data, error } = await builder;
  if (error) {
    throw new SupabaseSafeError(
      `Query failed: ${error.message}`,
      error,
      error.code,
    );
  }
  return data;
}
