# Adicionar "Convidar Líder" em /admin → Usuários

## Problema
- Ana Campos (carolyna@fapeduca.com.br) precisa de acesso como líder.
- O painel `/admin → Usuários` não expõe botão de convite. Hoje a única forma rápida é cadastrar manualmente na Lista de Espera ou usar Bulk Onboarding (overkill pra 1 pessoa).
- Gap recorrente: toda vez que um lead pede acesso direto (WhatsApp, email), você precisa fazer workaround.

## Solução
Adicionar um único botão **"Convidar líder"** no header de `AdminUsers.tsx`, ao lado do "Exportar CSV", que abre dialog com 3 campos (Nome, Email, Plano) e chama a edge function `admin-invite-user` já existente.

A mesma function é usada em `WaitlistTable` e `AdminAccess` — reuso 100%, zero código novo de backend.

## Mudanças

### 1. `src/components/admin/AdminUsers.tsx`
- Importar `Button`, `Dialog`, `Input`, `Label`, `Select` (já no design system)
- Adicionar estado `inviteDialog` (open, name, email, plan)
- Botão `<Button variant="default">` com ícone `UserPlus` no header, à esquerda do "Exportar CSV"
- Dialog com:
  - Input **Nome completo** (obrigatório)
  - Input **Email** (obrigatório, type="email")
  - Select **Plano inicial**: Pulse (default), Pro, Business
  - Footer: Cancelar / Enviar Convite
- `confirmInvite()` chama `supabase.functions.invoke('admin-invite-user', { body: { email, name, assigned_plan } })`
- Toast de sucesso + `refetch()` da lista de usuários
- Mesmo tratamento de erro do `WaitlistTable`

### 2. Nada no backend
A edge function `admin-invite-user` já:
- Valida super_admin via `user_roles`
- Cria conta via `supabase.auth.admin.inviteUserByEmail()`
- Atribui plano e dispara email de boas-vindas
- Marca lead como `invited` se já existir na waitlist

## Resolver Ana agora (paralelo, sem código)
Enquanto a feature não está deployed, faça isso pelo caminho atual:
- Vá em **/admin → Acessos & Export** (aba `AdminAccess`)
- Use o invite dali com `carolyna@fapeduca.com.br` + nome "Ana Campos" + plano **Pulse**
- Ela recebe email com link mágico em ~30s

Se preferir, posso pular o plano e ir direto pra implementação do botão. É edit de ~80 linhas em 1 arquivo.

## Design (Creme/Bento)
- Botão: `variant="default"` (preenchido roxo Rhitmo), ícone `UserPlus` à esquerda
- Dialog: padrão shadcn já temado, `rounded-2xl`, sem mudanças visuais
- Header alinhado: `flex justify-between` mantendo "Exportar CSV" à direita

## Out of scope
- Não tocar em `WaitlistTable` (continua sendo o fluxo "lead aprovado")
- Não criar campo de "workspace destino" — a function já cria workspace novo no nome do convidado (que é o caso da Ana, ela vai liderar a própria conta na Fapeduca)
- Não adicionar bulk aqui — bulk continua em `AdminStructure` e `/lider/pessoas`
