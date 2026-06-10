# Sprint 3 — Polimento (severidade BAIXA) — CONCLUÍDO

Itens entregues:

## 3.1 — `signup_persona`: localStorage → sessionStorage com fallback
- Novo helper `src/lib/signupPersona.ts` (`setSignupPersona` / `getSignupPersona` / `clearSignupPersona`).
- sessionStorage primário (sobrevive OAuth round-trip e some quando fecha a aba — sem leak entre signups).
- localStorage como fallback de leitura por back-compat.
- Migrados: `AuthPage`, `PersonaSelector`, `Auth`, `AppLayout`, `WorkspaceOnboarding`, `HRAdminWorkspaceOnboarding`.
- `pending_invite` permanece em localStorage de propósito (precisa sobreviver email-confirm em outra aba).

## 3.2 — Validação de e-mail no `NewCompanyWizard`
- Regex `EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/` + helper `isValidEmail`.
- `canNext` agora exige e-mail válido nos Steps 2, 3, 4 (quando preenchido).
- `inviteByEmail` rejeita cedo com mensagem clara antes de chamar a edge function.

## 3.3 — Comentário SQL em `team_members`
- Migration `20260610...` adiciona `COMMENT ON COLUMN` em `user_id` (manager/criador) e `linked_user_id` (membro real).
- Documenta a regra histórica do `mem://security/historical-data-visibility-integrity`.

## Fora deste Sprint (debt deliberada)

- **`window.location.href` → `navigate()` (3 sites restantes):** `AppLayout` `/hr`, `WorkspaceSwitcher` switch de workspace, `useImpersonation` start/stop. Todos dependem de hard reload pra re-resolver `AccountContext`/RLS. Refatorar exige antes mover o cache do AccountContext pra react-query invalidatable + adicionar event bus de "workspace mudou". Sai num sprint próprio.
- **Progress bar real do onboarding:** UX feature, não bug-fix. Backlog.
