&nbsp;

# Rhitmo Core — Implementação dos Rituais Mensal e Trimestral

## O modelo mental em uma frase

Hoje o Rhitmo tem o **andar de baixo** (Diário de Bordo, Mentor, Briefs, Nudges) e o **andar de cima** (Avaliação Formal). Falta o **meio**: os rituais Mensal e Trimestral que transformam notas avulsas em dado longitudinal estruturado e tornam a Review formal um ato de revisão — não de criação. Foco em ser pouca fricção, precisamos ter isso na plataforma, mas a ideia é que líder nem precise abrir plataforma e consiga fazer isso através do slack (pelo menos o diário de bordo e o ritual mensal e trimestral) e deixando a avaliação formal para a plataforma.

Esta sprint constrói exatamente isso, reutilizando a infra existente de cron, edge functions, Lovable AI e o template de prompt já validado pela `generate-formal-review`.

## A camada que falta (visualmente)

```text

Diário de Bordo (existe)

   ↓ acumula 30 dias

Rhitmo Mensal (NOVO) — IA sugere → líder confirma em 3 min

   ↓ acumula 3 meses

Rhitmo Trimestral (NOVO) — IA sugere → líder calibra em 5 min

   ↓ acumula 2-4 trimestres

Rhitmo Review (existe — ganha contexto longitudinal)

```

## O que vamos construir

### 1. Schema — duas novas tabelas

*`monthly_recaps`** — um por (member_id, year_month)

- `member_id`, `manager_id`, `workspace_id`, `period_month` (date, primeiro dia do mês)

- `status` `draft` | `confirmed`), `confirmed_at`, `confirmed_by`

- `highlight` (jsonb: `{text, evidence: [{feedback_id, date}]}`) — "o que se destacou"

- `concern` (jsonb: mesma estrutura) — "o que preocupou"

- `dominant_pattern` (text) — "frase do mês"

- `evidence_count` (int), `feedbacks_count`, `meetings_count`

- `ai_generated_at`, `ai_model`

*`quarterly_recaps`** — um por (member_id, year_quarter)

- `member_id`, `manager_id`, `workspace_id`, `period_quarter` (date, primeiro dia do trimestre)

- `status`, `confirmed_at`, `confirmed_by`

- `highlights` (jsonb array — top 2-3 do trimestre, cita meses-fonte)

- `recurring_patterns` (jsonb array)

- `evolution_vs_previous` (text) — comparação com trimestre anterior se houver

- `classification` (text): `precisa_subir` | `dentro_esperado` | `subindo_barra` | `acima_esperado`

- `turnover_risk` (text): `low` | `medium` | `high` + `turnover_risk_reason`

- `next_action_key` (text — select de ~8 opções pré-definidas) + `next_action_note` (opcional)

- `source_monthly_recap_ids` (uuid array), `source_meetings_count`

RLS: igual a `feedbacks` — manager_id é dono; HR Admin do workspace tem read; o liderado **não** vê (rituais são privados do líder, igual a uma review em rascunho).

### 2. Edge Functions — três novas

*`generate-monthly-recap`** (manual + cron mensal)

- Input: `member_id`, `period_month` (opcional, default = mês passado)

- Pega todas `feedbacks` + `meeting_transcripts` do mês

- Chama Lovable AI `google/gemini-2.5-flash`) com prompt que segue a Constituição Rhitmo

- Retorna JSON estruturado com `highlight`, `concern`, `dominant_pattern` — cada um citando feedback IDs reais (anti-alucinação)

- Cria `monthly_recaps` com `status='draft'`

- Cron `monthly-recaps-generate` no dia 1 de cada mês, gera draft para todo membro com ≥3 evidências no mês anterior

- Dispara nudge: "3 resumos mensais prontos para confirmar (3 min)"

*`generate-quarterly-recap`** (manual + cron trimestral)

- Input: `member_id`, `period_quarter` (opcional, default = trimestre passado)

- Requer pelo menos 1 `monthly_recap` confirmado no trimestre (se 0, retorna erro amigável)

- Concatena os 1-3 mensais como contexto + busca trimestre anterior (se houver) para `evolution_vs_previous`

- Gera draft com classificação sugerida + risco + 8 opções de ação por classificação (matriz fixa do canvas anexado)

- Cron `quarterly-recaps-generate` no dia 1 de jan/abr/jul/out

*`finalize-monthly-recap`** / *`finalize-quarterly-recap`** — endpoints leves para o líder confirmar com edits (mesma função pode receber payload do recap editado e marcar `status='confirmed'`).

### 3. Atualizar `generate-formal-review` para usar contexto acumulado

