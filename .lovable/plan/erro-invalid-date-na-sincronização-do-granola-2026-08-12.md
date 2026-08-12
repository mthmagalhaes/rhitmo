# Erro "Invalid date" na sincronização do Granola

## Gravidade: baixa, mas real

O erro não é cosmético só na aparência: **toda sincronização automática do Granola está falhando** desde a primeira importação. As notas só entraram porque você atribuiu manualmente. Enquanto o erro existir, o cron de 30 min não traz nada novo.

## Causa

O banco devolve a data da última sincronização no formato `2026-08-12 13:35:23.397+00` (com espaço). A API do Granola espera o formato ISO (`2026-08-12T13:35:23.397Z`) e rejeita com `VALIDATION_ERROR: created_after Invalid date`.

Confirmado: o valor gravado em `leader_note_taker_connections.last_synced_at` é exatamente `2026-08-12 13:35:23.397+00`, e o cliente envia esse texto cru no parâmetro `created_after`.

## Correção

1. No cliente do Granola, normalizar qualquer data recebida para ISO antes de montar a query (`new Date(valor).toISOString()`), ignorando o parâmetro se a data for inválida em vez de mandar lixo para a API.
2. Mesma normalização na marca d'água de sincronização, para não regravar formato inválido.
3. Limpar o `last_error` atual da conexão assim que a próxima sincronização terminar sem erro (o card volta a mostrar só "Sincronizado há X").

## Detalhes técnicos

- `supabase/functions/_shared/granolaClient.ts`: helper `toIso(v)` aplicado em `created_after` dentro de `listGranolaNotes`.
- `supabase/functions/_shared/noteTakerSync.ts`: `bumpWatermark` valida com `Number.isNaN(Date.parse(iso))` antes de comparar/gravar; `last_synced_at` gravado sempre via `toISOString()`.
- Nenhuma migration necessária.

## Verificação

Clicar em "Sincronizar agora" no card do Granola e confirmar que o erro vermelho desaparece e que notas novas (ou "nenhuma nota nova") aparecem sem falha.
