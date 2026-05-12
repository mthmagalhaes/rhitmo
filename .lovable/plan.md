## Contexto

O MVP Ambient já está rodando (classifier 2x/dia → `slack_ambient_evidence` → rollup semanal → `ctx:slack_activity_rollup`). Falta a camada de superfície: **configuração**, **visibilidade no dashboard do liderado** e **integração no brief de 1:1**. Abaixo, a recomendação de onde colocar cada peça e por quê.

---

## 1. UI de configuração Ambient

**Lugar:** `src/pages/lider/Configuracoes.tsx`, dentro do card **Slack** da aba **Integrações** — expandindo-o quando conectado.

**Por quê:**
- Toda config de integração já vive lá (Slack, Calendar). Criar uma aba nova ("Privacidade", "Ambient") fragmenta.
- Ambient é uma capacidade *do Slack conectado*; faz sentido ser sub-config do próprio card.
- HR Admin / Owner também acessam essa página — são quem precisa controlar.

**O que entra (collapsible "Ambient Mode" abaixo do botão Disconnect):**
- Toggle `ambient_mode_enabled` (já existe na tabela `workspace_slack_settings`)
- Toggle `autojoin_public_channels`
- Multi-select de canais para **excluir** (`excluded_channel_ids`) — busca via `conversations.list`
- Texto curto: "Observamos só canais públicos onde o bot Rhitmo está. Nunca DMs nem privados. Liderados podem ver o que é capturado em /meu-rhitmo."
- Link "Ver últimos rollups" → abre drawer com últimas linhas de `ctx_evidence` filtradas por `evidence_type='slack_activity_rollup'`

**Permissão:** apenas HR Admin / Owner editam (líder comum vê read-only). Reusar `useAccount().isHrAdmin`.

---

## 2. Card no DirectReportDashboard

**Lugar:** `src/components/dashboard/DirectReportDashboard.tsx`, **novo card "Atividade no Slack"** dentro da grid existente, logo após o `SkillsMapCard` (linha ~666) e antes do bloco de feedbacks (linha ~676). Ocupa 1 coluna em desktop, full em mobile.

**Por quê:**
- O dashboard já é Bento Grid; inserir mais um card ali respeita o padrão visual.
- Posição **abaixo** do SkillsMap mantém hierarquia: identidade → habilidades → sinais ambient → feedback formal.
- Não competir com o Pulse Card (topo) que é ação imediata; Ambient é observação contextual.

**O que entra (componente novo `SlackActivityCard.tsx`):**
- Header: ícone Slack + "Atividade recente no Slack" + badge "Últimos 7 dias"
- Lê o último `ctx_evidence` do liderado com `evidence_type='slack_activity_rollup'`
- Renderiza:
  - **Top temas** (3 chips) — vem de `payload.themes`
  - **Mais conversa com** (3 avatares + nome) — `payload.top_collaborators`
  - **Canais ativos** (lista compacta) — `payload.top_channels`
  - **Narrativa** (2-3 linhas em itálico discreto) — `payload.narrative`
- Empty state: "Sem sinais relevantes nos últimos 7 dias." + link "Como funciona" → tooltip de privacidade
- Loading state: skeleton

**Visibilidade:** somente líder do liderado (RLS `ctx_evidence.visibility='private_leader'` já garante). Não aparece no `/liderado/Inicio`.

---

## 3. Bloco no brief de 1:1

**Lugar:** `supabase/functions/_shared/briefGenerator.ts` — adicionar **novo BlockSpec** chamado `slack_activity` na composição do brief, e renderizar via `ExecutiveBrief.tsx` (que já itera sobre `blocks`).

**Por quê:**
- Já existe a abstração `BriefBlock` com Icon + label + items + evidence chips. Adicionar mais um bloco é o caminho de menor atrito.
- O brief de 1:1 (`generate-brief`) é exatamente o momento em que o líder quer saber "no que ele andou trabalhando" antes da conversa.
- Já existe precedente: bloco "Contexto de rede" (memória `brief-network-block`) injeta dados análogos.

**O que entra:**
- `BlockSpec`:
  - `id: 'slack_activity'`
  - `label: 'Atividade no Slack (últimos 7 dias)'`
  - `icon: Slack` (lucide)
- Items gerados a partir do último rollup do liderado:
  - 1 linha: "Foco principal: {top 2 temas}"
  - 1 linha: "Colaboração intensa com: {top 2-3 colaboradores}"
  - 1 linha condicional: "{narrativa curta}" se houver
- `evidence_ids`: id do `ctx_evidence` do rollup, para que a Citation Chip abra o EvidenceDrawer
- Posição: **depois** do bloco "Contexto de rede" e **antes** de "Próximos passos / temas sugeridos" — assim o líder lê primeiro identidade/rede, depois sinais Slack, depois ação.

**Fallback:** se não houver rollup nos últimos 7 dias → bloco simplesmente não aparece (não renderizar "sem sinais" para não poluir o brief).

---

## Resumo das alterações de código

```text
src/pages/lider/Configuracoes.tsx       → expand card Slack com Ambient settings (HR Admin)
src/components/settings/AmbientSlackSettings.tsx  → novo (toggles + canais excluídos)
src/components/dashboard/SlackActivityCard.tsx    → novo card Bento
src/components/dashboard/DirectReportDashboard.tsx → inserir card após SkillsMap
supabase/functions/_shared/briefGenerator.ts      → novo BlockSpec slack_activity
src/components/context/ExecutiveBrief.tsx         → registrar icon mapping (sem mudança estrutural)
.lovable/memory/...                                → atualizar memory ambient-weekly-rollup com surfaces
```

Sem migrações novas — toda a infra de dados já existe.

## Out of scope (próximos sprints)

- DM proativa "Detectamos sobrecarga em X" (precisa watermelon detection)
- Visibilidade do rollup em `/meu-rhitmo` (transparência para o liderado)
- Filtro temporal (hoje fixo em 7 dias)

---

**Quer que eu siga com essa alocação ou prefere mover algum desses elementos de lugar (ex.: card no `/lider/inicio` em vez do DRD; config numa aba "Privacidade" separada)?**