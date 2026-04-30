// Onda 4.5 — Feature flags simples para rollback de migrações de bus.
// Use defaults conservadores (true = caminho novo). Para reverter:
// setar a env como "false" no projeto e o redeploy não é necessário
// — Edge Functions leem env a cada cold start.

export function flag(name: string, defaultValue = true): boolean {
  const v = Deno.env.get(name);
  if (v == null) return defaultValue;
  const norm = v.trim().toLowerCase();
  if (norm === "false" || norm === "0" || norm === "no") return false;
  if (norm === "true" || norm === "1" || norm === "yes") return true;
  return defaultValue;
}
