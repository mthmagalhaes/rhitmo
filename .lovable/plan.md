

# Sprint 4 — Closing: Prompt v2 + Calibração no Sheet + i18n Rhitmo

Antes de executar, faço a validação visual que você pediu. Se os 3 critérios passam, sigo direto na implementação. Se algum falhar, paro e te conto o que vi antes de mexer em qualquer coisa.

## Fase 0 — Validação visual (gate)

Abro o preview e checo, em ordem:

1. **Tab Rhitmo no MemberDetails** — navego até `/team/<id>` de um membro real, clico na tab "Rhitmo" e confirmo que `MonthlyRecapSection` + `QuarterlyRecapSection` renderizam sem erro de console.
2. **Empty state do `RhitmoTimelineCard`** — busco um membro com ≥3 feedbacks no último mês e sem mensal. Confirmo que o card mostra "Você tem N notas de [mês] sem resumo" + CTA "Gerar Rhitmo Mensal".
3. **Badge `low_evidence` em âmbar** — gero um mensal num período com <3 evidências e confirmo que o card do `MonthlyRecapSection` mostra o aviso âmbar com `AlertTriangle` antes da confirmação.

Resultado da validação vai num parágrafo curto. Se algo quebrar, paro aqui.

## Fase 1 — Prompt v2 da Avaliação Formal (7 blocos)

Reescrevo o `systemPrompt` em `supabase/functions/generate-formal-review/index.ts` para gerar os 7 blocos da imagem aprovada:

1. Resumo Executivo (narrativo, 3-5 linhas — não lista)
2. Principais Contribuições (top 3-5 entregas com fonte citada)
3. Padrões Observados (positivos + negativos, vindo dos trimestrais)
4. Pontos de Desenvolvimento (linguagem cuidadosa — alvo do Bias Detection)
5. Avaliação por Dimensões (tabela: O que entregou / Como trabalhou / Como cresceu / Onde precisa evoluir; substituída por competências quando `job_role_id` presente)
6. Classificação, Promoção e Mérito (IA sugere com justificativa de 1 linha — gestor confirma na nova aba Calibração)
7. Próximos Passos (uma ação concreta para o próximo ciclo)

Mantém a regra de ouro de citar fonte (`<span class="evidence-tag">`), e instrui o modelo a usar os recaps confirmados como espinha (lógica que já existe na hidratação). Os ícones SVG novos (`ICON_CONTRIBUTIONS`, `ICON_PATTERNS`, `ICON_DIMENSIONS`, `ICON_CLASSIFICATION`) já existem no arquivo — só falta usar nos placeholders.

CSS dos blocos novos (`.dimension-table`, `.classification-grid`, `.merit-suggestion`, `.contribution-item`, `.pattern-item`) entra como estilos inline numa tag `<style>` no topo do `RichTextEditor` ou como utilitários em `src/index.css` no escopo `.review-content`.

## Fase 2 — Aba Calibração no `FormalReviewSheet`

Hoje o Sheet tem 2 abas (`Rascunho Geral` / `Competências`). Adiciono a 3ª aba **Calibração** (`activeTab === 'calibration'`):

- `TabsList` passa de `grid-cols-2` para `grid-cols-3`
- Novo `TabsContent value="calibration"` renderiza `<ReviewCalibrationPanel reviewId={reviewId} initial={...} disabled={review.acknowledged_at} />` (componente já existe)
- Os 4 valores (`classification`, `promotion_recommendation`, `loss_risk`, `merit_recommendation`) vêm direto do `review` carregado (colunas já existem no schema)
- `disabled` quando `acknowledged_at` está setado — depois de confirmada pelo liderado, calibração vira read-only

## Fase 3 — i18n dos componentes Rhitmo

Migro os 3 componentes para `useTranslation('rhitmo')` usando o namespace que já está pronto em PT/EN/ES:

- `MonthlyRecapSection.tsx` → `t('recap.monthly.*')`
- `QuarterlyRecapSection.tsx` → `t('recap.quarterly.*')` + `t('recap.classifications.*')` + `t('recap.risks.*')` + `t('recap.actions.*')`
- `RhitmoTimelineCard.tsx` → `t('recap.timeline.*')`
- `ReviewCalibrationPanel.tsx` → `t('review.calibration.*')`
- Datas: trocar `locale: ptBR` hardcoded por helper que escolhe o locale via `useLocale()` (padrão já estabelecido em `mem://i18n/implementacao-tecnica`)

`recapActions.ts` continua exportando as keys cruas (`improvement_plan_30_60_90`, etc.) — a tradução acontece no componente que renderiza, não na lib.

## Detalhes técnicos

- **Edge Function:** `generate-formal-review/index.ts` — só muda o `systemPrompt` e a hidratação dos novos placeholders. Hidratação dos recaps já está no formato certo.
- **Frontend novos arquivos:** nenhum. Edita `FormalReviewSheet.tsx`, `MonthlyRecapSection.tsx`, `QuarterlyRecapSection.tsx`, `RhitmoTimelineCard.tsx`, `ReviewCalibrationPanel.tsx`, `src/index.css`.
- **Sem migration:** schema já tem as 4 colunas de calibração (`classification`, `promotion_recommendation`, `loss_risk`, `merit_recommendation`). i18n locales já existem.
- **Compatibilidade:** reviews antigas (HTML de 4 blocos) continuam abrindo no Sheet — só o gerador novo produz 7 blocos. Sem breaking change.
- **Privacidade:** sem mudança de RLS — `performance_reviews` permanece privado do líder até `shared_with_member=true`.

## Critérios de aceite

- [ ] Validação visual (3 checks acima) reportada antes da execução
- [ ] Nova review formal sai com os 7 blocos
- [ ] Aba Calibração funciona no `FormalReviewSheet` e salva nas 4 colunas
- [ ] Strings dos 4 componentes vêm do namespace `rhitmo` em PT/EN/ES
- [ ] Trocar idioma no header reflete imediatamente nos componentes Rhitmo
- [ ] Reviews antigas continuam abrindo sem regressão

