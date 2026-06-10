// Helper compartilhado: encontra um usuário pelo e-mail via Auth Admin API.
// listUsers é paginado (max 1000/page); iteramos até 10 páginas (10k usuários).
// Usado por admin-invite-user, invite-hr-admin e quaisquer fluxos que precisem
// resolver e-mail → user_id antes de promover/convidar.
//
// Retorna o User completo ou null.

// deno-lint-ignore no-explicit-any
type SupabaseAdmin = any;

export interface FoundUser {
  id: string;
  email: string | null;
  email_confirmed_at?: string | null;
  last_sign_in_at?: string | null;
}

export async function findUserByEmail(
  supabaseAdmin: SupabaseAdmin,
  email: string,
  opts: { maxPages?: number; perPage?: number } = {},
): Promise<FoundUser | null> {
  const maxPages = opts.maxPages ?? 10;
  const perPage = opts.perPage ?? 1000;
  const normalized = email.trim().toLowerCase();

  let page = 1;
  while (page <= maxPages) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.error('[findUserByEmail] listUsers error:', error);
      throw new Error('Não consegui localizar o usuário existente.');
    }
    const users = data?.users ?? [];
    const match = users.find(
      (u: { email?: string | null }) => (u.email ?? '').toLowerCase() === normalized,
    );
    if (match) {
      return {
        id: match.id,
        email: match.email ?? null,
        email_confirmed_at: match.email_confirmed_at ?? null,
        last_sign_in_at: match.last_sign_in_at ?? null,
      };
    }
    if (users.length < perPage) break;
    page += 1;
  }
  return null;
}
