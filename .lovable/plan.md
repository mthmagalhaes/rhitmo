# Crescimento: pesquisa de SEO (Semrush) + métricas de produto (PostHog)

## 1. Pesquisa de SEO para o mercado brasileiro (Semrush)
Pesquisa feita aqui no chat. Nada muda no site nesta etapa.
- Temas: avaliação de desempenho, 1:1, PDI, feedback, modelo de avaliação, ferramenta de gestão de pessoas.
- Para cada tema: volume de buscas estimado no Brasil, dificuldade, quem ocupa a primeira página e as perguntas que as pessoas fazem.
- Como estamos hoje: o que o rhitmo.co já aparece no Google e quais concorrentes diretos (ex.: Qulture.Rocks, Feedz, Gupy Clima/Performance, Factorial) ganham tráfego com isso.
- Resultado: uma tabela curta com 8 a 12 oportunidades, separando "melhorar uma página que já existe" (guias, gerador, modelo) de "criar uma página nova", e a ordem sugerida.

## 2. Métricas reais de uso no app (PostHog)
- Vai aparecer um cartão para conectar a sua conta PostHog (ou criar uma grátis).
- Depois disso, o app passa a registrar visitas de página e alguns momentos-chave do líder:
  - cadastro concluído e primeiro liderado convidado (já registrados hoje, passam a ir também para o PostHog);
  - avaliação guiada: aberta, Cultura concluída, Sinais concluído, Rascunho Geral pronto, Espelho visto, compartilhada;
  - "Pergunte à Rhitmo": pergunta enviada, resposta interrompida no "Parar";
  - nova anotação criada (por texto, print ou PDF) e conector ligado.
- Privacidade: nenhum texto de anotação, avaliação, transcrição ou conversa é enviado. Só o nome do evento, o papel (líder, RH, liderado) e a empresa por identificador. Sem gravação de tela.
- Nada liga para usuários impersonados pelo super admin.
- Funis prontos para montar no PostHog: cadastro → primeiro convite → primeira avaliação compartilhada.

## O que você precisa fazer
- Autorizar o cartão do PostHog quando ele aparecer.
- Ler a tabela de SEO e escolher quais páginas atacar primeiro.

## Detalhes técnicos
- Semrush: ferramentas internas `keyword_research`, `serp_analysis`, `domain_analysis`, `competitive_analysis` com database `br`, domínio `rhitmo.co`.
- PostHog: `standard_connectors--connect` (`posthog`), `bun add posthog-js`, novo `src/lib/productAnalytics.ts` com `init` (região pelo env, `autocapture: false`, `capture_pageview` via listener de rota, `disable_session_recording: true`, `mask_all_text: true`), `identify(user.id, { role, workspace_id })` no AccountContext e `reset()` no logout; `trackFunnel` em `analytics.ts` também chama `capture`; eventos novos chamados nos pontos já existentes (FormalReviewSheet `advanceStep`/compartilhar, MentorChat envio/parar, NewNoteDialog salvar). Se a chave não existir, tudo vira no-op (nada quebra).
- Registrar a regra em `AGENTS.md`: eventos de produto passam só por `productAnalytics.ts`, sem conteúdo sensível.
