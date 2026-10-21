# Avaliação formal em blocos: Cultura → Sinais & Rede → Rascunho Geral → Espelho

## O que muda para o líder
1. **Cultura** (como hoje): aceitar, editar, regenerar ou omitir cada valor.
2. **Sinais & Rede** (novo): a Rhitmo mostra cartões prontos do período com o que veio do Slack e da rede de colaboração:
   - Entregas e marcos
   - Bloqueios destravados (ou recorrentes)
   - Reconhecimentos recebidos
   - Rede: com quem mais colaborou, sinais de isolamento ou sobrecarga
   Cada cartão tem fontes clicáveis e as mesmas ações: Aceitar, Editar, Regenerar, Omitir. O botão "Avançar para Rascunho Geral" funciona mesmo sem aceitar nada.
3. **Rascunho Geral**: monta automaticamente usando só o que foi aceito na Cultura e em Sinais & Rede (+ anotações e 1:1s, como hoje).
4. **Espelho**: continua como aviso, nunca trava o compartilhamento.

Se o workspace não tem Slack conectado ou não há sinais no período, o bloco aparece com "Sem sinais do Slack neste período" e um botão para seguir. Nada fica travado.

## O que não muda (proteção contra quebras)
- Avaliações já criadas (inclusive as da Laís e da Gabriela) abrem iguais; o bloco Sinais só aparece nelas se o líder clicar em "Buscar sinais".
- Caminho "Rascunho completo" não muda.
- Cultura, Espelho, compartilhar, confirmar, PDF, renomear, revogar e excluir rascunho continuam como estão.
- O liderado nunca vê os cartões de sinais nem as mensagens do Slack; só o texto final compartilhado. Sem mensagens privadas.

## Etapas de entrega
1. Banco: nova tabela de cartões de sinais por avaliação (só o líder autor/dono lê e edita).
2. Servidor: novas ações `signals_init` e `signals_suggest` na função da avaliação guiada; a montagem passa a incluir cartões de sinais aceitos.
3. Tela: nova aba "Sinais & Rede" entre Cultura e Rascunho Geral, com o mesmo visual dos cartões de cultura e o indicador "Rhitmo está pensando".
4. Instruções da Rhitmo: novo modo para resumir sinais em `soul/` (bundle regenerado + teste de cobertura já existente).
5. Verificação: testes, publicação das funções e teste no navegador criando uma avaliação de teste (sem compartilhar).

## Detalhes técnicos
- Nova tabela `review_signal_items` (review_id, kind: delivery|unblock|recognition|network, content, status: pending|accepted|edited|skipped, doc_ids jsonb, position). RLS reutilizando a mesma checagem de autoria/liderança usada em `review_culture_items`; GRANT explícito. Separada de `performance_reviews` para não vazar ao liderado (mesma lógica de `review_mirror_checks`).
- `_shared/orgContext.ts`: nova `loadPeriodSignals(admin, memberId, start, end)` lendo `context_evidence` de origem Slack, resumos semanais e `team_network_edges`/`network_signals` (as mesmas fontes já usadas em `generate-formal-review`), com limites e `[doc:UUID]`. `loadPeriodEvidence` fica intacta.
- `culture-review-assist`: enum ganha `signals_init`/`signals_suggest`; `assemble` concatena cartões aceitos num bloco "SINAIS ACEITOS PELO LÍDER" só se existirem (sem cartões = prompt idêntico ao atual). Ownership check e `callAI`/`composeSystemPrompt` reaproveitados; Zod; `safeQuery`.
- `soul/modes/culture-guided-signals.md` + ajuste leve em `culture-guided-assemble.md`; rodar `regen-docs`, `regen-snapshots` e testes do loader.
- UI: `FormalReviewSheet.tsx` ganha aba; novo `SignalsGuidedPanel.tsx` espelhando `CultureGuidedPanel.tsx`. Montagem automática só dispara após o líder sair do bloco Sinais.
- Testes: Deno para `assemble` com e sem sinais (prompt sem sinais inalterado) e para filtro de cartões `skipped`.
