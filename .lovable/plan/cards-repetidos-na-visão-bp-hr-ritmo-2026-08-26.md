# Cards repetidos na Visão BP (/hr/ritmo)

## O que está acontecendo

Os cards não estão duplicados: existe **um card por time**, não por líder. Seu usuário (Matheus Magalhaes) é líder de 5 times ativos no workspace Faster:

| Time | Liderados ativos |
| --- | --- |
| Business Ops | 2 |
| Expansão | 1 |
| CreativeOps | 1 |
| Customer Success | 1 |
| People | 0 |

Como o card mostra apenas nome e e-mail do líder, os cinco parecem iguais. O card "0/0 liderados com registro" é o time People, que está vazio.

## Correção proposta

1. **Mostrar o nome do time no card** — chip discreto abaixo do e-mail (ex.: "Business Ops"), para que cada card fique identificável.
2. **Agrupar por líder** — um card por pessoa, com os times somados (cobertura consolidada) e a lista de times como subtítulo. Ao abrir o detalhe, os liderados aparecem com a etiqueta do time.
3. **Esconder times sem liderados ativos** da visão de ritmo (o card "0/0" não informa nada e distorce a leitura de cobertura).

Sugestão: implementar 1 + 3 agora (mudança pequena e imediata) e 2 em seguida, já que exige recalcular métricas no agregado.

## Detalhes técnicos

- `get_hr_rhythm_overview` itera `public.teams` e devolve uma linha por time; incluir `team_id`/`team_name` no `jsonb_build_object` e filtrar times sem membros ativos.
- Para agrupar por líder: agregar no SQL por `t.leader_user_id`, somando `total_members` e `members_with_recent_1on1`, usando `MAX(last_feedback_at)` e `MIN(days_since_last_feedback)`, e retornando `teams: [{id, name}]`.
- `get_hr_leader_rhythm_detail` já busca por `leader_user_id` (todos os times), então o detalhe já é consolidado — só precisa exibir o time de cada liderado.
- Front: `src/pages/HRRitmo.tsx` (grid de cards e tipos do retorno da RPC).
