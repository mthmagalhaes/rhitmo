

## Plano: Corrigir /brief, /mentor, /meu-rhitmo e Adicionar Tag Slack

### Diagnóstico

**`/mentor` — Erro 400**: O slack-bot envia `{ message, userId }` mas a Edge Function `chat-mentor` exige `{ question, feedbacks, memberName }`. Payload incompatível.

**`/brief` — Erro**: O comando `/brief` em si funciona (não chama IA), mas o erro ocorreu porque o membro mencionado (`@matheus.magalhaes`) não foi encontrado como `team_member` no workspace. Logs confirmam: `user_not_found`. Isso é esperado se o usuário Slack não está cadastrado como membro de time. O handler de `/brief` já é robusto — o problema é de dados, não de código. Porém, a mensagem de erro exibida nas screenshots diz "Erro ao consultar o mentor", o que indica que pode haver um bug no roteamento que está chamando o handler errado, ou a mensagem genérica está confundindo. Vou investigar e garantir mensagens de erro distintas.

**`/meu-rhitmo`**: Provavelmente funciona (é direto no DB, sem IA), mas precisa de teste. O único risco é se o liderado não estiver vinculado.

**Tag Slack no Diário de Bordo**: O campo `source: 'slack'` já é salvo na tabela `feedbacks` pelo handler `/nota`. Falta apenas exibir um ícone/badge no `FeedbackTimeline.tsx`.

---

### Alterações

#### 1. Corrigir `/mentor` no slack-bot (Crítico)

**Arquivo**: `supabase/functions/slack-bot/index.ts`

O handler `handleMentorCommand` precisa:
- Buscar feedbacks recentes do DB para o líder (como o frontend `MentorChat.tsx` faz)
- Buscar dados do membro se mencionado
- Enviar o payload correto: `{ question, feedbacks, memberName, memberRole, managerName, workStyleData, contextMode: 'auto' }`
- Adicionar tratamento de erro robusto com mensagens claras

#### 2. Adicionar badge "Slack" no Diário de Bordo

**Arquivo**: `src/components/FeedbackTimeline.tsx`

- Detectar `feedback.source === 'slack'`
- Exibir um badge com ícone do Slack (usando `SlackIcon` já existente em `src/components/icons/SlackIcon.tsx`) ao lado da data, similar ao badge "Transcrição"

#### 3. Melhorar mensagens de erro do `/brief`

**Arquivo**: `supabase/functions/slack-bot/index.ts`

- Garantir que a mensagem de erro do `/brief` diz "Membro não encontrado" e não "Erro ao consultar o mentor"

#### 4. Re-deploy da Edge Function

Deploy automático após as alterações.

---

### Ordem de execução
1. Fix `/mentor` handler (payload correto para `chat-mentor`)
2. Adicionar badge Slack no `FeedbackTimeline`
3. Revisar mensagens de erro do `/brief`
4. Deploy e validação

