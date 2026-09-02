# Fase 1: correções pendentes e entrada na Fase 2

Auditoria da Fase 1: build OK, typecheck limpo, providers `granola` + `fireflies` no backend, coluna de fidelidade criada e páginas `/v2/conectores` e `/v2/billing` no ar. Quatro pontos ficaram incompletos ou errados.

## O que deu errado

1. **Rota `/v2` está pública.** Em `src/App.tsx` o shell v2 usa o wrapper `Public(...)`, enquanto todas as rotas equivalentes de líder usam `Leader(...)`. Quem não está logado consegue abrir a rota; a proteção hoje depende só da flag lida depois do carregamento.
2. **Chip de origem ainda diz "Granola" para nota do Fireflies.** `src/lib/diarySource.ts` tem um único tipo `granola` e o regex de detecção mistura os dois provedores, então nota importada do Fireflies aparece rotulada como Granola.
3. **Fidelidade não aparece em lugar nenhum além do card do conector.** A coluna existe e é gravada, mas nem o card de evidência nem a citação da avaliação formal mostram se a matéria-prima é fala literal ou resumo do provedor — que era o ponto da fase.
4. **Métrica de adoção não é emitida.** Nenhum evento é gravado em `onboarding_funnel_events` quando o líder conecta um note taker, então não dá para medir a taxa de conexão que decide a tese do pivot.

Fora isso, a tela v1 de configurações continua oferecendo só Granola. Isso é intencional (v1 congelado), mas vale confirmar.

## Correções

- Trocar o wrapper da rota `/v2` para o mesmo guard de líder usado em `/lider/*`, mantendo o redirecionamento por flag dentro do `V2Layout`.
- Generalizar a origem: `DiarySourceKind` ganha `note_taker` com rótulo por provedor, lendo o provedor gravado na evidência em vez de adivinhar por regex. Filtros do Anotações & Evidências passam a listar "Note taker" com sub-rótulo.
- Exibir fidelidade: selo discreto ("Fala literal" / "Resumo do provedor") no card de evidência e no drawer de evidência, e a mesma marcação no texto da citação gerada na avaliação formal.
- Emitir evento `note_taker_connected` (com provedor) em `onboarding_funnel_events` no fluxo de conexão, no backend.

## Depois: Fase 2 (preço e add-on)

Com a Fase 1 fechada, seguimos para preço: novo assento de R$ 29,90, add-on de bot por assento com horas inclusas, checkout e webhook sincronizando `seat_addons`, `/v2/billing` com toggle de bot por liderado e uso de horas, e `schedule-recall-bot` checando add-on ou trial antes de agendar.

## Detalhes técnicos

Arquivos: `src/App.tsx` (guard), `src/lib/diarySource.ts` + `src/components/leader/diario/DiaryFilters.tsx` + cards de evidência (origem e fidelidade), `supabase/functions/generate-formal-review/index.ts` (fidelidade na citação), `supabase/functions/note-taker-connect/index.ts` (evento de funil). Sem migração nova: `feedbacks.source_fidelity` e `onboarding_funnel_events` já existem. Padrão da skill `rhitmo-edge-function` mantido: CORS, `getUser`, ownership chain, `safeSupabase`.
