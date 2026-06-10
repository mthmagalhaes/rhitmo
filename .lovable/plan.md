Nota de escopo: os screenshots e o caminho `/admin` são do **Super Admin (God's Eye)** — não do papel HR Admin do produto (esse vive em `/lider/pessoas` aba RH). Toda a simplificação abaixo é nesse painel. Se você quis dizer "HR Admin" dentro do produto, me avisa que eu refaço o plano.

## Diagnóstico do que existe hoje

**Visão geral** — KPIs (Workspaces, Usuários Auth, Feedbacks, Reviews, Assinaturas, Leads) + alerta de inativos + Funil + Coortes + Waitlist.

**Pessoas** — Tabela `AdminUsers` (854 linhas) com 5 filtros (busca, papel, status, workspace, segmento), badges de segmento, ordenação, edit dialog, reset senha, impersonar, excluir, convidar líder, exportar CSV.

**Workspaces** — `AdminWorkspaces` com **5 sub-abas**: Cards, Organograma, O que falta, Acessos, Estrutura (legado) + filtros próprios + Nova empresa + cards de convite HR no fim da página.

**Sistema** — `AdminIntelligence` (MRR, Trial vencendo, conv. trial→pago, distribuição por plano, saúde média, em risco, assinaturas ativas, feedbacks/semana, health score por workspace) + `DataExportCard` + `AdminObservability` (logs de edge functions).

## Onde está a poluição

1. **Sobreposição entre abas**: "Saúde Média / Em Risco / Health Score por Workspace" (Sistema) repete o "7 workspaces sem atividade" (Visão geral) e a coluna de pendências em Workspaces > "O que falta". Três telas dizem a mesma coisa.
2. **MRR/Trial/Conv./Assinaturas zerados**: KPIs financeiros estão sempre em R$ 0 enquanto o Stripe não está plugado de verdade — ocupam o topo de Sistema sem entregar valor.
3. **5 sub-abas em Workspaces** quando 90% do uso é Cards + "O que falta". Organograma duplica `/lider/pessoas` (via impersonation). "Estrutura (legado)" são 886 linhas mortas.
4. **Pessoas com 5 filtros + segmento + ordenação** quando o uso real é "achar fulano e impersonar/resetar senha". Badges de segmento (Beta/Pago/Trial/Interno/Teste) também aparecem em Workspaces.
5. **Funil + Coortes em Visão geral** com "Dados insuficientes" — ruído enquanto não há volume.

## Proposta — 3 abas, foco operacional

```text
Sidebar:
  ▸ Início    (antes "Visão geral")
  ▸ Empresas  (antes "Workspaces")
  ▸ Pessoas
  ▸ [removido] Sistema
```

### 1. Início (era "Visão geral")
- Mantém: 4 KPI cards (Workspaces, Usuários Auth, Feedbacks 30d, Leads) — corta Reviews e Assinaturas (zero perpétuo).
- Mantém: alerta "N workspaces sem atividade 30+ dias" com botão direto para a lista filtrada em Empresas.
- Mantém: `WaitlistTable` (leads acionáveis).
- **Remove**: Funil de Conversão, Coortes de Ativação (voltam quando houver volume — código preservado em `_archived/`).

### 2. Empresas (era "Workspaces")
- Reduz de 5 para **2 sub-abas**: **Cards** e **O que falta**.
- **Remove sub-abas**: Organograma (usa impersonation para ver detalhe real), Acessos (move o auditor para um sheet dentro do CompanyCard), Estrutura (legado) (deleta `AdminStructure.tsx`, 886 linhas).
- Mantém: filtros (busca, segmento, status), botão "Nova empresa", cards de convite HR no rodapé.

### 3. Pessoas
- Mantém tabela e ações (impersonar, reset, excluir, editar, convidar líder, exportar CSV).
- Reduz filtros: **busca + papel + status** (remove "Todos workspaces" e "segmento" do topo — segmento já vive no card da empresa; workspace é nicho).
- Mantém badges de papel na linha; remove badges contadoras de segmento no topo (Beta:32 / Pago:0…) — informação repetida em Empresas.

### 4. Sistema → desmontado
- `AdminIntelligence` (Saúde/Health Score): **deleta** — substituído pela coluna "pendências" já existente em Empresas > Cards.
- `AdminObservability` (logs edge functions): **move** para rota oculta `/admin/logs` (mesma guard de super_admin), acessível por link direto/Cmd+K, não na sidebar.
- `DataExportCard`: **move** para o rodapé de Pessoas (é onde o export faz sentido).
- KPIs financeiros (MRR/Trial/Conv./Assinaturas): **removidos** até Stripe estar plugado de verdade.

## Resultado esperado
- Sidebar de 4 → **3 itens** (+ rota oculta para logs).
- Sub-abas de Empresas: 5 → **2**.
- Filtros em Pessoas: 5 → **3**.
- Código deletado: `AdminStructure.tsx` (886), `AdminIntelligence.tsx` (310), `RevenueOverview.tsx` (232), `FunnelCard.tsx` (143), `ActivationCohorts.tsx` (125), `CohortDrilldownSheet.tsx` (135), `CompanyOrgChart.tsx` (159) — ~2k linhas a menos.
- Nada que você usa hoje some: impersonar, reset senha, convidar líder, ver pendências, waitlist, observability — todos continuam acessíveis.

## Detalhes técnicos
- Renomear `AdminTab` type: `'overview' | 'users' | 'workspaces' | 'system'` → `'home' | 'companies' | 'people'`.
- `Admin.tsx`: remover branch `system`; adicionar rota interna `/admin/logs` montando `AdminObservability` direto.
- `AdminLayout.tsx`: atualizar nav items (remover "Sistema").
- `AdminOverview.tsx`: remover `<FunnelCard />` e `<ActivationCohorts />`; ajustar `StatsGrid` para 4 cards.
- `AdminWorkspaces.tsx`: remover `TabsTrigger` de orgchart/access/legacy; mover `WorkspaceAccessAudit` para sheet acionado pelo CompanyCard (botão "Acessos").
- `AdminUsers.tsx`: remover `workspaceFilter`, `segmentFilter` e os counters de segmento no topo; mover `DataExportCard` para o rodapé do componente.
- Deletar arquivos listados acima e seus imports.

## Riscos
- Quem usar a aba "Estrutura (legado)" perde acesso — pelo nome, já é descontinuada.
- Logs viram link "escondido" — adicionar atalho no Cmd+K se você usa com frequência.

Aprova? Se sim, executo na ordem: (1) Início, (2) Empresas, (3) Pessoas, (4) deletar Sistema + arquivos órfãos.