

## Impersonation: Ver como qualquer usuário

### O que existe hoje
- Tabela `admin_impersonation` no banco
- Função SQL `effective_user_id()` que retorna o `impersonated_user_id` se existir, senão `auth.uid()`
- Todas as RLS policies de líder já usam `effective_user_id()` — ou seja, inserir um registro na tabela já faz o admin "virar" outro usuário
- Nenhuma UI conectada a isso

### O que será feito

**1. Botão "Impersonar" na lista de usuários (AdminUsers.tsx)**
- Adicionar botão com ícone `Eye` em cada linha da tabela de usuários
- Ao clicar: insere registro em `admin_impersonation` com o `user_id` alvo e o email
- Invalida queries e redireciona para `/` (dashboard do usuário impersonado)

**2. Banner flutuante de impersonation (novo componente ImpersonationBanner.tsx)**
- Barra fixa no topo da tela (sticky, z-50) com fundo amarelo/warning
- Mostra "Visualizando como: Nome (email)" + botão "Encerrar"
- Ao encerrar: deleta o registro de `admin_impersonation` e redireciona para `/admin`
- Componente renderizado no `AppLayout.tsx`

**3. Hook useImpersonation.ts**
- Query em `admin_impersonation` filtrado por `admin_user_id = user.id`
- Retorna `{ isImpersonating, impersonatedEmail, startImpersonation(userId, email), stopImpersonation() }`
- `startImpersonation`: deleta registros antigos, insere novo, invalida todas queries
- `stopImpersonation`: deleta registro, invalida todas queries

### Arquivos afetados

| Arquivo | Acao |
|---------|------|
| `src/hooks/useImpersonation.ts` | Criar — hook com start/stop |
| `src/components/admin/ImpersonationBanner.tsx` | Criar — banner fixo |
| `src/components/admin/AdminUsers.tsx` | Adicionar botão Impersonar |
| `src/components/AppLayout.tsx` | Renderizar ImpersonationBanner |

