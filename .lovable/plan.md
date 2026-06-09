
# Refinamentos no painel HR Admin → Liderados

Tudo client-side em `src/pages/HRMembers.tsx` e `src/components/hr/MemberProfileSheet.tsx`. Sem migrations, sem edge functions novas.

---

## 1. Sheet "Ver perfil" — eliminar "Perfil não encontrado" e enriquecer dados

**Investigação do bug:** o RPC `get_hr_member_profile(_workspace_id, _member_id)` retorna 0 linhas se o `workspaceId` injetado pelo `useHRAdmin()` ainda não resolveu (`''`) no momento em que o sheet abre. Hoje o `enabled` já checa `!!workspaceId`, mas a query pode ter rodado uma vez antes do contexto popular, ficar em cache como `null` e nunca refazer.

**Correções:**
- Passar `selectedMemberId` para o sheet **só quando ambos** `memberId` e `workspaceId` estão prontos; resetar `selectedMemberId` no `onOpenChange(false)` para invalidar cache do react-query (`queryKey` único por par).
- Trocar `retry: 1` por `retry: 2` + `retryDelay: 400ms` para cobrir a janela real do RPC.
- Quando `!profile && !isLoading`, em vez do estado "Perfil não encontrado" como destino final, **fazer um refetch automático uma vez** e só mostrar a mensagem se ainda assim vier vazio — com botão "Tentar novamente" mantido como fallback manual.
- Log estruturado (`console.warn`) já existe; manter.

**Enriquecimento do perfil (campos novos no header e cards):**
O RPC já devolve `team_name`, `leader_name`, `invite_status`, `linked_user_id`, `feedback_count`, `last_feedback_date`, `pdi_count`, `has_pdi`, `chronotype`, `feedback_style`, `motivadores`, `user_manual`, `skills_data`, `created_at`. Vamos usar tudo + agregar **sem novas chamadas RPC** o que dá pra puxar direto de `feedbacks`/`one_on_ones`/`development_plans` num único `useQuery` paralelo dentro do sheet (HR Admin já tem RLS pra ler):

- **Card "Atividade recente"** (novo): nº de feedbacks últimos 30d, nº de 1:1s últimos 90d, data da última 1:1.
- **Header chips**: data do último feedback (relativa), tempo de casa (`created_at`), status do convite com cor.
- **Card "Líder atual"**: nome + e-mail + link "Ver time" (apenas exibição).
- **Cards já existentes** (Feedbacks, PDI, Rhitmo Sync, Skills) ficam.

Remover **card "PDI"** da grid superior (decisão do item 2 abaixo) — substituir pelo novo card "Atividade recente".

## 2. Remover PDI da listagem

Decisão de produto: PDI é do liderado, não enriquece a visão de HR sobre engajamento do líder.

- **Filtro à direita "PDI" (Todos / Com PDI / Sem PDI)** → remover por completo. Limpar `pdiFilter` state e parâmetro `_has_pdi` da chamada do RPC (passar sempre `null`).
- **Filtro de pendência** → remover a opção `Sem PDI` do dropdown.
- **Coluna Atividade** → remover o badge `Sem PDI`. Mantém `Ativo / Xd atrás / Sem feedback` + `Sync pendente`.
- **Sheet de perfil** → remover o card PDI da grid superior (substituído por "Atividade recente", conforme item 1).
- **Não removemos do banco/RPC** — só paramos de exibir. `pdi_count` continua vindo, mas é ignorado na UI.

## 3. Filtro "Pendência" — renomear e simplificar

No `Select` da direita do filtro de pendência:
- Trigger: trocar placeholder/valor default de "Sem filtro de pendência" para **"Pendência"**.
- Primeira opção (`value="all"`): renomear "Sem filtro de pendência" → **"Todas"**.
- Remover `Sem PDI` (item 2).
- Opções finais: Todas · Cadastro pendente · Sem feedback (30d+) · Sem Rhitmo Sync.

## 4. Ações em lote sensíveis ao contexto da seleção

Hoje a barra "N selecionados" sempre mostra `Reenviar convite` e `Reenviar Rhitmo Sync`. Isso permite mandar convite pra alguém já ativo. Vamos calcular dois subconjuntos a partir de `selectedIds`:

- `pendingInviteIds` = selecionados com `invite_status !== 'accepted'`.
- `pendingSyncIds` = selecionados com `has_sync === false`.

Regras de exibição dos botões:
- **Reenviar convite** só aparece se `pendingInviteIds.length > 0`. Label vira `Reenviar convite (N)`. Ao clicar, dispara só para esses IDs (já é o filtro atual em `handleBulkResendInvite`, mas hoje o botão não comunicava isso).
- **Reenviar Rhitmo Sync** só aparece se `pendingSyncIds.length > 0`. Label `Reenviar Rhitmo Sync (N)`. `handleBulkResendSyncConfirmed` passa a filtrar pelos `pendingSyncIds` em vez de todos os selecionados. Texto do `AlertDialog` ajustado pra refletir o N efetivo.
- Quando a seleção é 100% homogênea (ex.: 2 ativos sem sync), só aparece o botão relevante.
- Quando nenhum dos dois se aplica (ex.: 2 vinculados com sync), mostrar **um aviso inline** discreto: "Nenhuma ação em lote disponível para esta seleção" + botão "Limpar".

## Detalhes técnicos

- Arquivos editados: `src/pages/HRMembers.tsx`, `src/components/hr/MemberProfileSheet.tsx`.
- Sem mudança em RPCs, edge functions, tabelas, RLS, navegação ou outros papéis (líder/liderado intactos).
- React Query keys: nova query do sheet `['hr-member-activity', workspaceId, memberId]` para contagem de 1:1s/feedbacks recentes (lê `feedbacks` e `one_on_ones` direto via RLS de HR Admin).
- Acessibilidade: botões em lote mantêm `aria-label` descritivo com o N.

## Fora de escopo
- Mudar o RPC `get_hr_member_profile` (só vamos arrancar mais dados se realmente faltar; por ora ele já entrega o suficiente).
- Repensar PDI fora dessa tela (continua existindo em `/lider/...` e no portal do liderado).
- Remover Frameworks (já feito em sprint anterior).
- Mexer em `/hr/teams`.
