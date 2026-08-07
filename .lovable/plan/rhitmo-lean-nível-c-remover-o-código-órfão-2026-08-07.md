# Rhitmo Lean — Nível C: remover o código órfão

Níveis A (navegação) e B (crons) já estão aplicados. Esta rodada tira do repositório o que ficou pendurado sem consumidor. Nada aqui muda dado em produção: nenhuma migration destrutiva, nenhuma tabela apagada.

## O que a varredura de imports mostrou

Verificado agora, buscando referências em `src/` e `supabase/`:

| Cluster | Situação real |
|---|---|
| Pulse (`components/pulse/*`, `usePulses`, `usePendingPulseSurveys`, páginas `/lider/pulse`, `/liderado/pulse`) | Só se referenciam entre si. `PendingPulseAlert` está atrás de um `{false && ...}` no dashboard do liderado. |
| ONA / Rede (`NetworkSignalsFeed`, `MemberNetworkPanel`, `useTeamPulse`) | Ainda importados por `src/pages/lider/Contexto.tsx` — a aba saiu da UI mas os imports ficaram. |
| Wizards de review não-manager | `selfReviewQuestions.ts`, `peerReviewQuestions.ts`, `upwardsReviewQuestions.ts` sem nenhum consumidor. No `DirectReportDashboard` sobraram `mySelfReviews`/`myUpwardsReviews` hard-coded como `[]` e um bloco de render inalcançável. |
| Bias detection | Ainda vivo e conectado: `rich-text-editor-impl`, `NewNoteDialog`, `BiasInlinePopover`, `BiasSuggestionsPanel`. **Não é órfão** — fica de fora desta rodada. |
| Edge functions sem cron e sem chamada do frontend | `detect-network-signals`, `request-peer-feedback`, `mirror-weekly`, `build-team-graph`. |

## O que vai ser feito

### 1. Limpar `Contexto.tsx`
Remover os imports e o render de `NetworkSignalsFeed` e `MemberNetworkPanel` (a aba Rede já não aparece), e tirar "kudos, metas, Pulse" da frase descritiva — promete o que a tela não entrega mais.

### 2. Apagar o cluster Pulse
- Componentes: `SendPulseButton`, `SendPulseModal`, `PulseWizard`, `AnswerPulseModal`, `PendingPulseAlert`
- Hooks: `usePulses`, `usePendingPulseSurveys`, `useTeamPulse`
- Libs: `pulseTemplates.ts`, `pulseIdeas.ts`
- Páginas: `lider/Pulse.tsx`, `lider/PulseDetail.tsx`, `liderado/Pulse.tsx`
- Rotas `/lider/pulse`, `/lider/pulse/:id`, `/liderado/pulse` viram `Navigate` para a home da persona, em vez de 404.

### 3. Apagar o cluster Rede/ONA e wizards mortos
- `NetworkSignalsFeed.tsx`, `MemberNetworkPanel.tsx`
- `selfReviewQuestions.ts`, `peerReviewQuestions.ts`, `upwardsReviewQuestions.ts`
- No `DirectReportDashboard`: remover as variáveis `[]` e os blocos de render que nunca executam.

### 4. Apagar 4 edge functions sem uso
`detect-network-signals`, `request-peer-feedback`, `mirror-weekly`, `build-team-graph` — já desagendadas no Nível B, zero chamadas do app.

### 5. Rotas Compass e PDI
`/liderado/compass` e `/liderado/pdi` são wrappers de uma linha em cima de `Index`. Mantidos como estão: custo zero e preservam links antigos.

## O que fica preservado

- Todas as tabelas: `pulse_surveys`, `network_signals`, `review_peers`, `peer_feedback_requests`, `development_plans`, `goals`. RLS intacta.
- `mirror-weekly` e afins deixam de existir como função, mas os dados que já geraram continuam no banco.
- Bias detection inteiro.
- Recap trimestral sob demanda.

## Notas técnicas

- Ordem: primeiro tirar os imports de `Contexto.tsx` e `DirectReportDashboard.tsx`, depois deletar arquivos, depois limpar `routeLoaders.ts` e `App.tsx`. Fecha com typecheck.
- Chaves i18n de Pulse nos três locales saem junto.
- Reversível por histórico de commit; se voltar, tabela e RLS já estão de pé.