Quando existir, a Review formal passa a:

1. Buscar **trimestrais confirmados** no período → usar como espinha dorsal (Bloco 3 "Padrões observados" e Bloco 6 "Classificação")

2. Buscar **mensais confirmados** restantes → preencher gaps

3. Cair de volta em `feedbacks` brutos só quando não houver recap

O prompt ganha uma seção: "Você está gerando a review com X trimestrais e Y mensais já validados pelo líder. Use essa estrutura — não recomece do zero."

### 4. Frontend — três peças

*`MonthlyRecapCard`** (no `MemberDetails` e no dashboard do líder)

- Mostra "Rhitmo Mensal de [mês]" com os 3 blocos editáveis inline (highlight / concern / dominant_pattern)

- Botão "Confirmar em 1 clique" se aceitar tudo, ou edita e confirma

- Estado `draft` → badge âmbar; `confirmed` → badge verde com data

- Lista colapsável dos meses anteriores

*`QuarterlyRecapDialog`** (acionado do `MemberDetails`)

- Wizard de 4 passos curtos:

  1. Revisar destaques + padrões (IA preenche, líder edita)

  2. Confirmar/ajustar classificação (4 opções)

  3. Definir risco de turnover + motivo (1 linha)

  4. Escolher próxima ação (select de 8 opções pré-definidas conforme classificação, igual ao canvas)

- Tempo alvo: 5 min. Header mostra "Baseado em 3 mensais confirmados + 12 notas"

*`RhitmoTimelineCard`** (novo, no dashboard do líder e em cada `MemberDetails`)

- Linha do tempo vertical: Notas → Mensais → Trimestrais → Reviews

- Cada item clicável abre o respectivo recap/review

- Dá ao líder a sensação de **acumulação** que falta hoje — o "construindo algo" do briefing

### 5. Nudges + Sidebar

- Novo nudge `monthly_recap_pending`: "X mensais aguardando sua confirmação"

- Novo nudge `quarterly_recap_pending`: "Trimestre fechou — 5 min para calibrar"

- Badge no sidebar (mesmo padrão do HR alert badge) para recaps pendentes do líder

### 6. i18n

Strings em PT/EN/ES para os 3 componentes, 2 nudges e o template de email opcional do recap mensal (reutiliza o pipeline `weekly-summary`).

## O que NÃO faz parte desta sprint

- Avaliação por dimensões/competências do Bloco 5 da Review (já existe via `competency_evaluations` — fica para sprint dedicada de Enterprise)

- Aprovação de RH antes de compartilhar (Enterprise)

- Auto-reflexão do liderado nos rituais (já temos `member_prompts` da S3 — integração explícita fica para próxima)

- Promoção/Mérito do Bloco 6 da Review formal (depende de calibração entre gestores)

## Critérios de aceite

- ✅ Schema: 2 tabelas novas + RLS validada (manager_id dono, HR Admin lê, liderado não vê)

- ✅ 3 edge functions deployadas com testes manuais bem-sucedidos

- ✅ 2 cron jobs ativos `monthly-recaps-generate` dia 1, `quarterly-recaps-generate` dia 1 dos meses de virada)

- ✅ `generate-formal-review` consome trimestrais quando existem

- ✅ `MonthlyRecapCard` e `QuarterlyRecapDialog` integrados em `MemberDetails`

- ✅ `RhitmoTimelineCard` no dashboard do líder

- ✅ Badge de recaps pendentes no sidebar

- ✅ i18n PT/EN/ES completo

- ✅ Linter Supabase sem novos warnings

## Considerações técnicas

- **Custo IA:** `google/gemini-2.5-flash` para mensais e trimestrais (volume baixo, contexto pequeno) — alinhado a `mem://monetization/modelo-economico-e-margens-abril-2026`

- **Anti-alucinação:** prompts seguem `RHITMO_IDENTITY` + `GUARDRAILS_PROMPT` da `_shared/rhitmo-constitution.ts`. Toda afirmação cita ID e data de origem. Sem evidência → omite seção

- **Idempotência:** unique constraint em `(member_id, period_month)` e `(member_id, period_quarter)` impede duplicatas; cron usa `ON CONFLICT DO NOTHING`

- **Privacidade Zero Trust:** recaps são **privados do líder** por design — alinhado a `mem://security/historical-data-visibility-integrity`. HR Admin tem read mas não pode editar

- **Reuso:** `automation_runs`, `cronAuth`, `dispatchNotification` e `RhythmWave + Lora + Inter` (DNA) já existentes

- **Performance:** índices em `(manager_id, period_month)` e `(manager_id, period_quarter)` para listagem

&nbsp;