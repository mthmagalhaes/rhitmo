## Objetivo

A landing já tem a nova narrativa de pricing (Pulse com 2 liderados ao final, Pro agrupado em "Ciclo de Performance" + "Ferramentas de Apoio", Enterprise com frase de impacto). A tela `/slack/channels` foi criada e a Evidence já linka pra ela. Agora falta **ajustar o resto do app** para que a informação se converse:

1. **Billing** ainda reflete a estrutura antiga (lista plana, copy genérica, sem agrupamento, sem menção a "2 liderados" no Pulse).
2. **AppSidebar** abre o `SlackConnectorDialog` mesmo quando o Slack já está conectado — deveria levar a `/slack/channels` (para gerenciar) e adicionar item de nav explícito.
3. **SlackConnectorDialog** não aponta para a nova tela de canais nem menciona evidências — passos 4 e 5 estão desatualizados (`/nota`, `/kudos` em vez de captura ambient).
4. **PersonaSelector** ("Plano Pulse grátis"): mantém, mas reforçar a paridade de copy com landing ("até 2 liderados, Mentor com 20 conversas/mês").
5. **MeetingRecorder** mostra "Gravação não disponível no plano Pulse" — copy está OK mas o CTA "Faça upgrade" é texto morto, sem botão pra `/billing`.
6. **usePlanLimits** tem comentário stale ("15h/mês de bot conforme contrato") quando o limite real é 30h.

Sem mexer em preços, lógica de billing, Stripe IDs, ou na narrativa da landing.

---

## Mudanças

### 1. `src/pages/Billing.tsx` — alinhar `PLAN_FEATURES` com a landing

**Pulse** (`PLAN_FEATURES.pulse`):
- Reordenar e usar a mesma copy da landing:
  - Diário de bordo ilimitado
  - Mentor AI — até 20 conversas por mês
  - 1 avaliação com IA por mês
  - Notas e registros ilimitados
  - **Até 2 liderados diretos** (último item)
- `lockedFeatures`: trocar "Bot de transcrição automática (Recall.ai)" por "Transcrição automática de reuniões (30h/mês)" para bater com a landing.

**Pro** (`PLAN_FEATURES.pro`): trocar lista plana por estrutura agrupada idêntica à landing:
```
Ciclo de Performance:
  - Diário de bordo + resumo mensal automático
  - Acompanhamento trimestral guiado por IA
  - Avaliações formais com evidências citadas

Ferramentas de Apoio:
  - Transcrição automática de reuniões — 30h/mês
  - Pre-meeting briefs com contexto histórico
  - Detecção de viés em tempo real
  - Mentor AI ilimitado
  - Time acessa feedbacks e metas em tempo real
  - Analytics completo · Times ilimitados
  - Liderados ilimitados
```

Adaptar o JSX (`PLAN_FEATURES.pro.features.map(...)`) tanto na tela de upgrade (linha ~639) quanto no painel "O que está incluso" (linha ~499) para renderizar `groupLabel` em uppercase `text-[11px] tracking-wide text-muted-foreground` + divider `border-t border-border/40` entre grupos. Mesmo padrão visual da landing.

**Enterprise** (mesma lista do array `enterpriseFeatures` da landing): adicionar acima do bloco "Sob consulta" (linha ~668) a frase italic `text-sm text-muted-foreground`:  
*"Ciclo completo de performance para toda a organização — calibração entre gestores, blindagem jurídica e visibilidade do RH em tempo real."*

### 2. `src/components/AppSidebar.tsx` — Slack inteligente

No botão Slack (linha ~316):
- Se `slackConnected` → `navigate('/slack/channels')` (gerenciar canais)
- Se não conectado → continua abrindo `SlackConnectorDialog`

### 3. `src/components/slack/SlackConnectorDialog.tsx` — atualizar onboarding

Substituir os passos 4-5 e a lista de comandos por uma seção curta que reflete o novo fluxo principal (captura ambient + evidências):
- Passo 4: "Convide o bot @Rhitmo nos canais públicos onde seu time conversa, ou ative o **autojoin** em **Gerenciar canais**."
- Passo 5: "O Rhitmo captura sinais relevantes automaticamente. Você revisa em **Evidências** e converte em notas."
- Adicionar dois botões secundários (visíveis quando `isConnected`): "Gerenciar canais" → `/slack/channels` e "Ver evidências" → `/evidence`.
- Manter a lista de comandos slash (`/rhitmo`, `/nota`, `/kudos`, `/brief`, `/meu-pdi`) num bloco "Comandos disponíveis" abaixo, sem alterá-la.

### 4. `src/components/MeetingRecorder.tsx` — CTA de upgrade clicável

Bloco "Gravação não disponível no plano Pulse" (linha ~284): trocar o `<p>Faça upgrade…</p>` por um `<Button size="sm" variant="outline" onClick={() => navigate('/billing')}>Ver planos</Button>`. Importar `useNavigate`.

### 5. `src/hooks/usePlanLimits.ts` — comentário stale

Linha 41-42: trocar comentário `"15h/mês de bot conforme contrato"` por `"30h/mês de transcrição (manual + bot Recall) conforme pricing 2026"` para evitar confusão futura.

### 6. `src/pages/PersonaSelector.tsx` — paridade de copy

Atualizar `leaderDesc` (PT/EN/ES) para mencionar Mentor com 20 conversas/mês, mantendo "até 2 liderados":
- PT: "Crie seu workspace Pulse: até 2 liderados, Mentor AI com 20 conversas/mês e 1 avaliação com IA. Tudo grátis pra sempre."
- EN: "Create your Pulse workspace: up to 2 direct reports, Mentor AI with 20 conversations/month and 1 AI review. Free forever."
- ES: "Crea tu workspace Pulse: hasta 2 colaboradores, Mentor AI con 20 conversaciones/mes y 1 evaluación con IA. Gratis para siempre."

---

## Fora de escopo (intencional)

- Sem alterações em preços, Stripe IDs, ciclos, RLS, tabelas Supabase, ou na landing (já refinada na rodada anterior).
- Sem mexer no `Roadmap.tsx` (a menção a "Pulse surveys" é um nome de feature futura, não relacionado ao plano Pulse).
- Sem mexer no `HRAdminWorkspaceOnboarding` ("Comece no Pulse com amostra do Enterprise" continua válido).
- Sem mexer nas tabelas i18n PT/EN/ES de `pt-BR.json` etc — as mudanças acima estão em strings hardcoded ou em `translations` locais.

## Esperado

- `/billing` (Pulse) e `/billing` (Pro ativo) mostram exatamente a mesma estrutura de features que a landing.
- Sidebar leva direto para `/slack/channels` quando Slack já está conectado, em vez de abrir o dialog inútil.
- Dialog de conexão menciona o fluxo real (autojoin + evidências), não só comandos slash.
- MeetingRecorder no Pulse: usuário consegue clicar "Ver planos" e ir pra billing.
- PersonaSelector reforça a mesma promessa de valor que a landing.
