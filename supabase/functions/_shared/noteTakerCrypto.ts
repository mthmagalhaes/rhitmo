// Criptografia das chaves pessoais de note taker (Granola, etc).
//
// A chave do líder NUNCA fica em texto puro no banco: quem abrisse a tabela
// veria uma credencial válida da conta Granola dele. Guardamos AES-GCM
// (iv | ciphertext, base64) e derivamos a chave AES de NOTE_TAKER_KEY_SECRET
// via SHA-256 — assim o secret pode ser qualquer string aleatória.

async function aesKey(): Promise<CryptoKey> {
  const raw = Deno.env.get("NOTE_TAKER_KEY_SECRET");
  if (!raw) throw new Error("NOTE_TAKER_KEY_SECRET is not set");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encryptApiKey(plaintext: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      await aesKey(),
      new TextEncoder().encode(plaintext),
    ),
  );
  const buf = new Uint8Array(iv.length + ciphertext.length);
  buf.set(iv);
  buf.set(ciphertext, iv.length);
  return btoa(String.fromCharCode(...buf));
}

export async function decryptApiKey(stored: string): Promise<string> {
  const buf = Uint8Array.from(atob(stored), (c) => c.charCodeAt(0));
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: buf.subarray(0, 12) },
    await aesKey(),
    buf.subarray(12),
  );
  return new TextDecoder().decode(plaintext);
}
