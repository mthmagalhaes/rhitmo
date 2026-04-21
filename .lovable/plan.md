

# Sprint 4 — Fechamento do Rhitmo Core + Avaliação Formal v2

Olhando o que está em produção vs. plano + imagem, faltam **3 itens de fechamento** dos rituais e **1 evolução grande** na Avaliação Formal (template de 7 blocos).

## 1. Fechar a tab Rhitmo no MemberDetails (5 min de trabalho real)

A `TabsTrigger value="rhitmo"` existe, mas **não existe `TabsContent value="rhitmo"`** — clicar na aba mostra vazio. Adicionar:

```tsx
<TabsContent value="rhitmo">
  <div className="space-y-8">
    <MonthlyRecapSection memberId={member.id} />
    <QuarterlyRecapSection memberId={member.id} />
  </div>
</TabsContent>
```

## 2. Agendar os 2 cron jobs (pg_cron + pg_net)

Edge functions `generate-monthly-recap-cron` e `generate-quarterly-recap-cron` já existem, mas **nenhum agendamento foi criado** no banco.

- Adicionar entradas no `supabase/config.toml` com `verify_jwt = false` (são chamadas pelo pg_cron sem auth de usuário, validação acontece via `x-cron-secret`)
- Inserir os 2 schedules via SQL `cron.schedule(...)` com `net.http_post` e header `x-cron-secret`:
  - `rhitmo-monthly-recaps-generate` — `0 9 2 * *`
  - `rhitmo-quarterly-recaps-generate` — `0 9 2 1,4,7,10 *`

## 3. i18n PT-BR / EN / ES das novas strings Rhitmo

Hoje as strings dos componentes (`MonthlyRecapSection`, `QuarterlyRecapSection`, `RhitmoTimelineCard`) estão hardcoded em PT. Externalizar em namespace `rhitmo.recap.*` nos 3 locales para alinhar com `mem://i18n/arquitetura-e-resolucao` e `mem://i18n/implementacao-tecnica`.

Strings: títulos das seções, labels dos 3 blocos do mensal, classifications/risks/actions, badges (Confirmado / Rascunho / Poucas evidências), CTAs (Gerar / Confirmar / Regerar / Salvar rascunho), texto do TimelineCard (3 estados).

## 4. Avaliação Formal v2 — Template de 7 blocos da imagem

A imagem mostra um template muito mais estruturado do que o atual (4 blocos: Resumo / Pontos Fortes / Desenvolvimento / Próximos Passos). O novo template tem **7 blocos**:

1. **Visão geral do período** — parágrafo narrativo de 3-5 linhas (não lista) descrevendo o arco do colaborador
2. **Principais contribuições** — top 3-5 entregas concretas com impacto + fonte citada, ordenadas por relevância
3. **Padrões observados** — IA cruza acompanhamentos trimestrais; o que apareceu de forma recorrente positivo + negativo (este bloco mais se beneficia do dado longitudinal dos trimestrais)
4. **Pontos de desenvolvimento** — Bias Detection ativo aqui sublinhando linguagem subjetiva e sugerindo reformulação
5. **Avaliação por dimensões** — tabela com 4 dimensões padrão:
   - **O que entregou** (resultados concretos · action items · entregas)
   - **Como trabalhou** (comportamentos · feedbacks · notas de 1:1)
   - **Como cresceu** (evolução vs. ciclo anterior · comparação com acompanhamentos anteriores)
   - **Onde precisa evoluir** (padrões de atenção que se repetiram · pontos dos resumos mensais)
   - *No Enterprise:* dimensões substituídas pelas competências do framework do RH por cargo, com nível esperado vs. observado por senioridade (já temos `competency_frameworks` + `job_roles`)
6. **Classificação, promoção e mérito** — IA sugere, gestor confirma:
   - Classificação: Precisa subir / Dentro / Subindo / Acima do esperado *(reusa `RecapClassification`)*
   - Promoção: Não neste ciclo / Em 1-2 ciclos / Pronta agora + risco de perda (Baixo/Médio/Alto)
   - Mérito: Sem ajuste / Somente inflação / Inflação + mérito
   - Cada sugestão vem com justificativa de 1 linha baseada no histórico
7. **Próximos passos** — gestor define, IA sugere baseado em classificação + padrões; uma ação de desenvolvimento para o próximo ciclo

### Implementação

- **Edge Function `generate-formal-review`**: reescrever o `systemPrompt` para gerar HTML dos 7 blocos (em vez dos 4 atuais), mantendo o conector de SVG icons (`{{ICON_*}}`). Adicionar 3 novos placeholders: `{{ICON_CONTRIBUTIONS}}`, `{{ICON_PATTERNS}}`, `{{ICON_DIMENSIONS}}`, `{{ICON_CLASSIFICATION}}`. A hidratação dos recaps já funciona — só muda o output.

