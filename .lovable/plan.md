## Causa raiz

O Ruan (`ruan.costa@aluno.fapeduca.com.br`, time da Carolyna em FapEduca) não consegue concluir o **Rhitmo Sync** porque a RPC `submit_rhitmo_sync_v2` rejeita o submit silenciosamente:

```sql
IF NOT EXISTS (
  SELECT 1 FROM team_members
  WHERE id = p_member_id AND linked_user_id = auth.uid()
) THEN
  RAISE EXCEPTION 'Unauthorized: you can only submit your own Rhitmo Sync data';
END IF;
```

No banco existem **dois `team_members` duplicados** para o e-mail dele, ambos com `linked_user_id = NULL`:

| id | name | email | linked_user_id | has_sync |
|---|---|---|---|---|
| `511e0dff…5b7b6f` (o que ele acessou) | Ruan | ruan.costa@aluno.fapeduca.com.br | **null** | false |
| `d11bd4d8…8779f0` | Ruan | ruan.costa@aluno.fapeduca.com.br | **null** | false |

Ou seja, ele recebeu/abriu o link `/rhitmo-sync/:memberId` sem nunca ter aceito o convite e criado conta vinculada. Quando clica "Finalizar", a RPC dispara `Unauthorized`, o front captura como erro genérico e mostra **"Erro ao salvar suas respostas. Tente novamente"** — sem nenhuma pista de que o problema é a falta de conta linkada. Pior: o catch usa `error.message`, mas a mensagem `Unauthorized…` chega como `Error` do supabase-js e o usuário fica preso no toast de retry.

A página `RhitmoSync.tsx` tampouco detecta o estado `linked_user_id IS NULL` no `loadMemberData` (que usa `get_member_for_sync`, security definer e portanto carrega normalmente), então o wizard inteiro renderiza, ele preenche tudo, e só falha no fim.

---

## Plano

### 1. Resolver agora (dados — caso Ruan)

- Remover o `team_member` duplicado (`d11bd4d8…8779f0`).
- Reenviar convite ao Ruan a partir de `/lider/pessoas` da conta da Ana/Carolyna **OU** linkar manualmente o `linked_user_id` se ele já tiver criado conta com esse e-mail.
- Confirmar com a Ana qual dos dois cenários é o caso e executar via migration.

### 2. UX: bloquear o wizard antes de o liderado preencher tudo (frontend)

Em `src/pages/RhitmoSync.tsx`:

- Em `loadMemberData`, comparar `member.linked_user_id` com `auth.getUser()`. Se `linked_user_id` for `null` **ou** diferente do usuário logado:
  - Renderizar um estado dedicado "Você precisa aceitar o convite primeiro" com:
    - Explicação curta ("seu líder te adicionou, mas falta criar/ativar sua conta")
    - CTA "Acessar convite" → fallback para `/auth` se não houver token
    - CTA secundário "Falar com meu líder"
  - Não montar o wizard.
- No `handleSubmit`, tratar erros do tipo `Unauthorized…` com mensagem clara em PT-BR ("Sua conta ainda não está vinculada como liderado. Aceite o convite enviado pelo seu líder antes de responder.") em vez do toast genérico.

### 3. Backend: expor `linked_user_id` no carregamento

- Atualizar a RPC `get_member_for_sync` (security definer) para retornar também `linked_user_id` (`uuid`), permitindo o frontend fazer o gating do passo 2 sem precisar de outra query.
- Sem mudar `submit_rhitmo_sync_v2` — a checagem dela continua correta.

### 4. Prevenção: dedup no convite (rápido)

- No fluxo de convite individual (`NewMemberDialog` / `admin-invite-user` / `bulk-onboard`), bloquear criação de novo `team_members` quando já existir registro com mesmo `email` no mesmo `team_id` e `linked_user_id IS NULL` — reaproveitar o registro existente. Isso evita que duplicatas como as do Ruan voltem a aparecer.
- Escopo mínimo: só o caminho de convite individual usado pela Ana hoje. Bulk pode ficar para uma sprint dedicada se for muito invasivo.

### Arquivos a tocar

- `src/pages/RhitmoSync.tsx` (gating + mensagem de erro)
- `supabase/migrations/<novo>.sql` — atualizar `get_member_for_sync` retornando `linked_user_id` + dedup do Ruan
- `src/components/.../NewMemberDialog.tsx` (ou equivalente do convite individual) — checagem anti-duplicata

### Não tocar

- `submit_rhitmo_sync_v2` (regra de segurança correta)
- Demais tabelas/RLS
- Fluxo de bulk onboarding (fica para depois)

### Validação

- Reproduzir com um team_member de teste sem `linked_user_id` → deve ver tela de "aceite o convite", não o wizard.
- Logar com usuário linkado e completar Sync → fluxo normal segue funcionando.
- Tentar criar segundo convite com mesmo e-mail/team → deve reaproveitar o registro existente.
