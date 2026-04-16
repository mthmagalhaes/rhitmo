---
name: Admin Users — gestão Data Analyst
description: Painel admin/Usuários com colunas ID, Workspace, Cliente, filtros + segmentos, edição via edge function admin-update-user e export CSV
type: feature
---

O painel administrativo centraliza ferramentas de suporte e gestão no módulo de 'Usuários' ('AdminUsers.tsx'), que absorveu funcionalidades de busca universal, redefinição de senha, exclusão de conta e transferência de membros entre times. A visualização utiliza o sistema 'CustomAvatar' e badges consolidados via RPC 'get_user_caps'. Acesso restrito via política 'Admin Full Access' e verificação 'is_admin()'.

## Colunas e classificação de cliente
A tabela exibe 7 colunas: Usuário, **ID** (UUID copiável), **Workspace(s)** (lista com role: Owner/HR/Líder/Liderado), **Cliente** (campo livre `workspaces.client_account` + chip do `workspaces.customer_segment`), Papéis, Status, Ações.

Os campos `client_account` (text livre) e `customer_segment` (enum: `beta`, `paid`, `trial`, `internal`, `test`) foram adicionados à tabela `workspaces` para permitir classificação comercial. Workspaces dos usuários internos do Rhitmo (matheus@rhitmo.co, matheus_hr@rhitmo.co) são pré-classificados como `internal`.

## Filtros e ferramentas Data Analyst
Header tem 5 filtros: busca global (nome/email/UUID/cliente/workspace), papel, status, workspace, segmento. Acima da tabela há contadores clicáveis por segmento (Beta/Pago/Trial/Interno/Teste) que funcionam como atalho de filtro. Botão **Exportar CSV** baixa os usuários filtrados com BOM UTF-8 incluindo: user_id, nome, email, workspaces, cliente, segmento, papéis, status.

## Edição de usuário
A edge function **`admin-update-user`** (Deno, valida `super_admin` via `user_roles`) usa `supabase.auth.admin.updateUserById()` para atualizar `email` (com `email_confirm: true`) e `user_metadata.full_name`. O dialog de edição mostra ID read-only (copiável), Nome, Email, e os campos de cliente (`client_account`/`customer_segment`) salvos diretamente na tabela `workspaces` do workspace primário do usuário.
