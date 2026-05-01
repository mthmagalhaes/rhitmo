---
name: Home Líder V3 (Windmill)
description: Home do líder (/lider/inicio) tem exatamente 3 seções nesta ordem — Account Setup, Próximas 1:1s, Histórico do Mentor; sem TeamTabs/Mirror/Setup checklist
type: design
---

## Princípio

A Home é cockpit de início de dia, não diretório de pessoas nem painel analítico. Inspiração direta: app.gowindmill.com home-v3.

## Estrutura fixa de `src/pages/Index.tsx` (rota `/lider/inicio`)

Hero strip permanece (saudação, badge de plano, stats chips, botões "Novo Membro" e "Nova Nota"). Dentro do `<main className="max-w-5xl ...">`, exatamente 3 seções nesta ordem:

1. **`<AccountSetupBento>`** — bento grid 4 cards: Conectar Slack, Convidar liderados, Adicionar canais Slack, Conectar Google Calendar. Botão "Dispensar" persiste em `localStorage` por workspace (`rhitmo:home:account-setup-dismissed:{workspaceId}`). Auto-some quando os 4 estão concluídos.
2. **Próximas 1:1s** — `CalendarCardBoundary` (UpcomingMeetingsCard com error boundary).
3. **`<MentorHistoryCard>`** — últimas 8 threads de `chat_threads` com `type in ('mentor','brief')` do líder; click → `/chat/{id}`; empty state com CTA para abrir Mentor.

## O que NÃO vai mais na Home

- `MirrorInsightCard` — pertence a `/lider/contexto` (lugar natural para análise de padrões cross-team).
- `SetupChecklist` (6 itens, antigo) — substituído pelo Account Setup focado em integrações.
- `TeamTabs` + grid "Seu Time" + empty state com vídeo demo — vivem em `/lider/pessoas`.
- `PendingTranscriptsCard` — banner contextual em `/lider/1on1s`.

## Regra mestra

A Home **nunca** duplica conteúdo de páginas dedicadas. Se um bloco já existe em `/lider/pessoas`, `/lider/contexto`, `/lider/1on1s`, ele NÃO aparece também em `/lider/inicio`.

## Fontes de verdade dos cards de Setup

| Card | Hook / Query | "Concluído" quando |
|---|---|---|
| Slack | `useSlackConnection().isConnected` | linha em `slack_integrations` para `effectiveUserId` |
| Convidar | `teamMembers.length > 0` | há ao menos 1 membro |
| Canais | `useSlackChannels()` count `is_member && !is_excluded` | >= 1 canal |
| Calendar | `useCalendarIntegration().isConnected` | linha em `google_calendar_tokens` |
