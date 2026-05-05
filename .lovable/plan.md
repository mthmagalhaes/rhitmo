## Bug 1 — Botão "Gerar Pauta" sem handler (CRÍTICO)

**Causa:** orchestrator manda botão `action_id: 'prep_1on1_brief'` mas `slack-bot/index.ts` não tem case correspondente → log mostra `[INTERACT] Unhandled action: prep_1on1_brief`.

**Correção em `supabase/functions/slack-bot/index.ts`:**
1. Extrair lógica de `handleBriefCommand` num helper `buildBriefForMember(memberId, memberName, persona)` (reutilizável).
2. No switch de `block_actions` (~linha 1467), adicionar:
```ts
case 'prep_1on1_brief': {
  const [meetingId, memberId] = (action.value || '').split(':');
  const persona = await getUserPersona(slackUserId);
  if (persona.persona !== 'leader') {
    if (responseUrl) await sendDelayedResponse(responseUrl, { text: '❌ Apenas líderes geram pautas.' });
    break;
  }
  // Buscar nome do membro + validar ownership do meeting
  const { data: meeting } = await supabase
    .from('upcoming_meetings').select('member_id, title')
    .eq('id', meetingId).eq('user_id', persona.userId!).maybeSingle();
  if (!meeting?.member_id) { /* ephemeral erro */ break; }
  const { data: m } = await supabase.from('team_members').select('name').eq('id', meeting.member_id).single();
  const briefMsg = await buildBriefForMember(meeting.member_id, m?.name ?? 'Liderado', persona);
  if (responseUrl) await sendDelayedResponse(responseUrl, briefMsg, 'in_channel');
  break;
}
```

## Bug 2 — Erro genérico "non-2xx" no /slack/connect

**Causa:** Token HMAC expirado (>10 min) retorna 400 com `{error: 'Invalid or expired state token'}`, mas frontend mostra a mensagem do Supabase SDK ("Edge Function returned a non-2xx status code"), não o body.

**Correções:**
- `supabase/functions/slack-link/index.ts`: separar erros em `error_code: 'state_expired' | 'state_invalid'` no JSON, status 400.
- `src/pages/SlackConnect.tsx`: ao falhar, ler `data.error_code` (passar `data` mesmo no error path do invoke). Se `state_expired`, mostrar mensagem amigável: "Este link expirou (válido por 10 minutos). Volte ao Slack e digite `/rhitmo` para gerar um novo link." + botão "Abrir Slack" (deeplink `slack://open`).

## Bug 3 — App ID desatualizado nos docs

**Causa:** `mem://` e `docs/slack-app-manifest.md` referenciam `B0APL6ST719`, mas o app real visível em `api.slack.com/apps/A0AQ5F2HBPT/slash-commands` é outro.

**Correções:**
- `docs/slack-app-manifest.md`: atualizar Production app ID para `A0AQ5F2HBPT`.
- `mem://features/slack/command-ecosystem.md`: trocar app ID, anotar que `/meu-pdi` precisa ser adicionado manualmente no painel pelo Matheus.
- Atualizar `mem://index.md` se necessário.

## Não incluído (sprint separado)

Sprint 12.5 "Slack Conversational First" (chat LLM puro substituindo menu de botões) — fica para depois da decisão de pricing/Windmill, conforme combinado.

## Ação manual sua (após o deploy)

Em `api.slack.com/apps/A0AQ5F2HBPT/slash-commands` → **Create New Command**:
- Command: `/meu-pdi`
- Request URL: `https://lybkgujyezzzvbzypxed.supabase.co/functions/v1/slack-bot`
- Description: `Ver seu plano de desenvolvimento (liderados)`
- Marcar **Escape channels, users, and links** ✓
