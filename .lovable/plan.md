# Remover as DMs proativas de "Gerar Pauta" no Slack

Hoje o Rhitmo manda uma DM automática por 1:1 agendada ("Vi que você tem uma 1:1 com X em 2h... Gerar Pauta"). Com várias 1:1s no dia isso vira flood. Vamos parar de enviar essas DMs para todos os líderes.

## O que muda

- O bot não envia mais DM automática antes de cada 1:1.
- Gerar pauta continua funcionando **sob demanda**: comando `/rhitmo`, DM direta pra Rhitmo ("gera a pauta da minha 1:1 com a Erika") e o botão de brief dentro da plataforma seguem intactos.
- Nada muda no brief exibido na plataforma nem na geração de conteúdo.

## O que não muda

- Nenhum dado é apagado. O histórico de 1:1s, briefs e evidências fica igual.
- Outras rotinas do orquestrador (ex.: alertas de Pulse) permanecem como estão.

## Detalhes técnicos

1. `supabase/functions/slack-rhitmo-orchestrator/index.ts`
   - Remover `runBriefRoutine()` e sua chamada no handler; remover `buildBriefDmBlocks` e as constantes só usadas por ela.
   - Resposta do endpoint passa a reportar apenas as rotinas restantes (`processed.pulses`), mantendo `ok: true`.
2. `supabase/functions/admin-test-orchestrator/index.ts`
   - Remover o teste que dispara o DM de brief (ou deixá-lo apontando só para as rotinas remanescentes), para não sobrar um caminho que ainda envia a mensagem.
3. Handler `generate_agenda` em `supabase/functions/slack-bot/index.ts` **permanece** — é o que atende os pedidos sob demanda.
4. A coluna `upcoming_meetings.brief_dm_sent_at` fica no banco (sem migration), evitando quebra em queries existentes; apenas deixa de ser escrita.
5. Redeploy das edge functions alteradas.
