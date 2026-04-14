

## Análise Profunda: Painel Admin — Duplicações, Gaps e Recomendações

### Duplicações Encontradas

| Dado/Funcionalidade | Onde aparece | Problema |
|---|---|---|
| **Tabela "Todos os Usuários"** | Visão Geral (seção inferior) + Lista de Usuários (aba inteira) | A Overview tem uma tabela completa de usuários com plano, status, toggle — a aba "Lista de Usuários" repete isso com a mesma query `get_all_users_with_metadata` / `get_user_caps` |
| **Toggle ativo/suspenso de workspace** | Visão Geral + Lista de Usuários + Estrutura | 3 locais diferentes para a mesma ação `toggleWorkspaceStatus` |
| **Waitlist + Convite** | Visão Geral (Lista de Espera + Invite Dialog) | OK, exclusivo desta aba |
| **Stats (Workspaces, Membros)** | Visão Geral (4 cards) + Estrutura (3 cards) | Estrutura repete contagem de workspaces/membros |
| **Reset de Senha** | Suporte & Edição (seção dedicada + busca universal) | Reset aparece tanto na busca universal quanto na lista fixa abaixo — redundante dentro da mesma aba |
| **Busca/Edição/Delete de Membros** | Suporte & Edição + Estrutura | Ambas permitem editar/deletar membros com dialogs similares |
| **Query `admin-workspaces`** | Visão Geral, Lista de Usuários, Gestão de Acessos, Estrutura | 4 abas fazem a mesma query independentemente |

### Gaps — O que falta para o "God's Eye"

1. **Activity Log / Audit Trail** — Não há log de ações: quem logou, quando, última atividade. Impossível saber "quando o líder X usou a plataforma pela última vez"
2. **Health Score por Workspace** — Não há indicador de "saúde": workspaces parados, sem feedbacks recentes, sem 1:1s
3. **Métricas de Uso/Engajamento** — Faltam: DAU/WAU, feedbacks por semana, tempo médio entre 1:1s, membros sem interação há X dias
4. **Alertas/Anomalias** — Sem sistema de "atenção necessária": workspace sem atividade há 30 dias, membro sem feedback há 60 dias, líder que nunca fez review
5. **Billing/Revenue Overview** — Sem visão de MRR, churn, planos por tier, receita por workspace
6. **Edge Function Monitoring** — Sem visibilidade de erros em funções, latência, uso de AI credits
7. **Email Delivery Status** — Sem painel de emails enviados, bounces, supressões

### Plano de Reestruturação Proposto

```text
ANTES (6 abas):                    DEPOIS (5 abas):
┌─────────────────────┐            ┌─────────────────────┐
│ 1. Visão Geral      │ ──────►   │ 1. Command Center   │ ← Stats + Health + Alerts + Activity
│ 2. Suporte & Edição │ ──────►   │ 2. Usuários         │ ← Merge Users + Support (busca, edit, impersonate, reset, delete)
│ 3. Data Export       │ ──────►   │ 3. Estrutura        │ ← Mesmo (tree view CRUD)
│ 4. Lista de Usuários │           │ 4. Acessos & Export │ ← Merge Access + Export
│ 5. Gestão de Acessos │           │ 5. Inteligência     │ ← Health scores, engagement, alertas, billing
│ 6. Estrutura         │           └─────────────────────┘
└─────────────────────┘
```

#### Detalhes por aba:

**1. Command Center (nova Overview)**
- Big numbers: Workspaces, Usuários auth, Liderados, Feedbacks, Reviews, Planos pagos
- **Waitlist/Leads** (mantém)
- **Alertas**: cards vermelhos/amarelos com "3 workspaces inativos há 30+ dias", "5 membros sem feedback há 60 dias"
- **Atividade Recente**: últimos logins, últimos feedbacks criados, últimos reviews compartilhados (query simples)
- Remove tabela de usuários duplicada

**2. Usuários (merge Overview users + AdminUsers + AdminSupport)**
- Tabela unificada com `get_user_caps` (badges multi-role)
- Ações inline: Impersonate, Toggle ativo, Reset senha, Editar, Deletar
- Busca universal integrada (não precisa ser aba separada)
- Remove Suporte como aba isolada

**3. Estrutura** — mantém igual (tree view)

**4. Acessos & Export** — merge AdminAccess + AdminExport
- Seção superior: Convite HR Admin + lista de HR Admins ativos
- Seção inferior: Botões de export CSV

**5. Inteligência (novo)**
- Health Score por workspace (baseado em: feedbacks/semana, % membros com review, dias desde último sync)
- Engagement heatmap (atividade por dia/semana)
- Billing summary: MRR simulado por tier
- "Workspaces em risco" (sem atividade recente)

### Correções visuais
- **AdminAccess** usa `bg-slate-900` hardcoded (dark mode forçado), quebrando o tema — deve usar `bg-background`
- **AdminUsers** usa `boringavatars.com` para avatares (deveria usar os novos CustomAvatar)

### Arquivos modificados

| Arquivo | Mudança |
|---------|---------|
| `AdminOverview.tsx` | Refatorar para Command Center: remover tabela de usuários, adicionar alertas e atividade recente |
| `AdminSupport.tsx` | Eliminar — mover busca/edit/reset para AdminUsers |
| `AdminUsers.tsx` | Absorver funcionalidades do Support; usar CustomAvatar; unificar ações |
| `AdminAccess.tsx` | Corrigir tema dark hardcoded; absorver Export |
| `AdminExport.tsx` | Eliminar — mover para AdminAccess |
| `AdminStructure.tsx` | Sem mudanças |
| `Admin.tsx` | Atualizar tabs de 6 para 5 |
| `AdminLayout.tsx` | Atualizar sidebar com novas 5 abas |
| **Novo:** `AdminIntelligence.tsx` | Health scores, engagement, billing summary |

