## Página `/slack/channels` — Gerenciar canais monitorados

Tela pra líder escolher quais canais públicos do Slack o Rhitmo deve monitorar (capturar evidências automaticamente). Reaproveita a infra que já existe: `workspace_slack_settings.excluded_channel_ids` + `autojoin_public_channels`.

---

### Modelo conceitual

Em vez de "lista de canais a monitorar" (allowlist), uso o que já está no banco: **denylist via `excluded_channel_ids`** + flag `autojoin_public_channels`. Isso evita migration nova e mantém o classifier funcionando sem mudanças.

**Lógica final que o líder vê:**
- Se `autojoin_public_channels = true` → "monitora todos públicos, exceto os que eu excluí"
- Se `autojoin_public_channels = false` → "monitora só os canais onde já fui convidado manualmente, exceto os excluídos"

Default novo workspace: `autojoin_public_channels = true`, `excluded_channel_ids = []`.

---

### Backend — nova edge function `slack-list-channels`

Centraliza chamadas ao Slack pra evitar expor o token no frontend.

**Endpoints (POST único, action no body):**
- `action: 'list'` → retorna `[{ id, name, is_member, is_private, num_members, topic }]` paginando `conversations.list` (`types=public_channel,private_channel`, limit 200, segue cursor).
- `action: 'join'` → `conversations.join` em um channel_id (só públicos).
- `action: 'leave'` → `conversations.leave` em um channel_id.

**Auth:** valida JWT, busca `slack_connections` do workspace do usuário pra pegar `bot_access_token`.

**Resposta enriquecida:** combina dados do Slack com o `excluded_channel_ids` atual pra o frontend já renderizar o estado certo (Monitorando / Excluído / Não-membro).

---

### Frontend — `src/pages/SlackChannels.tsx`

**Layout (Bento/Creme):**
```
┌──────────────────────────────────────────────────────┐
│ ← Voltar                                             │
│                                                      │
│ Canais do Slack                                      │
│ Escolha o que o Rhitmo deve observar                 │
│                                                      │
│ ┌─ Modo geral ──────────────────────────────────┐  │
│ │ ◉ Monitorar todos os canais públicos            │  │
│ │   (recomendado — ativa captura automática)      │  │
│ │ ○ Só canais que eu convidar manualmente          │  │
│ └─────────────────────────────────────────────────┘  │
│                                                      │
│ Buscar canal: [_____________]                        │
│                                                      │
│ Canais (38)         [Todos] [Monitorando] [Privados] │
│ ┌─────────────────────────────────────────────────┐ │
│ │ # engenharia-time-joao        🟢 Monitorando    │ │
│ │ 12 membros · público        [⊘ Pausar]          │ │
│ ├─────────────────────────────────────────────────┤ │
│ │ # vendas-norte                ⊘ Excluído        │ │
│ │ 8 membros · público         [✓ Reativar]        │ │
│ ├─────────────────────────────────────────────────┤ │
│ │ 🔒 design-conf                ➕ Não sou membro │ │
│ │ 4 membros · privado    Convide @Rhitmo no Slack │ │
│ └─────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

**Componentes:**
- `SlackChannels.tsx` — página principal com toggle de modo, busca, lista
- `ChannelRow.tsx` — linha individual com estado (monitorando/excluído/privado-não-membro) e ação contextual
- `useSlackChannels.ts` — hook com fetch via `slack-list-channels` + mutations (toggleExclude, updateAutojoin)

**Estados por canal:**
| Tipo | Bot é membro? | Excluído? | UI mostra |
|---|---|---|---|
| Público | sim | não | 🟢 Monitorando · botão "Pausar" |
| Público | sim | sim | ⊘ Excluído · botão "Reativar" |
| Público | não | — | ⚪ Disponível · botão "Adicionar" (chama `join`) |
| Privado | sim | não | 🟢 Monitorando · botão "Pausar" |
| Privado | sim | sim | ⊘ Excluído · botão "Reativar" |
| Privado | não | — | 🔒 "Convide @Rhitmo no Slack" (não dá pra fazer pelo app) |

**Ações:**
- **Pausar** → adiciona ID em `excluded_channel_ids`
- **Reativar** → remove ID de `excluded_channel_ids`
- **Adicionar (público não-membro)** → chama `slack-list-channels` com `action: 'join'`
- **Toggle modo geral** → atualiza `autojoin_public_channels`

---

### Sidebar + navegação

- Adiciona item "Canais Slack" em `AppSidebar.tsx` dentro da seção de configurações (ou no menu Slack se existir).
- Link pequeno "Gerenciar canais →" no header de `/evidence` pra dar atalho.
- Rota nova em `App.tsx`: `/slack/channels` (protegida, mesma proteção do `/evidence`).

---

### Detalhes técnicos

- **Sem migration**: tudo cabe em `workspace_slack_settings` que já existe.
- **Cache**: lista de canais via React Query, `staleTime: 60s` pra não martelar Slack API.
- **Paginação interna**: `conversations.list` da edge function junta tudo antes de devolver (workspaces com >500 canais ficam ok porque o limite Slack é 1000 por página).
- **Permissão**: edge function valida que o usuário é owner ou HR admin do workspace antes de retornar/modificar.
- **Scope necessário**: `channels:join` e `channels:read` (já estão no manifest atualizado da Sprint 1, conforme aprovação anterior).

---

### Arquivos novos

- `supabase/functions/slack-list-channels/index.ts`
- `src/pages/SlackChannels.tsx`
- `src/components/slack/ChannelRow.tsx`
- `src/hooks/useSlackChannels.ts`

### Arquivos editados

- `src/App.tsx` — registra rota `/slack/channels`
- `src/components/AppSidebar.tsx` — link novo
- `src/pages/Evidence.tsx` — atalho "Gerenciar canais" no header

Pronto pra executar.