

## Plano: Eliminar vazamento residual + indicador discreto

### Diagnóstico do vazamento residual

Os hooks principais (`useUserRole`, `useLinkedMember`, `useEffectiveUser`) já estão migrados. O dashboard correto deveria carregar pelo `Index.tsx` para qualquer impersonação. **MAS** existem queries em outros hooks/componentes que ainda usam `user.id` (do admin) direto:

| Origem | Sintoma |
|---|---|
| `usePlanLimits.ts` (7 queries com `user?.id`) | Banner "Próximo do limite — Pulse" mostra plano do Matheus, não do impersonado |
| `useCalendarIntegration.ts` (4 queries) | Reuniões e bots do Matheus aparecem na visão impersonada |
| `Analytics.tsx`, `DirectReportReviewView.tsx`, `SlackConnect.tsx`, etc. | Dados do admin se Yasmin navega para essas páginas |
| `AppSidebar.tsx` | Avatar usa `user.id`/`user.user_metadata.avatar` (do admin) |
| `OnboardingModal.tsx`, `NewNoteDialog.tsx`, `ReviewCommentsSection.tsx` | Escrevem com `manager_id = user.id` (correto: continua sendo o admin como autor — não devem mudar) |

**Regra simples para classificar:**
- **Leitura de dados "meus"** → migrar para `useEffectiveUser().id`
- **Escrita de auditoria/autoria** (manager_id, criado_por) → manter `user.id` (admin é o autor real, isso preserva accountability na DB)

### Plano de execução

**1. Migrar hooks de leitura compartilhados**
- `usePlanLimits.ts` → trocar `useAuth` por `useEffectiveUser`. Todas as 7 queries + queryKeys.
- `useCalendarIntegration.ts` → mesmo padrão (4 queries + mutation `update auto_transcribe`).

**2. Migrar páginas/componentes de leitura**
- `Analytics.tsx` (3 queries de feedbacks/reviews/members)
- `DirectReportReviewView.tsx` (1 query linked-member)
- `SlackConnect.tsx` (preferences do user)
- `AppSidebar.tsx`: avatar/MemberAvatar usa `effectiveUserId` para resolver foto correta + `userName` já vem de `linkedMember` quando aplicável

**3. NÃO mudar componentes de escrita autoral**
- `NewNoteDialog`, `ReviewCommentsSection`, `OnboardingModal` → continuam usando `user.id` (admin é o autor real)

**4. Indicador discreto de impersonação (substituir banner amarelo)**

Trocar `ImpersonationBanner.tsx` por um componente sutil:

- **Anel laranja/âmbar** ao redor do avatar do user no header (e no AppSidebar footer)
- **Tag "Personificando"** ao lado do nome (pequena pílula `bg-amber-100 text-amber-900 text-[10px]`)
- **Tooltip no anel**: "Você está vendo como {nome}. Clique para encerrar."
- Clicar no anel/tag → chama `stopImpersonation()` 

Aproveitar componente novo `ImpersonationIndicator.tsx` que envelopa `MemberAvatar` e adiciona o ring + tag + tooltip. Substituir o uso atual no `AppLayout.tsx` (banner) e no `AppSidebar.tsx` (avatar do footer).

**5. Memory update**
- Atualizar `mem://admin/impersonation-view-mode` com a regra de classificação leitura vs escrita autoral, e a nova UX do indicador.

### Arquivos modificados

- `src/hooks/usePlanLimits.ts` (migrar)
- `src/hooks/useCalendarIntegration.ts` (migrar)
- `src/pages/Analytics.tsx` (migrar)
- `src/pages/DirectReportReviewView.tsx` (migrar)
- `src/components/AppSidebar.tsx` (avatar usar effectiveUserId + integrar indicador)
- `src/components/AppLayout.tsx` (remover banner)
- `src/components/admin/ImpersonationBanner.tsx` (deprecar ou reduzir)
- `src/components/admin/ImpersonationIndicator.tsx` (novo — anel + tag + tooltip)
- `mem://admin/impersonation-view-mode` (atualizar regras)

### Escopo

Médio. ~25 min. Sem migrations. Sem riscos arquiteturais — só substituições de hook + um componente UI novo.

### Validação pós-fix

Testar impersonando 3 perfis distintos:
1. **Liderada vinculada** (Yasmin) → deve ver `DirectReportDashboard` da Yasmin, sem banner Pulse, sem times do Matheus
2. **Líder de outro workspace** (ex.: dono Faster Ops) → ver os times Faster Ops, plano correto
3. **HR Admin** (matheus_hr) → ver painel HR de Rhitmo Inc.

Em todos: anel laranja no avatar + tag "Personificando" + clique encerra.

