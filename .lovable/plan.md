# Hierarquia Rhitmo v2 — Empresa, Times, Líderes, Liderados

## 1. Recomendação de modelo (baseada em benchmarks)

Pesquisei como Lattice, CultureAmp, 15Five, Leapsome, Workday e BambooHR estruturam isso. **Todos seguem o mesmo padrão**:

```text
Company (1 conta) ─┬─ Department / Team ──┬─ Manager
                   │                       └─ Direct Reports
                   ├─ Department / Team ──┬─ Manager
                   │                       └─ Direct Reports
                   └─ HR Admin (transversal, vê tudo)
```

Ninguém em SaaS de people-ops cria "um workspace por head". A figura de "workspace" no mercado **é a empresa**. Times/departamentos vivem dentro dela. Heads (Matheus COO, Douglas CTO) são **líderes de times**, não donos de workspaces separados.

### Decisão proposta: **Modelo A — 1 Workspace = 1 Empresa**

Aplicado à Faster ficaria:

```text
Workspace: Faster
├─ Owner: Vitor (CEO) e Matheus (COO - matheus.magalhaes@fstr.co) — vê tudo, se precisar use botões para separar os caps de matheus como líder e como Owner
├─ HR Admin: Guto — cadastra e mantém
└─ Times:
   ├─ Operações      → Líder: Matheus  → Gabi, Gui, Laís, Giovanna, Yas
   ├─ Tecnologia     → Líder: Douglas  → Airton, Aristóteles, Brunna, Rodrigo, Wenderson
   ├─ Marketing      → Líder: Jesse    → (liderados)
   ├─ Vendas         → Líder: Caio     → (liderados)
   ├─ RH             → Líder: Guto     → (liderados)
   └─ C-Level        → Líder: Vitor    → Matheus, Douglas, Jesse, Caio, Guto
```

**Por quê:**

- Vitor vê a empresa inteira sem precisar ser invitee em N workspaces.
- Guto cadastra uma vez, num lugar só.
- Matheus continua vendo só os 5 dele (RLS por `teams.leader_user_id` já garante).
- Billing fica simples (1 assinatura por empresa).
- Acaba a confusão atual de "Faster", "Faster Ops", "Workspace de Douglas".

### O que muda vs. hoje


| Hoje                                                              | Depois                                                           |
| ----------------------------------------------------------------- | ---------------------------------------------------------------- |
| 3 workspaces da Faster (Faster, Faster Ops, Workspace de Douglas) | 1 workspace "Faster"                                             |
| Matheus é Owner de "Faster Ops"                                   | Matheus é Líder do time "Operações" dentro de "Faster"           |
| Douglas é Owner de "Workspace de Douglas"                         | Douglas é Líder do time "Tecnologia" dentro de "Faster"          |
| Vitor não enxerga nada cross-workspace                            | Vitor é Owner da "Faster" e enxerga tudo                         |
| Times órfãos ("Sem time", "Lideratos Vitor")                      | Estrutura validada (todo time tem líder, todo liderado tem time) |


## 2. Fluxo de cadastro novo: "Onboarding de Empresa"

Resposta sua: **HR Admin estrutura, Líder completa**. Implementação:

### Etapa 1 — HR Admin (Guto) cria a empresa (Wizard `/admin/empresas/nova`)

1. Nome da empresa + segmento.
2. Definir Owner (CEO/Founder) — campo único.
3. Adicionar Heads/Líderes — lista simples: nome, email, time que ele lidera.
  - Cada linha cria 1 time + atribui o líder.
4. Revisão visual em árvore antes de salvar.
5. Confirma → cria workspace + times + dispara convites para Owner e Líderes.

### Etapa 2 — Cada Líder recebe convite e completa o time dele

- Email para Matheus: "Você foi adicionado como líder do time Operações na Faster. Adicione seus liderados."
- Ele entra em `/lider/pessoas` → botão "Adicionar liderado" (já existe, individual).
- Ou Guto faz por ele via bulk-onboard direcionado a um time específico.

### Etapa 3 — Liderado recebe convite e faz onboarding (já existe)

## 3. Painel Admin reformulado

Três telas, todas com filtro de empresa fixo no topo:

### 3.1 `/admin` → **Visão Geral** (já existe, ajustes)

