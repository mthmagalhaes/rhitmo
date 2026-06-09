# 🎫 TKT — Tela branca no onboarding (Faster Ops)

## 📌 Sintoma
Usuários importados pelo Guto acessam pelo magic link, veem por um instante o wizard "Bem-vindo ao Rhitmo / Identidade · Job Crafting · Futuro" com o nome em branco ("Olá, !") e a tela fica branca.

## 🔎 Causa raiz (confirmada em produção)
**7 usuários ativos do workspace Faster Ops têm linhas duplicadas em `team_members`** com o mesmo `email` e `linked_user_id`, mas nomes ligeiramente diferentes (ex.: "Bianca Brand" + "Bianca Brand Hayakawa", "Renato Tsukahara" + "Renato Tsukahara Gomes", "Camila De/de Oliveira Correia" etc.).

Tanto `useLinkedMember.ts:75` quanto `Onboarding.tsx:175` chamam `.maybeSingle()` em `team_members WHERE linked_user_id = auth.uid()`. Com 2+ linhas o PostgREST retorna erro `PGRST116` ("multiple rows returned"), o código pega o erro e devolve `null`:

- `useLinkedMember` → `linkedMember=null` → `isLinkedMember=false`
- `Onboarding` → `memberData=null` → `useEffect` (linha 207) faz `navigate('/')` → Index renderiza sem workspace válido → tela branca

A dedupe do `bulk-onboard` (chave `team_id+email`) falhou em algum momento (provavelmente segunda rodada de importação com nome corrigido criando linha nova ao invés de atualizar a existente).

Por que a tela pisca antes de embranquecer: o wizard renderiza sem gate de `memberLoading`, então aparece um frame com o cabeçalho (sem nome) antes do redirect.

## 💊 Solução proposta (2 camadas)

### Camada 1 — Limpeza de dados (migration única)
- Para cada `(email, linked_user_id)` com >1 linhas em `team_members`:
  - Manter a linha mais antiga (`MIN(created_at)`)
  - Migrar `team_id`, `feedbacks.member_id`, `goals.member_id`, `performance_reviews.member_id`, `development_plans.member_id`, `context_evidence.member_id`, `pulse_surveys.member_id`, `peer_feedback_requests.target_member_id`, `review_peers.peer_member_id` da linha "perdedora" para a "vencedora" (UPDATE com ON CONFLICT DO NOTHING quando houver unique)
  - DELETE da(s) linha(s) perdedora(s)
- Adicionar constraint `UNIQUE (workspace_id, lower(email))` derivado via JOIN com `teams` — implementar como índice único parcial baseado em função:
  ```
  CREATE UNIQUE INDEX team_members_unique_email_per_workspace
  ON team_members (
    (SELECT workspace_id FROM teams WHERE teams.id = team_members.team_id),
    lower(email)
  ) WHERE email IS NOT NULL AND archived_at IS NULL;
  ```
  Se Postgres não aceitar subquery em índice (não aceita), criar coluna gerada `workspace_id` em `team_members` OU adicionar trigger BEFORE INSERT/UPDATE que bloqueia duplicatas.

### Camada 2 — Hardening de código (defensivo)

**`src/hooks/useLinkedMember.ts` (linha 70-80)**
- Trocar `.maybeSingle()` por `.order('created_at', { ascending: true }).limit(1).maybeSingle()` para nunca quebrar em duplicatas — sempre pega o mais antigo (canônico).

**`src/pages/Onboarding.tsx` (linha 167-184 e 207-212)**
- Mesma troca em `memberData`.
- Substituir o `navigate('/')` silencioso por uma tela amigável quando `!memberData && !memberLoading` ("Não encontramos seu cadastro como liderado — fale com seu HR Admin"). Hoje cai em loop em branco.
- Adicionar gate de loading antes de renderizar o wizard (evita o flash "Olá, !").

**`supabase/functions/bulk-onboard/index.ts` (linha 262-267)**
- Trocar a checagem `eq('team_id').eq('email')` por `eq('email', email).eq('team_id', team.id)` **+** verificação extra por `linked_user_id` antes de inserir; se já existe linha com mesmo `linked_user_id` no workspace, fazer UPDATE de nome ao invés de INSERT.

## ⚠️ Riscos / regressões
- Migration de merge de dados é destrutiva. Vou:
  - Rodar primeiro um SELECT de auditoria (já feito acima — 7 pares confirmados)
  - Migrar referências antes do DELETE
  - Logar via `RAISE NOTICE` o que foi consolidado
- Index único pode falhar se houver duplicatas em outros workspaces — a migration faz cleanup global, não só Faster Ops.

## 🧪 Validação
1. SELECT pós-migration confirma 0 duplicatas em `(linked_user_id, email)` ativos.
2. Bianca/Renato/Camila/Glaucia/Guilherme/Marina/Thalia logam → wizard carrega com nome preenchido e progride.
3. Tentar reimportar Bianca com nome diferente → bulk-onboard atualiza nome, não cria linha nova.
4. Verificar /lider/diario do Guto (HR) — lista de liderados volta a aparecer (Print 1 era sintoma colateral do mesmo bug + jsonb_typeof, já corrigido).

## 📦 Arquivos tocados
- `supabase/migrations/<novo>.sql` — dedupe + index único
- `src/hooks/useLinkedMember.ts` — `.order().limit(1)`
- `src/pages/Onboarding.tsx` — `.order().limit(1)` + loading gate + erro amigável
- `supabase/functions/bulk-onboard/index.ts` — dedupe por `linked_user_id`

## Status dos outros bugs do dump anterior
| Ticket | Status |
|---|---|
| #1 Liderados vazio (jsonb guard) | ✅ Aplicado — provavelmente também impactado pelas duplicatas, vai melhorar com este fix |
| #2/5 Tela branca | 🔴 Este plano resolve |
| #3 Notificações de reuniões não-1:1 | ✅ Aplicado em `fetch-calendar-events`, aguardando próxima janela do cron para validar em prod |
| #4 Disparar convites pendentes | ✅ Botão entregue em `/hr/membros` |

→ **Aplicar a migration + ajustes de código?** (sim / só código sem migration / mais info)
