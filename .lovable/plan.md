# Nomear anotação com o título da reunião + roadmap p/ ingestão direta

## 1. Título dinâmico da transcrição (entrega imediata)

Hoje, ao final do `bot.done`, o `recall-webhook` cria `feedbacks` sempre com `title: "Transcrição de reunião"` (linha 701). O título da reunião do Google Calendar já existe em `upcoming_meetings.title`, e o bot guarda `meeting_id` apontando pra essa linha.

### O que muda

`supabase/functions/recall-webhook/index.ts`:

1. **Buscar o título uma vez** logo após resolver `botRecord`, antes do loop de members:
   - Se `botRecord.meeting_id` → `SELECT title, start_time FROM upcoming_meetings WHERE id = ...`
   - Fallback: se não houver `meeting_id` (bot manual sem evento), tentar via `meeting_url` + `user_id`.
   - Se nada for encontrado → manter "Transcrição de reunião" como default seguro.

2. **Passar `meetingTitle` para `createTranscriptAndFeedback`** e usar como `title` do feedback:
   - Formato: `"{meetingTitle}"` puro (ex.: `"1:1 Matheus & Guto"`).
   - Truncar em ~120 chars para caber bem na UI do Diário/Contexto.
   - Sanitizar `null`/string vazia → fallback default.

3. **Manter `leader_notes: "Transcrição automática via Recall.ai"`** no `meeting_transcripts` (é metadado interno, não aparece como título na UI).

4. **Branch sem members matched** (linha 515-529): também usar o título resolvido no `leader_notes` opcional, mas sem criar feedback (comportamento atual preservado).

### Onde aparece o ganho

- `/lider/diario` (lista cronológica de notas) → cards mostram o nome real da reunião.
- `/lider/contexto` (timeline cross-member) → idem.
- `MemberProfileSheet` / `EvidenceDrawer` → idem.

Zero migração de banco — só edge function. Transcrições antigas mantêm o título genérico (aceitável; podemos rodar um backfill opcional depois se o Guto pedir).

## 2. Ingestão direta via Google Workspace (avaliação, sem build agora)

Pergunta do Guto: "se tivermos acesso ao Admin do Google Workspace, dá pra puxar as transcrições direto do Google em vez do bot Rhitmo?"

Resposta curta: **tecnicamente sim, mas com trade-offs importantes — não é um swap 1:1 do Recall.ai**.

### Como funcionaria

O Google Meet hoje gera transcrições nativas (recurso Gemini for Workspace / Meet Premium) e as salva como **Google Docs no Drive do organizador da reunião**. Existem duas APIs relevantes:

- **Google Meet API v2** (`conferenceRecords.transcripts.list`) — lista transcrições de cada conferência encerrada, com link pro Doc + entries estruturadas (speaker, timestamps).
- **Google Drive API** — busca o próprio Doc da transcrição quando precisamos do texto completo.

### Pré-requisitos do lado do cliente

- Plano Google Workspace que **inclua transcrição nativa** (Business Standard+/Enterprise/Gemini add-on). Sem isso, o Google simplesmente não gera transcript e a API retorna vazio.
- Transcrição precisa estar **ligada manualmente em cada reunião** (ou via política de Workspace forçando default on). Hoje é opt-in por reunião.
- Idioma: cobertura nativa do Google é menor que Recall (PT-BR funciona, mas qualidade varia por sotaque).
- **Admin consent OAuth** com escopos sensíveis: `meetings.space.readonly`, `drive.readonly`. Em workspaces estritos, isso passa por approval do admin (formulário OAuth verification do Google).

### Trade-offs Recall.ai vs. ingestão nativa

| Critério | Recall.ai (hoje) | Google Meet API direto |
|---|---|---|
| Funciona em qualquer plano Workspace | ✅ | ❌ (precisa Gemini/Business Standard+) |
| Funciona em Zoom / Teams | ✅ | ❌ (só Meet) |
| Detecção automática de líder presente | ✅ (já implementado) | ❌ precisa re-implementar via participants endpoint |
| Custo por reunião | ~$0.30 / 30min | $0 (cliente já paga Workspace) |
| UX "bot na sala" | Aparece como participante | Invisível — vantagem real |
| Latência até transcrição disponível | ~minutos após fim | Pode levar 10–60min após conferência |
| Identificação de speakers | Mapeada via roster Recall | `participant.signedinUser` (precisa cross-ref com `team_members`) |

### Recomendação

**Não trocar o Recall.ai — somar como segundo conector opcional.** Faz sentido como upsell para clientes Enterprise que:
- Não querem bot na sala por questão de compliance/UX;
- Já pagam Gemini for Workspace;
- Operam só no Meet.

### Plano sugerido (fase 2, não agora)

1. Nova tabela `workspace_meet_integrations` (workspace_id, admin_email, refresh_token criptografado, scopes).
2. Tela em `/lider/configuracoes` → seção "Google Meet (Workspace nativo)" para o admin autorizar.
3. Cron `fetch-meet-transcripts` (a cada 15min) que:
   - Lista `conferenceRecords` recentes;
   - Para cada uma com transcript pronto, baixa o Doc, formata, e cria `meeting_transcripts` + `feedbacks` reutilizando a mesma pipeline do Recall (`findAllMeetingMembers`, etc.).
4. Toggle por workspace: `meet_native | recall_bot | both` para decidir fonte preferida quando ambos estão disponíveis.

Quero validar antes de codar: faz sentido entregar **agora só o item 1** (título dinâmico) e deixar o item 2 num card de roadmap pra discutirmos depois com o Guto? Ou já topa investir nas duas frentes?

## Detalhes técnicos (parte 1)

- Arquivo único alterado: `supabase/functions/recall-webhook/index.ts`.
- Nova função helper `resolveMeetingTitle(supabaseAdmin, botRecord)` retornando `string` (já com fallback).
- Assinatura de `createTranscriptAndFeedback` ganha `meetingTitle: string`.
- Sem alteração de schema, RLS, ou tipos do front.
- Risco: nulo — fallback preserva comportamento atual.
