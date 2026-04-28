## Causa raiz (confirmada nos logs)

A Edge Function `google-calendar-oauth` está quebrando no início do fluxo `authorize` com:

```
TypeError: supabaseAdmin.rpc(...).catch is not a function
    at index.ts:69:68
```

Linha culpada (linha 64 do arquivo):
```ts
await supabaseAdmin.rpc("cleanup_expired_oauth_states").catch(() => {});
```

**Por que quebra:** o builder retornado por `supabase.rpc(...)` é um `PostgrestBuilder` "thenable", não uma `Promise` real. Ele expõe `.then()` (por isso `await` funciona em quase todos os lugares), mas **não expõe `.catch()`**. Encadear `.catch(() => {})` direto no builder dispara `TypeError` em runtime — que é exatamente o que aconteceu com o Matheus e vai acontecer com **todo usuário** que clicar em "Conectar Google Calendar".

Isso explica o toast "Erro ao conectar / Não foi possível iniciar a conexão com o Google Calendar" — a função 500a antes mesmo de gerar a `authUrl`, então o front nunca recebe a URL pra redirecionar pro Google.

Esse bug é universal (não é específico do Matheus, da conta `fstr.co`, nem do Lovable Preview). Está em produção, em `rhitmo.co`, bloqueando 100% das novas conexões de calendário desde o último deploy que introduziu essa linha.

## Correção

Trocar o `.catch()` no builder por `try/catch` em volta do `await`. Cleanup de nonces expirados é "best effort" — não pode derrubar o fluxo de autorização.

### Mudança em `supabase/functions/google-calendar-oauth/index.ts` (linha 64)

De:
```ts
await supabaseAdmin.rpc("cleanup_expired_oauth_states").catch(() => {});
```

Para:
```ts
try {
  await supabaseAdmin.rpc("cleanup_expired_oauth_states");
} catch (cleanupErr) {
  console.warn("Best-effort cleanup_expired_oauth_states failed:", cleanupErr);
}
```

## Hardening adicional (mesma função, mesmo deploy)

Aproveitar a edição para blindar o resto do arquivo contra a mesma classe de bug e melhorar diagnóstico:

1. **Auditar todos os `.catch(` da função** — confirmar que nenhum outro está encadeado direto em builder do Supabase (`from().select()`, `from().delete()`, `rpc()`). Se houver, converter pro mesmo padrão `try/catch`.

2. **Mensagem de erro mais útil no front** — hoje o `useCalendarIntegration.connectCalendar` mostra um toast genérico ("Não foi possível iniciar a conexão"). Vou propagar a mensagem real vinda da Edge Function (quando existir) pra facilitar diagnóstico futuro pelo usuário e pelo suporte. O erro técnico continua no console; o toast ganha o motivo legível.

3. **Validação de variáveis de ambiente no boot** — adicionar checagem explícita no início da função para `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `SUPABASE_SERVICE_ROLE_KEY`. Se faltar alguma, retornar 500 com mensagem clara em vez de estourar `TypeError` no `!` non-null assertion. Previne uma classe inteira de "tela vermelha sem explicação" em deploys futuros.

## Arquivos afetados

- `supabase/functions/google-calendar-oauth/index.ts` — fix do `.catch`, hardening de env vars, log melhor.
- `src/hooks/useCalendarIntegration.ts` — propagar mensagem real do erro pro toast em `connectCalendar`.

## Validação pós-deploy

1. Verificar logs da Edge Function (`supabase--edge_function_logs google-calendar-oauth`) — não deve mais aparecer `TypeError`.
2. Testar fluxo: clicar "Conectar Google Calendar" → deve redirecionar pro consent screen do Google sem toast vermelho.
3. Confirmar com o Matheus (matheus.magalhaes@fstr.co) que a conexão completa.

## Por que isso é bloqueante para a verificação Google

Sem essa correção, o vídeo de demonstração do OAuth que você precisa gravar para o Google Cloud Console **não tem como ser gravado** — o fluxo quebra no primeiro clique. Esse fix precisa subir antes da regravação do vídeo.
