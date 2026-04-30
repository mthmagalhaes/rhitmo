/**
 * Safe Supabase wrappers para Edge Functions (Deno).
 *
 * Mesma motivação do `src/lib/supabaseSafe.ts` no frontend:
 * `PostgrestBuilder` não é uma Promise nativa, então `.catch()` direto crasha.
 * Este módulo fornece wrappers seguros para uso server-side.
 *
 * Uso típico em Edge Functions:
 *
 *   import { tryRpc, safeQuery } from '../_shared/safeSupabase.ts';
 *
 *   await tryRpc(admin, 'cleanup_expired_oauth_states');
 *   const rows = await safeQuery(admin.from('teams').select('*'));
 */
import { SupabaseClient, PostgrestError } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

export class SupabaseSafeError extends Error {
  public readonly cause?: unknown;
  public readonly code?: string;
  constructor(message: string, cause?: unknown, code?: string) {
    super(message);
    this.name = 'SupabaseSafeError';
    this.cause = cause;
    this.code = code;
  }
}

export async function safeRpc<T = unknown>(
  client: SupabaseClient,
  name: string,
  args?: Record<string, unknown>,
): Promise<T> {
  // deno-lint-ignore no-explicit-any
  const { data, error } = await (client as any).rpc(name, args ?? {});
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
 * Best-effort RPC: nunca lança. Use para housekeeping / cleanup.
 * Substitui o anti-pattern `client.rpc(...).catch(() => {})`.
 */
export async function tryRpc<T = unknown>(
  client: SupabaseClient,
  name: string,
  args?: Record<string, unknown>,
): Promise<T | null> {
  try {
    return await safeRpc<T>(client, name, args);
  } catch (err) {
    console.warn(`[tryRpc] ${name} failed (best-effort):`, err);
    return null;
  }
}

export async function safeQuery<T = unknown>(
  // deno-lint-ignore no-explicit-any
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

export async function safeMaybeQuery<T = unknown>(
  // deno-lint-ignore no-explicit-any
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
