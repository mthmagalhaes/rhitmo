## Diagnóstico — por que o Guto trava nas 3 telas

Guto é **HR Admin** de Faster Ops (não Super Admin). Os 3 caminhos foram escritos como se "admin = super_admin" e quebram exatamente nesse ponto:

| Tela | Erro real | Causa raiz |
|---|---|---|
| **Novo Time → Convidar novo líder** | `Edge Function returned a non-2xx` | `admin-invite-user` chama `check_is_admin()` (só super_admin). HR Admin recebe `400 "Apenas administradores podem convidar usuários"`. |
| **Novo Membro → + Criar novo time** | `new row violates RLS for table "teams"` | `NewMemberDialog` faz `INSERT teams` **sem `leader_user_id`**. A policy `teams_insert` exige `rls_check_workspace_access`, que para HR Admin **passa** — mas o trigger de consistência (`liderado-precisa-leader`, ver `mem://architecture/papeis-e-permissoes`) bloqueia time sem líder. Resultado: time sem líder não pode existir, e esse caminho nunca devia ter sido oferecido. |
| **Importar em massa** | `Edge Function returned a non-2xx` | `bulk-onboard` também usa `check_is_admin()` → mesmo bloqueio do HR Admin. |

## Plano — 2 frentes, na ordem

### Frente A — Desbloquear o Guto hoje (bug fixes, ~30 min de trabalho)

**A1. `supabase/functions/admin-invite-user/index.ts`**
Trocar o gate `check_is_admin()` por uma regra que aceite quem realmente tem direito de convidar:
- Super Admin (mantém)
- **OU** Owner do `workspace_id` recebido
- **OU** HR Admin do `workspace_id` recebido (`is_hr_admin_of_workspace`)
- **OU** Líder (sem `workspace_id`, fluxo legado de auto-provisionamento do "Meu time") — continua como hoje, mas só pode convidar um liderado/líder pra si.

Validação extra: se `workspace_id` for passado, conferir que o caller pertence a ele antes de criar workspace/time auto-provisionados.

**A2. `supabase/functions/bulk-onboard/index.ts`**
Mesma lógica: aceitar Super Admin, Owner ou HR Admin do(s) workspace(s) listados no CSV. Já que o CSV traz `workspace` por linha, validar que o caller é HR/Owner de **todos** os workspaces presentes; se algum não bater, devolver erro claro indicando quais linhas.

**A3. `src/components/NewMemberDialog.tsx`**
Remover a opção `+ Criar novo time...` do Select. Se o workspace ainda não tem times, mostrar empty-state com CTA "Criar time primeiro" que abre `NewTeamDialog`. Isso elimina a categoria inteira de times-sem-líder e o erro de RLS.

**A4. Mensagens de erro úteis**
Hoje todos os erros das edges aparecem como "Edge Function returned a non-2xx". No `LeaderPicker.handleInvite`, `NewMemberDialog.handleSubmit` e `BulkOnboardDialog`, ler `error.context?.body` (Supabase Functions) e mostrar a mensagem do servidor. Custa nada e o Guto saberia exatamente o que aconteceu.

### Frente B — Simplificar o fluxo de setup (UX unificada)

Hoje existem 3 entradas paralelas com regras diferentes para HR Admin:
- `/lider/pessoas` aba Times → **Novo Time**
- `/lider/pessoas` aba Pessoas → **Convidar liderado** + **Importar em massa**
- Sidebar workspace switcher → **Convidar membros** (NewMemberDialog individual)

**B1. Novo componente `CompanySetupHub`** (rota `/admin/setup` ou aba "Setup" em `/admin`)

Um único hub com 3 cards equivalentes, todos respeitando o mesmo modelo Time → Líder → Liderados:

```text
┌─────────────────────────────────────────────────────────┐
│  Setup da Empresa · Faster Ops                          │
│  5 times · 3 líderes · 12 liderados                     │
├─────────────────────────────────────────────────────────┤
│  [ Cadastro 1 a 1 ]  [ Importar planilha ]  [ Convidar │
│                                              líder ]    │
└─────────────────────────────────────────────────────────┘
```

- **Cadastro 1 a 1** → wizard de 3 passos:
  1. Time (escolher existente ou criar novo nome)
  2. Líder (LeaderPicker — escolher existente OU convidar novo)
  3. Liderados (lista inline, adicionar quantos quiser antes de confirmar)
  Um único submit no fim cria tudo numa transação RPC, garantindo que time nunca existe sem líder.

- **Importar planilha** → mantém o CSV atual, mas com preview agrupado por time (não por linha): "Time Produtech: Douglas (líder), 4 liderados". Permite editar líder antes de confirmar.

- **Convidar líder** → atalho rápido pra quando o Guto só quer mandar 1 convite individual.

**B2. RPC `setup_company_unit`** (nova migration)

Função SECURITY DEFINER que recebe `{workspace_id, team_name, leader: {user_id|invite}, members: [...]}` e faz tudo numa transação:
- Cria/encontra time
- Vincula líder (convida via `admin-invite-user` se necessário)
- Cria team_members
- Garante invariante "time tem líder" mesmo durante a criação

Validação interna: caller tem que ser Owner OU HR Admin do workspace OU Super Admin.

**B3. Consolidar entradas**

- `/lider/pessoas` aba Pessoas continua existindo pra fluxo do dia-a-dia do líder comum (não-HR).
- HR Admin/Owner: sidebar passa a oferecer **"Setup da Empresa"** como entrada principal e mantém **"Convidar membros"** só pra fluxo individual rápido.
- `NewTeamDialog` standalone permanece, mas pra HR Admin a primeira sugestão é abrir o hub.

## Validação

1. Logar como `guto.biazzi@fstr.co` (HR Admin de Faster Ops), executar:
   - Convidar líder via LeaderPicker → 200, e-mail disparado
   - Importar 5 linhas válidas → 200, todos criados
   - Tentar criar time em workspace alheio → 403 com mensagem clara
2. Logar como líder comum (não HR) → fluxo `/lider/pessoas` continua funcionando igual.
3. Testes Deno em `admin-invite-user` e `bulk-onboard` cobrindo: super_admin OK, hr_admin OK, owner OK, líder comum sem workspace_id OK (fluxo legado), líder de outro workspace **bloqueado**.

## Fora de escopo agora

- Slack invites (já funcionam, fire-and-forget no NewMemberDialog).
- Mudar schema de `teams` pra tornar `leader_user_id` NOT NULL — depende de migration de dados separada.
- Redesenhar `/lider/pessoas` do líder comum (esse fluxo não tá quebrado).

## Ordem de execução sugerida

1. **Hoje:** A1 + A2 + A3 + A4 (desbloqueia Guto, deploy isolado, baixíssimo risco)
2. **Depois:** B2 (RPC) → B1 (hub) → B3 (consolidação de entradas)

Posso começar pela Frente A só, ou já emendar a B na sequência?
