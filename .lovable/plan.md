
Diagnóstico objetivo:

- Não parece ser bug do Recall. A reunião some antes do Recall entrar no fluxo. Hoje a cadeia é: Google Calendar → `fetch-calendar-events` → match com liderados → grava `upcoming_meetings` → só depois agendamento/transcrição.
- Há um forte indício de bug na sincronização: a conexão do Google do líder está ativa e foi atualizada hoje, a Giovanna existe no workspace com `giovanna@fstr.co`, mas `upcoming_meetings` está vazia.
- Pelo código atual, os pontos mais prováveis são:
  1. a sync lê apenas `calendar/primary/events`;
  2. limita em `maxResults=20`;
  3. faz match exato por e-mail do attendee;
  4. quase não tem observabilidade para sabermos por que um evento foi descartado;
  5. o parser do link de reunião está incompleto;
  6. o OAuth do Calendar está usando um app Google não-branded/não verificado.

Plano recomendado:

1. Corrigir a ingestão das reuniões
- Em `fetch-calendar-events`, paginar resultados em vez de limitar a 20.
- Buscar também calendários relevantes além do `primary` (ou pelo menos tornar isso configurável).
- Adicionar logs estruturados por evento: veio do Google, tinha attendee, qual e-mail tentou casar, motivo do descarte.
- Persistir um campo de diagnóstico leve para debug (`match_reason` / `last_sync_status`) ou pelo menos logs claros.

2. Tornar o matching resiliente
- Normalizar e comparar organizer, attendees e aliases.
- Suportar e-mails alternativos dos liderados quando o convite vier por alias.
- Tratar casos em que o nome bate, mas o e-mail do evento não é exatamente o cadastrado.

3. Melhorar extração de link e UX
- Ler Meet link de `hangoutLink`, `conferenceData.entryPoints`, e fallback em `location`/descrição.
- Se houver eventos encontrados mas sem match, mostrar estado explicativo no card em vez de “Nenhuma reunião”.

4. Endurecer a integração com Recall
- Ajustar `join_at` para 10–15 minutos antes da reunião. A doc da Recall recomenda bots agendados com pelo menos 10 minutos de antecedência para garantir entrada.
- Considerar bots autenticados no Google Meet. A doc da Recall diz que, por padrão, bots no Meet precisam ser admitidos manualmente; autenticação melhora a entrada automática, embora isso não explique o sumiço da reunião no dashboard.

5. Resolver o problema “app não verificado” e o nome estranho no Google
- O problema não está no frontend; está na configuração do OAuth do Google usada pelo conector de calendário.
- Criar/usar um cliente OAuth próprio e branded do Rhitmo.
- Configurar no Google Cloud:
  - App name: Rhitmo
  - logo, support email, homepage `https://rhitmo.co`
  - Privacy Policy e Terms válidos
  - domínio autorizado/verificado
  - escopo de Calendar declarado corretamente
  - test users enquanto a verificação não sai
- Depois atualizar as credenciais/secrets usadas por `google-calendar-oauth`.
- Resultado esperado: some o nome interno “lybk…”, entram Rhitmo/políticas/termos, e o warning cai drasticamente; para remover totalmente o intersticial para todos, precisa concluir a verificação do app no Google.

Arquivos principais a ajustar:
- `supabase/functions/fetch-calendar-events/index.ts`
- `supabase/functions/google-calendar-oauth/index.ts`
- `src/components/dashboard/UpcomingMeetingsCard.tsx`

Decisão de produto/CTO:
- Eu não pediria para os usuários “reconectarem” como solução principal.
- Primeiro corrigimos sync + matching + branding.
- A reconexão só deve ser usada depois, para migrar usuários para o OAuth branded novo.

Validação após implementação:
- testar com a reunião da Giovanna hoje;
- validar se ela aparece no card;
- validar se o toggle de transcrição aparece;
- validar se o fluxo Google mostra “Rhitmo” e não o identificador interno;
- testar ponta a ponta um agendamento real no Meet.
