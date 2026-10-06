// Resolve a credencial usada por um provedor de note taker.
// - BYOK (Granola, Fireflies, ...): descriptografa a chave pessoal.
// - google_meet: usa o token Google do líder (google_calendar_tokens),
//   renovando com o refresh token quando expirado.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decryptApiKey } from "./noteTakerCrypto.ts";

export const GOOGLE_OAUTH_PLACEHOLDER = "google_oauth";

export async function resolveNoteTakerCredential(
  supabase: SupabaseClient,
  connection: { user_id: string; provider: string; api_key_ciphertext: string },
): Promise<string> {
  if (connection.provider !== "google_meet") {
    return await decryptApiKey(connection.api_key_ciphertext);
  }

  const { data: tok } = await supabase
    .from("google_calendar_tokens")
    .select("access_token, refresh_token, token_expiry")
    .eq("user_id", connection.user_id)
    .maybeSingle();
  if (!tok) throw new Error("Conta Google desconectada. Reconecte o Google Meet.");

  const fresh = tok.token_expiry && new Date(tok.token_expiry).getTime() - Date.now() > 120_000;
  if (fresh && tok.access_token) return tok.access_token;
  if (!tok.refresh_token) throw new Error("Autorização do Google expirou. Reconecte o Google Meet.");

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: Deno.env.get("GOOGLE_CLIENT_ID")!,
      client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET")!,
      refresh_token: tok.refresh_token,
      grant_type: "refresh_token",
    }),
  });
  const body = await res.json();
  if (!res.ok || !body.access_token) {
    throw new Error(`Autorização do Google expirou (${body.error ?? res.status}). Reconecte o Google Meet.`);
  }
  await supabase
    .from("google_calendar_tokens")
    .update({
      access_token: body.access_token,
      token_expiry: new Date(Date.now() + (body.expires_in ?? 3600) * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", connection.user_id);
  return body.access_token;
}
