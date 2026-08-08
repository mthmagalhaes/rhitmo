# Visão BP para RH Admin — cobertura e ritmo, sem conteúdo do diário

Atender o pedido do Guto ("ver onde estão as telas / visão de líder") separando as duas dores reais:

1. **Enablement** — RH precisa saber como o produto funciona para apoiar líderes como o Caio.
2. **Governança (Visão BP)** — RH precisa enxergar *se* o ritmo de 1:1s e feedbacks está acontecendo, por líder e por liderado, **sem ler notas, transcrições ou avaliações**.

O conteúdo do diário do líder permanece fechado ao RH. Nada de impersonation, nada de leitura de notas.

## O que muda

### 1. Nova tela: `/hr/ritmo` (Visão BP)
Entrada no menu do RH ("Ritmo dos times"), com duas camadas:

- **Lista de líderes** — por líder: nº de liderados, % de liderados com 1:1 registrada nos últimos 30 dias, dias desde o último registro, nº de avaliações formais no ciclo, semáforo de saúde (verde/âmbar/vermelho pela regra 7 / 8-14 / +14 dias já usada no produto).
- **Detalhe do líder** — lista dos liderados daquele líder com: data do último registro, frequência de 1:1 nos últimos 90 dias, status da avaliação formal (não iniciada / rascunho / compartilhada / reconhecida) e se tem PDI/objetivo ativo. Apenas metadados: data, contagem, status. Nenhum título de nota, nenhum trecho, nenhum resumo de IA.

### 2. Preview das telas de líder (enablement, sem dados)
No lugar de dar acesso ao diário, o RH ganha um botão "Ver como o líder vê" que abre um **tour guiado com capturas/estado de exemplo** das telas de líder (Início, 1:1s, Diário, Avaliações), explicando onde cada coisa fica. Serve para o RH orientar líderes sem enxergar dado real de ninguém.

### 3. Central de Ajuda para RH
Trilha "Apoiando seus líderes" na Central de Ajuda: como o líder conecta a agenda, como o bot entra, como chamar o bot manualmente, o que fazer quando o líder diz que a transcrição não apareceu, e o que o RH consegue (e não consegue) ver. Reaproveita os artigos já criados.

## Limites explícitos (não mudam)

- RH não lê feedbacks, notas, transcrições, briefs nem avaliações não compartilhadas.
- RH não vira líder de time nenhum, não escreve no diário.
- Impersonation continua exclusiva do super admin.

## Detalhes técnicos

- Nova RPC `get_hr_rhythm_overview(p_workspace_id)` — `SECURITY DEFINER`, `LANGUAGE plpgsql`, `SET search_path = public`, guardada por `is_hr_admin_of_workspace(auth.uid(), p_workspace_id) OR is_workspace_owner(...)`. Retorna somente agregados por líder (contagens, datas, status). Sem colunas de texto de `feedbacks`.
- Nova RPC `get_hr_leader_rhythm_detail(p_leader_user_id, p_workspace_id)` — mesmo guard; retorna por liderado: `last_feedback_at`, `feedback_count_90d`, `review_status`, `has_active_plan`. Sem `content`/`summary`/`structured_summary`.
- `SELECT _assert_rpc_runs('get_hr_rhythm_overview');` e idem para a de detalhe ao fim da migration.
- Frontend: `src/pages/HRRitmo.tsx` + rota em `src/App.tsx` sob `HRAdminGuard`, item `{ id: 'ritmo', to: '/hr/ritmo' }` em `HR_ADMIN_NAV_ITEMS`. Reuso do padrão master-detail e do semáforo de saúde já existentes.
- Preview das telas de líder: componente estático com dados mock, sem chamada ao backend.
- Sem alterar RLS de `feedbacks`, `meeting_transcripts` ou `performance_reviews`.
