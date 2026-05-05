---
name: Context Page V2 — Executive Brief per Member
description: /lider/contexto agora é Master-Detail (MemberMasterList + ExecutiveBrief por liderado). Substituiu o feed cronológico cross-team por briefing curado por IA em 4 blocos (Ganhos, Riscos, Em movimento, Conversas) inspirado em Windmill Recaps. Edge function generate-context-brief lê context_evidence dos últimos 7/14/30d, chama Lovable AI (gemini-2.5-flash-lite via aiToolCall), faz cache em context_briefs (24h server + 1h client). Pulse vive em /lider/pulse, não mais aqui. Nudges (leader_nudges) são filtrados fora do briefing — são output do líder, não sinal sobre o liderado.
type: feature
---

## Estrutura (Sprint 13.1)

- **Layout**: Master-Detail full-bleed (segue `mem://design/dashboard/master-detail-pages`). MemberMasterList 260px + main com `max-w-3xl px-6 lg:px-8 py-6`.
- **Janela**: Selector 7d / 14d / 30d no header do briefing. Default 7d.
- **Geração**: Sob demanda quando líder abre o liderado. Cache 24h em `context_briefs` (unique key: member_id + window_days + window_start). Botão "Atualizar agora" passa `force_refresh: true` e ignora cache.
- **4 blocos fixos**: wins (verde), risks (âmbar), in_motion (índigo), conversations (sky). Cada item: 1 frase + chips numerados (1, 2, 3) que abrem `EvidenceDrawer` via `openEvidence(id)`.
- **AI**: `aiToolCall` com tool `emit_executive_brief`. Sanitiza evidence_ids para garantir que só IDs reais entrem (evita hallucination de citações).
- **Ownership backend**: edge function valida que `auth.uid() = teams.leader_user_id` OU é workspace owner (HR Admin). Service role só atua após esse check.

## O que saiu

- `useTeamTimeline` hook + RPC `get_team_timeline` (RPC continua no banco mas não é mais consumida).
- Componentes `EvidenceCard`, `SourceFilterChips`, `MemberFilterSelect` (não removidos do repo, mas sem usos).
- Banner explicativo Pulse↔Contexto.
- `SendPulseButton` — Pulse é uma feature inteira em `/lider/pulse`, não cabe na sticky bar.
- Feed cronológico flat de 23 cards mistos (causava ruído: nudges, notas que o próprio líder escreveu, conteúdo full do diário).

## Por que isso é melhor que o feed cronológico

1. **Sem ruído** — leader_nudges, notas próprias e duplicações somem. Resta o que importa pro líder agir.
2. **Por pessoa, não cross-team** — alinhado com Windmill Recaps. Líder pensa "quem é meu time" e cada um tem seu cockpit.
3. **Resumido, não bruto** — diário não vem como texto inteiro; vira "Maria reclamou da carga em 12/Mai" + chip clicável pra ler o original.
4. **Cacheado** — economiza chamadas IA. ~$0.0001 por brief com gemini-2.5-flash-lite.

## Próximos passos previstos (não implementados)

- Indicador visual na MemberMasterList: contagem de evidências da semana por liderado (ponto colorido extra ou número).
- Briefing geral do time no estado vazio (em vez de só copy explicativo).
- Atalho "Abrir 1:1" e "Gerar Avaliação" diretamente do header do briefing.
