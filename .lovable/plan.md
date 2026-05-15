## Diagnóstico

A regressão veio do hardening anti-IDoR do `chat-mentor` (modo `leader_self`) feito recentemente:

```
supabase/functions/chat-mentor/index.ts:419-448
```

Esse bloco agora **exige um JWT de usuário real** via `authClient.auth.getUser()` e força `leaderUserId === user.id`.

Mas o `slack-bot` chama o `chat-mentor` server-to-server usando a `SUPABASE_SERVICE_ROLE_KEY`:

```
supabase/functions/slack-bot/index.ts:233-246
fetch(`${supabaseUrl}/functions/v1/chat-mentor`, {
  headers: { Authorization: `Bearer ${serviceKey}` },
  body: JSON.stringify({ mode: 'leader_self', leaderUserId, ... })
})
```

Resultado: `auth.getUser()` no service-role JWT retorna `null` → `chat-mentor` responde **401 Unauthorized** → o slack-bot cai no fallback genérico:

> ⚠️ Tive um problema ao puxar o contexto do seu time agora. Pode tentar de novo?

Isso explica:
- Toda DM autenticada pra Rhitmo (LLM + RAG via `leader_self`) está quebrada.
- O espelhamento Slack→Web (`mirrorSlackTurnToWebThread`) também não roda, porque depende de uma resposta válida.
- O outro erro do print (`Membro com Slack ID U08RFSY3F29 não encontrado`) é um **sintoma secundário**: como o LLM não responde, a frase "quero registrar uma nota sobre o Gui" cai num caminho de fallback que tenta resolver `Gui` como mention de Slack.

## Plano de correção

### 1. Reabrir um canal "trusted server-to-server" no `chat-mentor` (sem reabrir IDoR)

Em `supabase/functions/chat-mentor/index.ts`, no bloco `if (mode === 'leader_self')`:

- Detectar caller interno via header `x-internal-secret` comparado a uma env var (reusar `INTERNAL_FUNCTION_SECRET` se já existir; senão criar). 
- Se o secret bater **E** o body trouxer `leaderUserId`:
  - Confirmar que o `leaderUserId` realmente existe (`auth.admin.getUserById` ou consulta a `profiles`) e que tem persona de líder/owner — evita IDoR mesmo via service role.
  - Pular o `auth.getUser()` e seguir o fluxo com `leaderUserId` como confiável.
- Se o secret não estiver presente, manter o fluxo atual (JWT do usuário obrigatório). Zero regressão pra chamadas vindas do front.

### 2. Atualizar `slack-bot` pra usar o canal interno

Em `supabase/functions/slack-bot/index.ts` (função `callDmMentor`, ~linha 233):

- Adicionar header `x-internal-secret: ${Deno.env.get('INTERNAL_FUNCTION_SECRET')}`.
- Manter `Authorization: Bearer ${serviceKey}` (necessário pro Supabase aceitar a invocação da edge function).
- Garantir que `payload.leaderUserId = persona.userId` (já está).

### 3. Auditar outras chamadas server-to-server pro `chat-mentor`

Buscar em `supabase/functions/**` outras invocações pro chat-mentor (orchestrator, weekly summary, meu-rhitmo etc.) e aplicar o mesmo header onde também precisarem do modo `leader_self` — não inventar novos callers, só blindar os que já existiam antes do fix de segurança.

### 4. Validação

- `supabase--curl_edge_functions` em `chat-mentor` simulando o slack-bot:
  - Sem header interno + service key → continua 401 (regressão de segurança intacta).
  - Com header interno + leaderUserId válido → 200 com resposta do LLM.
- Testar no Slack: DM autenticada pra Rhitmo deve voltar a responder (LLM + RAG + histórico espelhado em `chat_threads`).
- Confirmar que chamadas do front (`/lider/mentor`) seguem funcionando — não foram tocadas.

### 5. Memória

Atualizar `mem://features/slack/conversational-state-machine.md` com a nota de que o caller server-to-server precisa do `x-internal-secret`, pra evitar que o próximo hardening de segurança quebre o Slack de novo.

## O que **não** vou mexer

- Não vou reverter o fix de IDoR — ele continua válido pra chamadas vindas do navegador.
- Não vou tocar no resolver de membros (`U08RFSY3F29`) nesse passo: é sintoma secundário; volta sozinho assim que o LLM responder. Se persistir depois do fix, abro como follow-up.
- Não vou mexer no front da web nem em nenhum fluxo do `/lider/diario` que acabamos de migrar.