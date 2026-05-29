# Fix: painel "Saúde do orquestrador" travado em "Carregando…"

## Causa raiz (confirmada nos postgres_logs)

A função `public.get_slack_orchestrator_health` faz:

```sql
SELECT array_agg(id) FROM public.team_members WHERE manager_id = p_user_id;
```

Mas `team_members.manager_id` **não existe** no schema atual. O modelo é Workspace=Company: liderados do líder são resolvidos via `teams.leader_user_id`:

```text
team_members.team_id → teams.id → teams.leader_user_id
```

O Postgres responde HTTP 400 com `column "manager_id" does not exist`. No `SlackHealthPanel.tsx`, o early-return `if (isLoading || !data)` deixa o loader rodando para sempre quando a query falha, então o erro nunca aparece para o usuário.

## Correções

### 1. Migration: reescrever `get_slack_orchestrator_health`

Substituir os 3 lugares que usam `manager_id`:

- `v_member_ids`: passar a usar
  ```sql
  SELECT array_agg(tm.id) INTO v_member_ids
  FROM public.team_members tm
  JOIN public.teams t ON t.id = tm.team_id
  WHERE t.leader_user_id = p_user_id
    AND tm.archived_at IS NULL;
  ```
- Manter `upcoming_meetings.user_id = p_user_id` (correto, é coluna do dono do calendário).
- Manter o gate de segurança (`auth.uid() = p_user_id` ou super_admin).

### 2. `SlackHealthPanel.tsx`: estado de erro visível

Trocar `if (isLoading || !data)` por:
- enquanto `isLoading` → loader atual
- se `isError` ou `data == null` após load → bloco compacto "Não consegui carregar a saúde do orquestrador" + botão "Tentar novamente" chamando `refetch()`

Isso evita repetir o bug silencioso no futuro.

## Verificação

- Rodar `SELECT public.get_slack_orchestrator_health('<meu uuid>')` direto no banco e conferir JSON populado.
- Recarregar `/lider/configuracoes` → aba Integrações → card Slack: painel deve renderizar próximas 1:1s, últimos envios e sinais Slack 7d.

## Fora de escopo

- Mudar a lógica de cron, DMs proativas ou rollups (já validados na fase anterior).
- Refatorar outras RPCs que possam ter o mesmo equívoco — só corrijo se aparecerem.
