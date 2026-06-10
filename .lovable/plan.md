## Diagnóstico (UX + benchmark)

Olhando o painel atual e comparando com benchmarks de super admin (Linear, Stripe Dashboard, Vercel, Notion Admin, WorkOS), encontramos 4 problemas estruturais:

1. **Empresas em cards centralizados** — bom para 5 empresas, ruim para 50+. Benchmarks usam **lista densa/tabela** como visão primária (escaneabilidade, ordenação, comparação de números). Cards viram "modo opcional" ou ficham embaixo da linha clicada.
2. **Botão "Organograma" engana** — ele não abre um organograma; só pula para a aba "O que falta" filtrada pela empresa. Isso quebra expectativa e não tem caminho de volta óbvio.
3. **Convites espalhados** — "Convidar líder" mora em Pessoas, "Convidar HR Admin" mora em Empresas (junto com lista de HR Admins ativos). Super admin não deveria caçar onde convidar cada papel.
4. **Governança escondida em Empresas** — "HR Admins ativos" não pertence ao escopo da aba Empresas; é uma visão de **pessoas com privilégio elevado**, o que em Stripe/Vercel/WorkOS vive em "Team" / "Members" / "Access".

## O que muda

### Sidebar (mantém 3 abas, papéis ficam claros)

```text
Visão geral   → KPIs + alertas + waitlist (igual hoje)
Pessoas       → TODAS as pessoas + TODOS os convites + governança (HR Admins, Super Admins)
Empresas      → Lista das empresas com saúde e pendências
Logs (rodapé) → igual hoje
```

### Pessoas (vira o centro de identidade)

Estrutura nova em 3 sub-abas:

- **Usuários** (tabela atual, sem mudança de dados) — segue com filtros, export CSV, edit, impersonate.
- **Convites** — um único formulário com seletor de **papel**:
  - Líder (Owner de novo workspace, planos Pulse/Pro/Business) — fluxo atual `admin-invite-user`
  - HR Admin (workspace existente) — fluxo atual `admin-invite-user` com `role: 'hr_admin'`
  - (Liderado fica fora; é convidado pelo líder dentro do produto)
  Lista de convites pendentes/enviados embaixo, com reenviar / revogar.
- **Acesso & Governança** — quem tem privilégio elevado:
  - HR Admins ativos por workspace (vem do `HRAdminsListCard`)
  - Super Admins (listagem read-only de `user_roles` com `app_role='super_admin'`)
  - Última atividade / último login quando disponível

Remove os cards "Convidar HR Admin" e "HR Admins ativos" do rodapé de Empresas.

### Empresas (vira lista densa, sem promessa falsa de organograma)

- Visão padrão: **tabela** com colunas: Empresa · Owner · Plano · Segmento · Pessoas · Times · Sync · Pendências · Status · Ações. Linha clicável abre **drawer lateral** com o detalhe completo da empresa (owner, times, pendências, ações de suspender/editar segmento/cliente). Toggle "Cards / Lista" no topo para quem prefere a visão atual.
- Sub-abas reduzidas para **Empresas** e **O que falta** (renomeia "Cards" para "Empresas" porque a visão não é mais "só cards").
- Botão "Organograma" some. No lugar:
  - "Ver detalhes" → abre o drawer lateral da empresa.
  - "Ver pendências" → leva para "O que falta" já filtrado por aquela empresa (comportamento de hoje, mas com label honesto).
- Drawer e "O que falta" ganham **breadcrumb / botão "Voltar para empresas"** explícito, resolvendo a queixa de não ter como voltar.

### Visão geral (sem mudança de escopo)

Mantém KPIs, alerta de workspaces inativos e waitlist. Só adiciona um link de atalho "Convidar líder/HR Admin" → leva pra Pessoas › Convites.

## Por que essa divisão (benchmark)

- **Stripe Dashboard / Vercel Team / WorkOS Admin** colocam *quem* (pessoas, papéis, convites, governança) numa única seção e *o quê* (organizações/projetos/workspaces) noutra. Convidar é sempre uma ação de "Pessoas".
- **Linear Admin** usa tabela densa para listas longas e drawer para detalhe; cards ficam reservados para dashboards executivos.
- **Notion Admin** separa "Members" (identidade/acesso) de "Workspaces" (entidade) — exatamente a divisão proposta aqui.

## Detalhes técnicos

- `Admin.tsx`: nenhuma mudança de rota; tipos `AdminTab` continuam `overview | users | workspaces`.
- `AdminUsers.tsx`:
  - Envolver conteúdo atual em `<Tabs>` com 3 sub-abas (`usuarios`, `convites`, `acesso`).
  - Mover o dialog "Convidar líder" atual para a sub-aba "Convites" como formulário inline.
  - Mover `<HRAdminInviteCard />` e `<HRAdminsListCard />` (de `AdminAccessParts.tsx`) para a sub-aba "Convites" / "Acesso & Governança" respectivamente.
  - Nova query super admins: `supabase.from('user_roles').select('user_id').eq('role','super_admin')` cruzando com `get_all_users_with_metadata` (read-only, sem mutação).
- `AdminWorkspaces.tsx`:
  - Remove o bloco final com `<HRAdminInviteCard />` e `<HRAdminsListCard />`.
  - Sub-aba "Cards" passa a renderizar `CompaniesTable` (novo) por padrão, com toggle `Tabela | Cards` controlando exibição. `CompanyCardsGrid` continua existindo, só deixa de ser o default.
  - Novo `CompanyDetailDrawer` (Sheet shadcn): recebe `workspaceId`, mostra cabeçalho + KPIs do `healthByWorkspace` + lista de times + atalho "Ver pendências".
  - Botão "Organograma" no card vira "Ver detalhes" (abre drawer); ação secundária "Pendências" usa o fluxo atual de pulo para a sub-aba "O que falta".
  - "O que falta" ganha header com `← Voltar para empresas` quando há `workspaceFilter` aplicado.
- Sem migration de banco. Sem mudança de RLS. Sem mudança em edge functions.

## Arquivos

- `src/components/admin/AdminUsers.tsx` (refator: 3 sub-abas, importa cards de governança).
- `src/components/admin/AdminWorkspaces.tsx` (remove bloco HR Admin do rodapé, adiciona toggle Tabela/Cards, integra drawer e breadcrumb).
- `src/components/admin/companies/CompaniesTable.tsx` (novo).
- `src/components/admin/companies/CompanyDetailDrawer.tsx` (novo).
- `src/components/admin/companies/PendingChecklistTable.tsx` (acrescenta breadcrumb "Voltar").
- `src/components/admin/AdminAccessParts.tsx` (sem mudança de API; só passa a ser consumido em outra aba).

## Fora de escopo (deixar para depois, se quiser)

- Organograma de verdade (visualização hierárquica navegável da empresa).
- Audit log por usuário (quem mudou o quê e quando).
- Bulk actions na tabela de empresas (suspender várias, mudar segmento em massa).
