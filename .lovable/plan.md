

## Plano: Melhorar a jornada pós-convite do liderado

### O problema do Guilherme
O convite é "single-use by design": após aceitar, o `invite_token` é apagado. Quando o Guilherme clica no mesmo link novamente, recebe "Convite Inválido" — uma tela fria, sem orientação. Ele não sabe que pode acessar diretamente via `rhitmo.co/auth`.

### Solução: 3 melhorias complementares

#### 1. Tela de "Convite já aceito" em vez de erro genérico
Quando o token não é encontrado, verificar se existe um `team_member` com `invite_status = 'accepted'` para aquele token/member. Se sim, mostrar uma tela amigável:

> "Olá! Você já aceitou este convite. Para acessar suas devolutivas, faça login abaixo."
> [Botão: Acessar com Google] [Botão: Acessar com email]

Em vez do "Convite Inválido" atual.

**Implementação:** Alterar a RPC `get_invite_details` (ou criar uma nova) para retornar um campo `already_accepted: true` quando o membro existe mas o token já foi consumido. No frontend, tratar esse caso com uma UI dedicada.

#### 2. E-mail/toast pós-aceite com instruções de acesso futuro
Após aceitar o convite com sucesso, mostrar um **toast persistente** ou uma **tela de sucesso intermediária** (em vez de redirecionar imediatamente) com a mensagem:

> "Pronto! Da próxima vez, acesse diretamente em **rhitmo.co/auth** usando sua conta Google."

Isso educa o usuário no momento certo.

#### 3. Redirect inteligente na página de erro
Se o usuário já está logado e clica num convite já aceito, em vez de mostrar erro, detectar que o `linked_user_id` bate com o `user.id` atual e redirecionar direto para o dashboard.

---

### Arquivos a modificar

| Arquivo | Mudança |
|---------|---------|
| Migração SQL | Criar RPC `get_invite_status` ou ajustar `get_invite_details` para retornar status `already_accepted` |
| `src/pages/Invite.tsx` | Nova UI para estado "já aceito" com botões de login + redirect inteligente para usuários já logados |

### Detalhes técnicos

**Nova RPC ou ajuste na existente:**
```sql
-- Retornar status mesmo quando token já foi consumido
-- Buscar por member_id OU pelo histórico do token
-- Retornar campo 'status': 'pending' | 'accepted' | 'not_found'
```

**Invite.tsx — 3 estados em vez de 2:**
1. `pending` → UI atual (botão "Aceitar e Acessar")
2. `already_accepted` → Nova UI amigável com botões de login
3. `not_found` → Erro genérico (token realmente inválido)

**Pós-aceite:** Antes do `navigate('/dashboard')`, exibir tela de sucesso por 5 segundos com instrução de acesso futuro, ou usar toast persistente.

