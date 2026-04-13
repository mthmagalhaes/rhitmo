

## Diagnóstico: Guilherme Fica Preso no Dashboard de Líder

### Causa raiz identificada

O problema está em uma **inconsistência de estado entre a sidebar e o conteúdo principal (Index.tsx)**.

O que acontece com o Guilherme (e potencialmente qualquer liderado cujo convite não processou 100%):

1. **Sidebar** (`AppSidebar.tsx` linha 108):
   ```text
   showMemberMenu = !roleLoading && !isLeader && !isHRAdmin && (isUser || isLinkedMember)
   ```
   Se `useUserRole` retorna `'user'` (não é owner/líder/HR), a sidebar mostra o menu de membro — **mesmo que `isLinkedMember` seja `false`**. Isso é correto: o menu de membro é o fallback para quem não é líder.

2. **Index.tsx** (linha 360):
   ```text
   if (isLinkedMember && !isLeader && !isHRAdmin) → DirectReportDashboard
   ```
   Se `isLinkedMember` é `false` (convite não processado, `invite_status ≠ accepted`, ou `linked_user_id` não setado), essa condição falha. O código **cai direto no dashboard de líder** (linha 385+), que precisa de um workspace para funcionar. Guilherme não tem workspace → vê dashboard vazio com Setup Inicial, impossível de sair.

3. **Resultado**: Sidebar mostra "Início, Minha Carreira, Feedbacks, Meu Perfil" (links de membro). Mas o conteúdo mostra o dashboard de líder vazio. Clicar nos links do sidebar **navega** para as rotas certas (`/dashboard/carreira`, etc.), mas `Index.tsx` sempre renderiza o dashboard de líder porque `isLinkedMember` é `false`.

### Por que `isLinkedMember` pode ser `false` para o Guilherme

- A query `useLinkedMember` filtra por `invite_status = 'accepted'` E `linked_user_id = user.id`
- Se o fluxo de aceitação (via `/invite` → `/auth` → `AuthEventProvider`) não completou corretamente (o `update` no `team_members` falhou silenciosamente), o status permanece `pending` e `linked_user_id` fica `null`

### Correção (2 partes)

**Parte 1: Tratar o estado "user sem vínculo" no Index.tsx**

Adicionar um bloco entre a linha 360 e 365 para quando o usuário tem role `'user'` mas NÃO é `isLinkedMember`. Em vez de cair no dashboard de líder, mostrar um estado adequado: verificar se há convite pendente por email e orientar o usuário.

```text
if (!isLeader && !isHRAdmin && !isLinkedMember) {
  // Usuário sem vínculo — mostrar estado de espera
  // "Seu convite está sendo processado" ou "Entre em contato com seu líder"
}
```

**Parte 2: Garantir que o Guilherme seja vinculado corretamente**

Verificar no banco se o `team_member` do Guilherme tem `invite_status = 'accepted'` e `linked_user_id` setado. Se não, corrigir com uma query direta. Mas também tornar o fluxo de aceitação mais resiliente:

- No `Invite.tsx`, o `handleAcceptInvite` faz `.eq('invite_token', code)` — se o token já foi limpo (`invite_token: null`), a query não encontra a row e falha silenciosamente
- Adicionar fallback: se o update por token falhar, tentar por `member_id` (que já temos em `inviteData`)

### Arquivos a modificar

| Arquivo | Ação |
|---------|------|
| `src/pages/Index.tsx` | Adicionar tratamento para `isUser && !isLinkedMember` — mostrar estado de "convite pendente" em vez de cair no dashboard de líder |
| `src/pages/Invite.tsx` | Melhorar resiliência do `handleAcceptInvite` com fallback por `member_id` |
| `src/components/AuthEventProvider.tsx` | Adicionar fallback por email quando `invite_token` match falha |

### Fluxo corrigido

```text
Usuário com role 'user' acessa /dashboard
  ├── isLinkedMember = true → DirectReportDashboard ✓
  ├── isLinkedMember = false, hasPendingInvite = true → "Processando seu convite..."
  └── isLinkedMember = false, sem convite → "Sem vínculo ativo. Fale com seu líder."
```

