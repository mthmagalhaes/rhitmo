
## Diagnóstico

Quando o Guto criou o time **Produto/Tech** e convidou um novo líder pelo `LeaderPicker`, dois problemas se combinaram:

**1. Auto-provisionamento indevido em `admin-invite-user`**
Quando `role: 'leader'` é enviado, a edge function **sempre** cria um workspace novo + um time "Meu time" para o líder convidado — mesmo quando ele está sendo convidado *para dentro* do workspace do Guto. Resultado: o líder vira owner de um workspace paralelo, e quando aceitar o convite cai num app vazio em vez do Produto/Tech do Guto.

**2. Aba Times não mostra status de líder pendente**
Em `src/pages/lider/Pessoas.tsx` (TeamsTab, linhas ~620-660):
- O nome do líder é resolvido por `team_members.linked_user_id IN (leader_user_ids)`.
- Líder recém-convidado **não está em `team_members`** → `leader_name` fica `null` → cai no fallback genérico "Líder vinculado".
- Não há badge "Aguardando aceite". Guto vê o time, mas sem saber que o líder ainda não entrou.

Por isso ele "não consegue ver o status do time": o time aparece, mas sem nome do líder e sem indicação de pendência.

---

## Plano (escopo cirúrgico — só corrigir os 2 bugs)

### 1. `supabase/functions/admin-invite-user/index.ts`
Pular o bloco de bootstrap (workspace + "Meu time") quando o convite for **direcionado a um workspace existente**. Critério: se `workspace_id` foi enviado, o líder vai entrar nesse workspace — não precisa (e não deve) ganhar um workspace próprio.

```ts
// antes: if (isLeader && invitation?.user?.id) { ...bootstrap... }
// depois:
if (isLeader && invitation?.user?.id && !workspace_id) {
  // bootstrap só no fluxo legado (líder se auto-convidando, sem workspace destino)
  ...
}
```

Nada mais muda nessa função — `teams.leader_user_id` já é setado pelo frontend no `NewTeamDialog`/`EditTeamDialog`.

### 2. Mostrar status do líder pendente na aba Times

**2a. Nova RPC `get_workspace_teams_overview(_workspace_id uuid)`** (SECURITY DEFINER) que retorna por time:
- `id, name, created_at, member_count, leader_user_id`
- `leader_name, leader_email` — resolvidos de `team_members` OU de `auth.users.raw_user_meta_data->>'full_name'` + `auth.users.email` quando o líder ainda não virou team_member
- `leader_invite_pending boolean` — `true` quando `auth.users.email_confirmed_at IS NULL` E `last_sign_in_at IS NULL`

Acesso: só Owner do workspace, HR Admin do workspace, ou Super Admin. Mesmas regras de RLS que já existem (`is_workspace_owner_of_member` style).

**2b. `src/pages/lider/Pessoas.tsx` — `TeamsTab`**
Trocar o `useQuery` atual por uma chamada `supabase.rpc('get_workspace_teams_overview', { _workspace_id })`. Adaptar `TeamRow` para incluir `leader_email` + `leader_invite_pending`.

Na renderização da coluna "Líder" (linha ~745):
```tsx
{t.leader_user_id ? (
  <div className="flex items-center gap-2 min-w-0">
    <span className="text-[13px] text-foreground truncate">
      {t.leader_name ?? t.leader_email ?? 'Líder vinculado'}
    </span>
    {t.leader_invite_pending && (
      <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-400 text-[10px]">
        Aguardando aceite
      </Badge>
    )}
  </div>
) : (
  <button onClick={() => setEditTeam(t)} ...>Sem líder — definir</button>
)}
```

Ordenação: time com líder pendente vem **depois** de "sem líder" mas **antes** dos times saudáveis — chama atenção sem poluir.

### 3. (Opcional, mas barato) Toast pós-criação do time
Em `NewTeamDialog`, após criar com líder convidado novo, trocar o toast genérico por:
> "Time Produto/Tech criado. Convite enviado para {email}. Status fica como 'aguardando aceite' até o líder entrar."

Resolve a expectativa do Guto sem precisar mexer em mais nada.

---

## Fora de escopo
- Não mexer no fluxo de cadastro de liderado (a mensagem "aguardando aceite" no liderado é correta — o time só destrava feedback/RAG depois que o líder aceita).
- Não mexer no `bulk-onboard` (já trata o caso corretamente).
- Não criar nova rota `/lider/times` separada — a aba existente em `/lider/pessoas?tab=times` já é o lugar certo.

## Risco
Baixo. A mudança em `admin-invite-user` afeta apenas o ramo `workspace_id !== null` (que hoje produz workspaces órfãos — provavelmente já temos lixo no banco para limpar depois). A RPC nova é aditiva.

## Validação
1. Guto cria time → convida líder novo → vê badge **"Aguardando aceite"** com email do líder na aba Times.
2. Líder confirma email → próximo refresh, badge some, nome do líder aparece normal.
3. Conferir no banco: nenhum workspace novo é criado quando `workspace_id` foi passado.
