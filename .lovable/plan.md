## Auditoria — rotas vivas sem entrada na UI

Cruzei cada `<Route path>` em `src/App.tsx` contra todas as referências em `src/` (Links, navigate, NavLink, sidebar items, CTAs). Filtrei rotas que esperadamente só recebem entrada por email/redirect externo (resetar senha, callbacks OAuth, unsubscribe, convites, etc.) — essas ficam de fora.

### Achados — rotas vivas, ZERO link na UI


| Rota                       | Página                    | Tem entrada na UI? | Diagnóstico                                                                                            |
| -------------------------- | ------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------ |
| `/hr/teams`                | `HRTeams.tsx`             | Não                | Existe sidebar HR? Não. Só há um botão "Voltar ao painel HR" → `/hr`. Página inalcançável.             |
| `/hr/analytics`            | `HRAnalytics.tsx`         | Não                | Idem. Inalcançável.                                                                                    |
| `/hr/competency-framework` | `CompetencyFramework.tsx` | Não                | Idem. Inalcançável.                                                                                    |
| `/help`                    | `HelpRedirect.tsx`        | Não                | Nenhum link em components/, emails ou edge functions aponta pra `/help`.                               |
| (sem rota)                 | `HelpCenter.tsx`          | —                  | Bônus: arquivo importado em `App.tsx:33` via `lazy()` mas **nunca usado em `<Route>**` — import morto. |


### Não são problema (mantêm)

- **Redirects legados** (`/dashboard`, `/dashboard/feedbacks`, `/dashboard/perfil`, `/dashboard/carreira`, `/lider/diario-v2`, `/lider/pessoas-v2`, `/analytics`, `/billing`) — fazem `<Navigate>` pra rota nova, servem de compat com bookmarks/links externos.
- **Rotas que recebem entrada por email/external** — `/unsubscribe`, `/reset-password`, `/auth/google/callback`, `/sync/:memberId`, `/invite`, `/review/:reviewId`, `/slack/connect`.
- **Rotas com entrada existente** — todas as `/lider/*`, `/liderado/*`, `/admin`, `/hr` (dashboard), `/design-system` (sidebar god's eye), `/recorder` (popup), `/evidence` (drawer), `/brief/:meetingId` (lista 1:1s), `/enterprise` + `/terms-of-service` + `/privacy-policy` (footer landing), `/onboarding`.

## Decisão necessária — caso a caso

### Bloco HR (`/hr/teams`, `/hr/analytics`, `/hr/competency-framework`)

São 3 páginas funcionais e completas, só sem nav. Duas opções:

- **Opção A — Conectar:** criar uma sub-nav HR (tabs ou sidebar item) em `/hr/*` com Dashboard, Times, Analytics, Membros, Competências. Mantém o trabalho que já existe e expõe ao usuário.
- **Opção B — Deletar:** remover as 3 rotas + 3 arquivos (`HRTeams.tsx`, `HRAnalytics.tsx`, `CompetencyFramework.tsx`). Reduz superfície de manutenção. `HRDashboard` continua como única entrada HR; o KPI cards atuais já navegam pra `/hr/members?filter=...` (essa rota tem que ficar).

### `/help` + `HelpCenter.tsx`

- `HelpRedirect` é só um redirect pra `?tab=ajuda` em Configurações. Como ninguém linka pra `/help`, o redirect não tem função.
- `HelpCenter.tsx` está importado mas sem `<Route>` — código morto.
- Recomendo **deletar os dois arquivos + a rota `/help` + o import órfão**. A aba "Ajuda" em Configurações continua acessível direto.

## Próxima ação

Me diz, pra cada bloco, "conectar" ou "deletar":

1. **Bloco HR (Teams/Analytics/CompetencyFramework):** Manter para futuro rebuild do user case de HR Admin
2. `**/help` + `HelpCenter.tsx` + `HelpRedirect.tsx`:** deletar tudo

Com as respostas eu executo num único passo.