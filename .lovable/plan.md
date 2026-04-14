<final-text>
## Plano de correção: regressão do Google Calendar

### Diagnóstico mais provável
Encontrei uma regressão forte no frontend que explica exatamente o que você descreveu:

1. **Colisão de cache no React Query**
- `src/pages/Index.tsx` usa a query key `['upcoming-meetings', user?.id]` para ler a tabela `upcoming_meetings`.
- `src/hooks/useCalendarIntegration.ts` usa **a mesma key** `['upcoming-meetings', user?.id]` para chamar a edge function `fetch-calendar-events`.

Isso mistura **duas fontes diferentes** com o mesmo cache. Na prática:
- o card pode receber um **array do banco** quando espera um objeto `{ meetings, debug }`;
- `calendarData?.meetings` vira `undefined`;
- o componente cai no estado “Nenhuma reunião nas próximas 48h”;
- o botão **“Sincronizar” parece não fazer nada**, porque o refetch pode estar reaproveitando a query errada.

2. **Erros estão sendo mascarados como estado vazio**
- O hook não expõe `error`, `isError`, `isFetching` ou `isRefetching`.
- Se `fetch-calendar-events` falhar, a UI mostra vazio em vez de mostrar erro.
- Isso faz parecer que “não há reuniões”, quando pode haver falha real de sync.

3. **O botão “Sincronizar” não tem feedback visual**
- Hoje ele chama `refetchMeetings()`, mas o componente só usa `isLoading`.
- Em refetch manual, o estado correto seria `isFetching`/`isRefetching`.
- Resultado: o usuário clica e nada visível acontece.

4. **Há gaps secundários no backend**
- `fetch-calendar-events` ainda busca só no **calendar primary**; reuniões em calendário secundário/compartilhado ainda podem sumir.
- `schedule-recall-bot` ainda usa `getClaims` e `join_at` de 1 minuto antes, então a parte de transcrição/manual também está inconsistente.

---

## Plano de implementação

### 1. Restaurar o fluxo básico imediatamente
**Objetivo:** fazer o dashboard voltar a sincronizar de forma previsível.

**Arquivos:**
- `src/pages/Index.tsx`
- `src/hooks/useCalendarIntegration.ts`

**Mudanças:**
- Separar as query keys:
  - Dashboard/DB: `['upcoming-meetings-db', user?.id]`
  - Sync do Calendar: `['calendar-upcoming-meetings', user?.id]`
- Ou, preferencialmente, deixar o card/hook como **fonte única da verdade** para as reuniões visíveis e parar de competir com a query do banco.

### 2. Corrigir a UX do botão “Sincronizar”
**Objetivo:** o clique precisa mostrar que algo está acontecendo.

**Arquivos:**
- `src/hooks/useCalendarIntegration.ts`
- `src/components/dashboard/UpcomingMeetingsCard.tsx`

**Mudanças:**
- Expor `isFetching` / `isRefetching` / `isError` / `error`.
- Trocar o link simples “Sincronizar” por botão com spinner/estado desabilitado.
- Mostrar:
  - “Sincronizando...”
  - erro real quando a edge function falhar
  - vazio apenas quando realmente não houver eventos

### 3. Parar de mascarar falha como “nenhuma reunião”
**Objetivo:** diferenciar claramente:
- sem reuniões,
- falha de autenticação,
- falha na API do Google,
- eventos encontrados sem match.

**Arquivos:**
- `src/hooks/useCalendarIntegration.ts`
- `src/components/dashboard/UpcomingMeetingsCard.tsx`

**Mudanças:**
- Se `fetch-calendar-events` retornar erro, renderizar estado de erro com CTA de retry.
- Exibir mensagem mais precisa:
  - “Falha ao sincronizar calendário”
  - “Reconecte sua conta”
  - “Eventos encontrados, mas nenhum bateu com liderados cadastrados”

### 4. Endurecer a edge function de sync
**Objetivo:** depois de restaurar o fluxo, atacar os casos em que a reunião ainda não aparece.

**Arquivo:**
- `supabase/functions/fetch-calendar-events/index.ts`

**Mudanças:**
- Manter a autenticação com `getUser()`.
- Adicionar diagnóstico mais explícito no payload:
  - `events_found`
  - `matched`
  - `no_match`
  - `team_members_loaded`
  - `calendars_scanned`
  - motivo de descarte principal
- Corrigir a extração fallback de links.
- Expandir da agenda `primary` para calendários relevantes/compartilhados, para não depender só do calendário principal.

### 5. Corrigir a parte de Recall/transcrição
**Objetivo:** garantir que, depois que a reunião aparecer, o restante do fluxo funcione.

**Arquivo:**
- `supabase/functions/schedule-recall-bot/index.ts`

**Mudanças:**
- Trocar `getClaims` por `getUser()`.
- Ajustar `join_at` para 10 minutos antes.
- Manter comportamento consistente com o auto-transcribe.

---

## Ordem recomendada
1. **Separar query keys e consertar o card**
2. **Adicionar estados reais de sync/erro**
3. **Validar que o botão “Sincronizar” chama a edge function certa**
4. **Só depois ampliar para multi-calendar**
5. **Fechar o fluxo com Recall**

---

## Resultado esperado
Depois dessa correção:
- clicar em **Sincronizar** vai mostrar feedback real;
- a tela não vai mais mentir dizendo “nenhuma reunião” quando houver erro;
- a reunião da Giovanna volta a ter chance real de aparecer;
- o sistema deixa de competir entre banco e sync do Google;
- a transcrição volta a operar sobre uma base confiável.

---

## Arquivos a ajustar
- `src/pages/Index.tsx`
- `src/hooks/useCalendarIntegration.ts`
- `src/components/dashboard/UpcomingMeetingsCard.tsx`
- `supabase/functions/fetch-calendar-events/index.ts`
- `supabase/functions/schedule-recall-bot/index.ts`

---

## Validação após implementação
- abrir dashboard e verificar que o card não cai mais em vazio falso;
- clicar em **Sincronizar** e ver spinner/estado de progresso;
- confirmar chamada real de `fetch-calendar-events`;
- validar que uma falha de backend aparece como erro explícito;
- confirmar se a reunião de hoje com a Giovanna aparece;
- testar o botão/toggle de transcrição ponta a ponta.
</final-text>