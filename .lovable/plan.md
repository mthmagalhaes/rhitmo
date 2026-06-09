
# Ajustes no painel HR Admin

Pacote de melhorias **só na camada de apresentação** (frontend) das telas `/hr/teams` e `/hr/members`. Nenhuma RLS, migration ou edge function é alterada — apenas reaproveitamos o que já existe (`admin-invite-user`, `send-disc-invite`, `get_hr_all_members`, `MemberAdminSheet.handleResendSync`).

---

## 1. Sidebar: ocultar "Frameworks"

- `src/lib/navigation.ts`: remover o item `framework` do array de nav do HR Admin. A rota `/hr/competency-framework` continua existindo (acessível por link direto), só some do menu.
- Nada mais muda — código de Competency Framework fica intacto para quando a gente retomar.

## 2. `/hr/teams` — Times e Líderes

Sem mexer no RPC `get_hr_leaders_overview`. Só ajustes visuais e de copy em `src/pages/HRTeams.tsx`:

- **Renomear "Sem feedback" → "Sem registros"** no badge de atividade do líder (label fica mais fiel: o líder não cadastrou anotações/evidências do time ainda). O badge vermelho de inatividade longa (`60d inativo`) continua igual.
- **Tooltip no ícone ⚠️** ao lado do nome do líder: "Este líder está há 60+ dias sem registrar feedbacks ou evidências do time."
- **Tooltip no badge "Sync ✓"** dentro do Sheet do time: "Este liderado já preencheu a pesquisa Rhitmo Sync (cronotipo, estilo de feedback, motivadores)."
- **Mostrar `Pendente` em cinza** ao lado de quem não tem Sync, em vez de só omitir — fica explícito que existe um estado.

## 3. `/hr/members` — Liderados (mudança maior)

Tudo em `src/pages/HRMembers.tsx`, reaproveitando RPC e componentes existentes.

### 3.1 Layout em tabela com coluna "Time"
- Trocar a lista de Cards por uma **tabela** (`<Table>` shadcn) com colunas: **Liderado · E-mail · Time · Líder · Status · Atividade · Ações**.
- A coluna **Time** vem de `team_name` no retorno do RPC `get_hr_all_members` (já existe; verificar; se faltar, pegar via lazy fetch igual já fazemos com `team_id`). 
- Mantém densidade Linear/Notion: avatar pequeno + duas linhas só na coluna principal.

### 3.2 Filtros de pendência
Adicionar um `Select` "Pendência" com:
- Todos
- Sem cadastro aceito (`invite_status !== 'accepted'`)
- Sem feedback (30d) (`days_since_last_feedback > 30`)
- Sem PDI (`pdi_count === 0`)
- Sem Rhitmo Sync (`has_sync === false`)

Filtros aplicados **no client** sobre o resultado do RPC atual (paginação fica como está). Filtro de Time também: dropdown usando a lista distinta de `team_name`.

### 3.3 Seleção em lote + ação
- Checkbox por linha + checkbox "selecionar todos" no header (escopo: linhas visíveis após filtros).
- Quando `selectedIds.length > 0`, aparece uma **barra fixa no topo da tabela** com: `N selecionados · [Reenviar convite] [Reenviar Rhitmo Sync] [Limpar]`.
- "Reenviar convite": loop chamando `admin-invite-user` por e-mail (já é o que faz o `DispatchInvitesDialog`, mas escopado à seleção).
- "Reenviar Rhitmo Sync": loop chamando `send-disc-invite` (mesma edge usada em `MemberAdminSheet.handleResendSync`), passando `member_id` + `email`. Reaproveitamos a mesma confirmação visual ("substitui o perfil atual…") em um `AlertDialog` antes do disparo.

### 3.4 Reenviar Rhitmo Sync individual
- No menu kebab da linha + na visão de detalhe (item 3.5), adicionar **"Reenviar pesquisa Rhitmo Sync"** quando `has_sync === false` (ou também quando preenchido, com aviso de sobrescrita).
- Reaproveita a lógica de `handleResendSync` do `MemberAdminSheet` (extrair para hook `useResendRhitmoSync(memberId, email)` em `src/hooks/` para usar nos dois lugares — líder e HR).

### 3.5 Fix do "Perfil não encontrado"
Sintoma reportado: ao clicar em "Ver Perfil", o sheet abre vazio com "Perfil não encontrado".
- Causa provável: `get_hr_member_profile` retornou `null` no primeiro hit (race / cache). Vamos:
  1. Garantir `enabled: open && !!memberId && !!workspaceId` (já existe — manter).
  2. Adicionar `retry: 1` e, no estado `!profile && !isLoading`, mostrar **um botão "Tentar novamente"** que faz `qc.invalidateQueries`.
  3. Logar com `console.warn` o `memberId` e o `workspaceId` quando vier `null` para abrirmos ticket de support se o caso persistir após reload.
- Não vamos mexer no RPC nesta sprint — apenas garantir UX resiliente e instrumentação.

### 3.6 Botão "Lembrar pendentes" do header
- Manter, mas **abrir o filtro "Sem cadastro aceito" automaticamente antes** (e rolar pro topo da tabela) em vez de só disparar tudo. Assim Matheus/Guto veem quem vai receber antes de confirmar. O `DispatchInvitesDialog` continua sendo a confirmação final.

---

## Detalhes técnicos

- **Sem migrations, sem edge functions novas.** Tudo client-side.
- **Hook novo:** `src/hooks/useResendRhitmoSync.ts` — extraído de `MemberAdminSheet`, retorna `{ resend, isPending }`. Substitui chamada local nos dois consumidores.
- **Reuso:** `Table`, `Checkbox`, `Select`, `AlertDialog`, `DropdownMenu` (todos já no shadcn do projeto).
- **Paginação:** mantém os 20/página do RPC. Filtros client agem sobre a página atual; adicionar nota no rodapé "Filtros aplicados nesta página".
- **Memory hit:** `mem://features/people/member-admin-sheet-rhitmo-sync` já documenta o padrão de reenvio — vamos seguir a mesma copy de aviso.

## Fora de escopo
- Mudar `get_hr_all_members` para incluir mais campos (faremos só se o `team_name` não vier).
- Repensar a IA de Frameworks.
- Mudar a estrutura de RLS ou auth.
- Tabela cross-workspace.
