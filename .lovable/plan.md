
## Plano: Atualização do Roadmap + Revisão de 3 Áreas

### 1. Atualizar o Roadmap (`src/pages/Roadmap.tsx`)

Mudanças de status com base na auditoria técnica:

| Item | Status Atual | Novo Status |
|------|-------------|-------------|
| Pre-meeting briefs | `wip` | `done` |
| Nudges automáticos | `planned` | `done` |
| HR Dashboard avançado | `planned` → Q4 | `done` → mover para Q2 |
| Tags manuais de classificação | — | Adicionar em Q2 como `done` |

---

### 2. HR Dashboard Avançado — Status Atual (AS IS)

Já implementado em `HRAnalytics.tsx` com 4 abas:
- **Visão Geral**: KPIs (liderados, líderes ativos, feedbacks 30d, cobertura PDI), feedbacks por líder, distribuição de sentimento
- **Tendências**: Volume semanal (12 semanas), tags mais frequentes
- **Riscos**: `RiskTable` com membros em risco (dias sem feedback, sem PDI)
- **Engajamento**: `EngagementHeatmap` por líder

**O que está faltando/pode melhorar:**
- Filtro por departamento/time (hoje só filtra por líder)
- Export de dados (CSV/PDF dos relatórios)
- Comparativo entre períodos (mês anterior vs. atual)
- Score de saúde organizacional consolidado

Nesta sprint, implementarei:
- Filtro por time no dashboard HR
- KPI de "score de saúde" agregado

---

### 3. Painel Admin (`matheus@rhitmo.co`) — Revisão de Funcionalidades

O painel `/admin` hoje tem 6 abas:
- **Visão Geral**: Stats globais (workspaces, membros, feedbacks, reviews), tabela de workspaces com toggle ativo/inativo, troca de plano, envio de convite
- **Suporte & Edição**: (AdminSupport)
- **Data Export**: (AdminExport)
- **Usuários**: (AdminUsers)
- **Acessos**: (AdminAccess)
- **Estrutura**: (AdminStructure) — gestão de workspaces/times/membros

**Funcionalidades existentes que funcionam:**
- CRUD de workspaces, toggle ativo, troca de plano
- Convite de usuários com seleção de plano
- Gestão de estrutura hierárquica
- Impersonation

**O que pode ser adicionado:**
- Dashboard de métricas de uso (logins, feedbacks/dia, retenção)
- Logs de atividade por workspace
- Gerenciamento de billing centralizado

Nesta sprint, vou revisar e validar as funcionalidades existentes. Novas funcionalidades serão propostas após validação.

---

### 4. Slack Bot — Revisão de Funcionalidades

**Comandos implementados hoje:**
| Comando | Persona | Status |
|---------|---------|--------|
| `/rhitmo` | Todos | ✅ Menu contextual por persona |
| `/nota` | Líder | ✅ Registra feedback |
| `/kudos` | Todos | ✅ Reconhecimento público |
| `/brief` | Líder | ✅ Resumo de membro |
| `/meu-pdi` | Liderado | ✅ PDI no Slack |
| Modais (nota/kudos) | Líder | ✅ Via botões interativos |

**O que NÃO existe ainda no Slack:**
- ❌ **Mentor Chat via Slack** — Hoje o `chat-mentor` é uma Edge Function chamada pelo frontend (`MentorChat.tsx`). Não há integração com o Slack bot. O líder não consegue conversar com o mentor pelo Slack.
- ❌ **Meu Rhitmo via Slack** — A Edge Function `meu-rhitmo` existe (analisa transcrições), mas não está conectada ao Slack. O liderado não consegue acessar "Meu Rhitmo" pelo Slack.

**Implementação proposta nesta sprint:**

**4a. `/mentor` no Slack (para líderes)**
- Novo comando `/mentor <pergunta>` que envia a pergunta para a Edge Function `chat-mentor`
- Resposta formatada em blocks do Slack
- Suporta contexto do membro se mencionado: `/mentor @João como preparar a 1:1?`

**4b. `/meu-rhitmo` no Slack (para liderados)**
- Novo comando que retorna um resumo do perfil do liderado (Career Compass, feedbacks recentes, próximas ações)
- Consulta dados já existentes no banco sem precisar chamar a Edge Function completa

---

### Arquivos a modificar

| Arquivo | Ação |
|---------|------|
| `src/pages/Roadmap.tsx` | Atualizar status de 4 itens, adicionar tags manuais |
| `src/pages/HRAnalytics.tsx` | Adicionar filtro por time e KPI de saúde |
| `supabase/functions/slack-bot/index.ts` | Adicionar `/mentor` e `/meu-rhitmo` |

### Ordem de execução
1. Roadmap (rápido, ~2 min)
2. Slack `/mentor` + `/meu-rhitmo` (funcionalidade nova)
3. HR Dashboard filtro por time
