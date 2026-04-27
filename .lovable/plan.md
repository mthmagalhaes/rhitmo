# Recovery do meeting + botão "Reprocessar" no UI

## Parte 1 — Recovery imediato (bot do Matheus)

Invocar `reprocess-meeting` com **service role** para o bot `75b92845-2acc-4ae2-af4e-2bac94469923` (já confirmado: transcrição existe na Recall, 5 liderados detectados via name-matching).

Resultado esperado: 5 transcrições + 5 feedbacks criados (Yasmin, Giovanna, Laís, Guilherme, Gabriela) com análise IA disparada em background. O bot passa de `skipped_no_leader` → `done`.

## Parte 2 — Botão "Reprocessar" no dashboard

### Onde aparece
No card de cada bot Recall (lista de reuniões gravadas no MemberDetails e/ou Dashboard), exibir o botão **"Reprocessar transcrição"** quando `status` for um destes:
- `skipped_no_leader`
- `failed`
- `done` (caso o líder queira re-distribuir após adicionar novos liderados)

### Comportamento
1. Líder clica → confirm dialog ("Isso irá baixar a transcrição novamente da Recall e redistribuir para os liderados detectados na reunião. Continuar?")
2. Chama `supabase.functions.invoke('reprocess-meeting', { body: { recallBotId } })` com auth do usuário (já suportado).
3. Toast de loading → sucesso ("X feedback(s) criado(s) para: [nomes]") ou erro.
4. Refetch da lista de bots e feedbacks.

### Arquivos a modificar
- **Localizar componente do bot card** (provavelmente em `src/components/MeetingRecorder.tsx` ou `src/components/dashboard/`) — usar `rg "recall_bots"` para confirmar.
- Adicionar botão `<Button variant="outline" size="sm">` com ícone `RefreshCw` da lucide-react.
- Criar handler `handleReprocess(botId)` com toast + invalidate de queries.

### Edge function
Nenhuma mudança — `reprocess-meeting` já aceita user auth e já usa o name-matching helper criado anteriormente.

## Parte 3 — Telemetria (opcional, mesma pass)
Adicionar log `console.log` no handler indicando origem (`source: 'manual_user_reprocess'`) para futura análise de quão frequente o auto-discovery falha.

## Próximos passos após aprovar
1. Executar recovery do bot do Matheus (curl service-role).
2. Implementar botão no card do bot.
3. Validar com o Matheus na próxima reunião.