- **Estrutura de classes CSS** (a estilização já existe via `review-section`): adicionar `dimension-table`, `classification-grid`, `merit-suggestion`. Estilos vão em `src/components/review/FormalReviewSheet.tsx` (CSS-in-component) ou `src/index.css`.

- **Persistir a calibração estruturada**: hoje a review guarda só `content` (HTML) + `competency_evaluations` (jsonb). Adicionar 3 colunas em `performance_reviews`:
  - `classification text` (mesma enum dos recaps)
  - `promotion_recommendation text` (`not_now` / `in_1_2_cycles` / `ready_now`)
  - `loss_risk text` (`low` / `medium` / `high`)
  - `merit_recommendation text` (`none` / `inflation_only` / `inflation_plus_merit`)

  Permite filtros futuros no `HRDashboard` ("times com mais 'precisa subir'", calibração entre gestores no Enterprise).

- **UI de calibração no `FormalReviewSheet`**: adicionar 3 selects para o gestor confirmar a sugestão da IA antes de "Compartilhar com o liderado". Reutiliza padrão visual do `QuarterlyRecapSection`.

- **Bias Detection ativo no Bloco 4**: o componente `BiasDetectionPanel` já existe e roda em notas. Aplicar o mesmo `useBiasDetection` no textarea do bloco "Pontos de desenvolvimento" quando o gestor edita.

## 5. Auto-trigger de nudge "Mensal pronto" (ajuste fino, opcional)

Quando o líder confirma um mensal hoje, não dispara nada. Considerando que o conceito do Rhitmo é "ciclo que se alimenta", adicionar trigger Postgres `after_monthly_confirm`:
- Se for o **3º mensal confirmado do trimestre**, criar nudge "Trimestral pronto para gerar — você tem 3 mensais validados".

Isso é o que faz o líder voltar sem precisar do cron mensal. Pequeno ajuste de schema, alto impacto comportamental.

## Considerações técnicas

- **Schema migrations:**
  - 4 colunas em `performance_reviews` (classification, promotion_recommendation, loss_risk, merit_recommendation)
  - Trigger `after_monthly_confirm` para auto-nudge trimestral

- **Edge functions:**
  - `generate-formal-review/index.ts` — reescrever prompt para 7 blocos + ícones novos
  - 2 entradas novas em `supabase/config.toml` (`generate-monthly-recap-cron`, `generate-quarterly-recap-cron`) com `verify_jwt = false`

- **Frontend:**
  - `MemberDetails.tsx` — adicionar `<TabsContent value="rhitmo">` faltante
  - `FormalReviewSheet.tsx` — UI dos 3 selects de calibração + estilos das novas seções
  - `BiasDetectionPanel` integrado no textarea do bloco 4
  - i18n: 3 locales (PT-BR, EN, ES) com namespace `rhitmo.recap.*` e `rhitmo.review.*`

- **SQL via insert tool (não migration, contém URL+anon key):** os 2 schedules `cron.schedule(...)`

- **Reuso máximo:** `RecapClassification` (ja em `lib/recapActions.ts`) reusada no Review v2; ícones SVG seguem padrão do `generate-formal-review` atual; CSS reusa `review-section`/`section-header`; `useBiasDetection` já existe e só pluga no textarea novo.

- **Privacidade:** sem mudança de RLS — `performance_reviews` já é privada do líder até `shared_with_member=true`; novos campos seguem o mesmo regime.

- **Compatibilidade:** reviews antigas (com 4 blocos) continuam abrindo no `FormalReviewSheet` — o HTML é renderizado como está; só novas reviews usam o template de 7 blocos.

## Critérios de aceite

- [x] Tab "Rhitmo" no MemberDetails renderiza Monthly + Quarterly sections
- [x] `psql` consegue listar `rhitmo-monthly-recaps-generate` e `rhitmo-quarterly-recaps-generate` na `cron.job`
- [x] Strings dos 3 componentes Rhitmo (Monthly, Quarterly, Timeline) externalizadas em PT/EN/ES
- [x] Nova review formal sai com os 7 blocos da imagem
- [x] UI de calibração no FormalReviewSheet (classification + promotion + merit) salva nas 3 colunas novas
- [x] Bias Detection sublinha linguagem subjetiva no bloco "Pontos de desenvolvimento"
- [x] Trigger auto-nudge dispara quando 3º mensal de um trimestre é confirmado
- [x] Linter Supabase sem novos warnings