- KPIs: empresas, líderes únicos, liderados, % de cadastros completos.
- Lista de empresas com health-score: ✅ tudo certo / ⚠️ pendências (times sem líder, líderes sem liderados, liderados sem responder pesquisa).

### 3.2 `/admin/empresas/:id` → **Organograma da Empresa** (nova)

- Layout em árvore tipo o organograma que você mandou (Vitor no topo, heads em segunda linha, liderados abaixo).
- Cada nó mostra: avatar, nome, papel, status (ativo, convite pendente, pesquisa Rhitmo Sync pendente).
- Ações inline: editar, mover de time, remover, reenviar convite.
- Badge de alerta em cada nó com pendência.
- Botão "+ Adicionar time" e "+ Adicionar pessoa".

### 3.3 `/admin/pessoas` → **Lista plana global** (existe, simplificar)

- Mantém a tabela atual mas:
  - Filtros mais claros: Empresa, Papel, Status de cadastro, Pesquisa Rhitmo Sync (respondeu/pendente).
  - Coluna nova **"O que falta"**: chips tipo "Não respondeu pesquisa", "Sem time", "Convite expirou".
  - Bulk actions: reenviar convite, mover de time, arquivar.

### 3.4 `/admin/workspaces` (atual) → **Renomear para "Empresas"**

- Cards de empresa (não accordion gigante).
- Cada card: nome, owner, # times, # liderados, health-score, botão "Abrir organograma".

## 4. Migração dos dados existentes

Faster tem hoje 3 workspaces. Antes de qualquer fix de UI, precisamos consolidar:

1. **Auditoria** (read-only): listar todos workspaces da Faster, contagem de times, liderados, líderes.
2. **Plano de merge** (eu apresento depois da auditoria — você aprova caso a caso):
  - Renomear "Faster" → manter como canônico.
  - Mover times de "Faster Ops" e "Workspace de Douglas" para "Faster" (mantendo `leader_user_id`).
  - Limpar times órfãos ("Sem time", duplicados).
  - Reatribuir `owner_id = vitor@faster.co` e `hr_admin_ids = [guto@faster.co]`.
3. **Arquivar** os 2 workspaces vazios após o merge.

Tudo isso por migration auditável, sem perder histórico (feedbacks/1:1s ficam vinculados aos `team_members` que migrarem junto).

## 5. Mudanças técnicas (detalhe para a build)

- **Schema**: nenhum breaking change. Modelo já suporta — só estamos usando errado. Eventualmente adicionar `teams.department` (label opcional pra organograma agrupar).
- **Wizard novo**: `src/pages/admin/NewCompanyWizard.tsx` + edge `create-company` (cria workspace + N times + N convites de líder em 1 transação).
- **Organograma**: `src/pages/admin/CompanyOrgChart.tsx` usando React Flow ou árvore CSS simples.
- **Admin Workspaces → Empresas**: refactor `AdminWorkspaces.tsx` para grid de cards.
- **Pessoas**: nova coluna "O que falta" via RPC `get_member_pending_actions(member_id)`.
- **Health-check**: RPC `get_company_health(workspace_id)` retornando `{teams_without_leader, members_without_team, members_without_survey, invites_expired}`.

## 6. Entrega faseada sugerida


| Fase                               | Escopo                                                | Resultado visível                                               |
| ---------------------------------- | ----------------------------------------------------- | --------------------------------------------------------------- |
| **1. Auditoria + Merge da Faster** | Migration de consolidação                             | Vitor vira Owner, 1 workspace só, Matheus continua vendo seus 5 |
| **2. Admin reformulado**           | Cards de Empresa + Organograma + coluna "O que falta" | Você consegue diagnosticar qualquer cliente em 1 tela           |
| **3. Wizard de Empresa Nova**      | `/admin/empresas/nova` + edge `create-company`        | Guto cadastra um cliente novo em 5 minutos sem confusão         |
| **4. Health-score por empresa**    | RPC + badges                                          | Onboarding incompleto vira alerta proativo                      |


---

**Próximo passo:** quer que eu comece pela **Fase 1 (auditoria + merge da Faster)** para destravar o problema imediato, e depois sigo para as fases 2-4? Ou prefere que eu já entregue o admin reformulado (Fase 2) em paralelo, já desenhado para o modelo novo?