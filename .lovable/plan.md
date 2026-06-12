## Problema

A DM proativa de prep de 1:1 mostrou *"em 0h"* quando faltavam ~30 min para a reunião (13:30 → 14:00). Causa: `formatMeetingTime` arredonda `diffH` com `Math.round` e formata sempre em horas, então qualquer intervalo < 30 min vira `0h` e 30–89 min vira `1h` — pouco profissional.

Arquivo único: `supabase/functions/slack-rhitmo-orchestrator/index.ts`, função `formatMeetingTime` (linhas 51–70). Essa função alimenta todas as DMs de brief geradas pelo cron `*/30` — ou seja, a correção vale automaticamente para **todo líder com Slack conectado** (sem mudar a janela de envio do cron, sem mudar nada no schedule, sem migration).

## Mudança

Recalcular o relativo a partir de **minutos** e escolher a unidade mais natural:

- `< 1 min` → `"agora"`
- `1–59 min` → `"em X min"` (singular/plural: `"em 1 min"`, `"em 30 min"`)
- `1–11 h` → `"em Xh"` (usar `Math.round` aqui, igual hoje)
- `18–30 h` → `"amanhã"`
- demais casos → mantém `"em Xh"` (comportamento atual)

Resultado para o cenário do print: às 13h30 com reunião 14h00 → **"em 30 min"** em vez de "em 0h". E para chamadas muito coladas (ex.: 13h58 para 14h00) → **"agora"**.

## Detalhes técnicos

```ts
function formatMeetingTime(iso: string): { context: string; relative: string } {
  const start = new Date(iso);
  const diffMin = Math.round((start.getTime() - Date.now()) / 60000);
  const diffH = Math.round(diffMin / 60);

  const dateFmt = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'short',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  }).format(start);

  let relative: string;
  if (diffMin < 1)        relative = 'agora';
  else if (diffMin < 60)  relative = `em ${diffMin} min`;
  else if (diffH >= 18 && diffH <= 30) relative = 'amanhã';
  else                    relative = `em ${diffH}h`;

  return { context: `📅 ${dateFmt}`, relative };
}
```

Sem mudanças em copy fora dessa função, sem mudança no orquestrador, no `admin-test-orchestrator` (que não usa `relative`) ou no banco. Deploy: redeploy de `slack-rhitmo-orchestrator`.

## Validação

1. Rebuild + redeploy da edge function.
2. Disparar manualmente via `/admin` → "Testar orquestrador" (ou aguardar próxima janela `*/30`) com 1:1 a ~30 min: DM deve mostrar **"em 30 min"**.
3. Conferir caso > 1h (ex.: 2h) ainda mostra **"em 2h"** e caso 24h ainda mostra **"amanhã"**.
