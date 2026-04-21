

# Fix do build error + finalizar Sprint 2 sem riscos

## Erro atual

`NotificationsTab.tsx` referencia `isLinkedMember` que não existe em `useUserRole`. O hook só expõe `role`, `isHRAdmin`, `isLeader`, `isUser`, `loading`.

## Causa

Ao criar `NotificationsTab` na onda 2A, assumi um campo do hook que não existe. O conceito de "liderado" no projeto vive em outro lugar — `useAccount().isLinkedMember` (via `AccountContext`), conforme padrão usado em `DirectReportGuard.tsx`.

## Fix

### 1. `src/components/settings/NotificationsTab.tsx`
Trocar a fonte de `isLinkedMember`:
- Remover `isLinkedMember` do destructuring de `useUserRole()`.
- Adicionar `import { useAccount } from '@/contexts/AccountContext';`
- Adicionar `const { isLinkedMember } = useAccount();`

Resto do componente fica igual — `visibleRows` continua filtrando por `r.showFor === 'member' → isLinkedMember`.

## Validação pós-fix (garantir Sprint 2 sem riscos)

Após o fix do TS error, vou rodar uma varredura de integração das 8 stories antes de marcar Sprint 2 como concluída:

1. **Typecheck global** — `tsc --noEmit` para pegar qualquer outro erro residual nos novos arquivos (`SmartInbox`, `SkillRadar`, `HealthScoreHero`, `LeadersAtRiskTable`, `MemberSyncWizard`, `RequestConversationDialog`, `useLeaderInbox`, `useNotificationPreferences`).
2. **Integração nas páginas** — confirmar que cada componente novo está realmente montado:
   - `SmartInbox` em `Index.tsx` (dashboard líder)
   - `HealthScoreHero` + `LeadersAtRiskTable` em `HRDashboard.tsx`
   - `SkillRadar` dentro de `SkillsMapCard.tsx` ou `MemberDetails.tsx`
   - `MemberSyncWizard` substituindo o dialog antigo em `DirectReportDashboard.tsx`
   - `RequestConversationDialog` substituindo o "Suggest 1:1" em `DirectReportDashboard.tsx`/`SkillsMapCard.tsx`
   - `NotificationsTab` montado em `ProfileSettingsDialog.tsx`
   - `MemberDetails` com 3 tabs ativas (S2.1)
   Onde estiver faltando, integrar.
3. **i18n** — confirmar que todas as strings novas (`settings.notifications.*`, `dashboard.smartInbox.*`, `hr.healthScore.*`, `hr.leadersAtRisk.*`, `member.sync.steps.*`, `member.requestConversation.*`, `member.skillRadar.*`) existem nos 3 locales (`pt-BR.json`, `en.json`, `es.json`). Adicionar as que faltarem.
4. **Edge function `send-member-nudge`** — deploy + smoke test via curl com payload mínimo para garantir que sobe sem erro de import e responde 401 quando sem auth (comportamento esperado).
5. **Linter Supabase** — rodar para confirmar que a migração nova (`user_notification_preferences` + RPCs `get_member_skill_radar`, `get_leaders_at_risk` + extensão de `get_hr_dashboard_metrics`) não introduziu warnings de RLS ou search_path.
6. **Smoke navegacional** — confirmar que as rotas críticas não quebram em runtime: `/`, `/member/:id?tab=performance`, `/hr`, `/settings` (dialog).

## Arquivos modificados nesta passada

- `src/components/settings/NotificationsTab.tsx` — fix do erro de TS.
- Qualquer arquivo de integração ou i18n que faltar (descoberto na validação 2 e 3).
- Possíveis ajustes em componentes novos se o typecheck encontrar mais erros.

## Critério de "Sprint 2 concluída sem riscos"

- ✅ `tsc --noEmit` passa sem erros.
- ✅ Cada uma das 8 stories tem componente integrado em página real (não apenas criado solto).
- ✅ Todas strings i18n presentes nos 3 locales.
- ✅ `send-member-nudge` deploya e responde.
- ✅ Linter Supabase sem novos warnings críticos.
- ✅ Sem regressões nas rotas principais (smoke check).

