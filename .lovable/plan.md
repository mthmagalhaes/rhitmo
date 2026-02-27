

## Sprint 5.7 — Meu Rhitmo (Parceiro Pessoal de Desenvolvimento)

Chat AI inline na tab "Minha Carreira" do liderado, com contexto personalizado e Edge Function dedicada.

---

### 1. Edge Function: `meu-rhitmo` (novo)

Criar `supabase/functions/meu-rhitmo/index.ts`

Estrutura simplificada vs `chat-mentor` (sem roteador semantico, sem context picker, sem multimodal):

- **Input**: `{ question, memberName, memberRole, workStyleData, aiAnalysis, pdiItems, latestReview, conversationHistory }`
- **Autenticacao**: Extrair user do token JWT via `createClient` com service role
- **Thread**: Buscar ou criar thread unica com `title = 'meu-rhitmo'` para o `user_id` + buscar `member_id` via `linked_user_id`
- **Historico**: Buscar ultimas 20 `mentor_messages` da thread para enviar como `conversationHistory`
- **System Prompt**: Prompt completo conforme especificado pelo usuario (Mentor de Carreira + Parceiro de Performance), com todas as variaveis de contexto injetadas
- **API**: Chamar OpenAI `gpt-4o` com max_tokens 1500 (mesmo modelo do chat-mentor)
- **Persistencia**: Salvar mensagem do usuario e resposta em `mentor_messages` com o `thread_id`
- **Retorno**: `{ response: string, threadId: string }`

Adicionar ao `supabase/config.toml` com `verify_jwt = true`.

---

### 2. Componente: `MeuRhitmo.tsx` (novo)

Criar `src/components/MeuRhitmo.tsx`

UI inline (Card, nao modal) com:
- Header com icone Sparkles + "Meu Rhitmo" + Badge "Confidencial"
- ScrollArea (h-80) com area de mensagens
- Empty state com saudacao e quick suggestions (5 opcoes de desenvolvimento pessoal)
- Mensagens do usuario com bolha primary (rounded-br-sm), respostas da IA com bolha muted + avatar Sparkles + ReactMarkdown
- Loading state com dots animados
- Input area: Textarea + botao Send (com Loader2 quando loading)
- Texto de confidencialidade no footer

**Props**: `memberName, memberRole, workStyleData, aiAnalysis, pdiItems, latestReview, userId`

**Logica interna**:
- `useState` para `messages`, `input`, `isLoading`
- Ao montar: fetch mensagens existentes da thread `meu-rhitmo` via Supabase query
- `handleSend`: POST para edge function `meu-rhitmo`, atualizar mensagens localmente, scroll to bottom
- Quick suggestions: ao clicar, dispara `handleSend` direto

---

### 3. Integracao na tab "Minha Carreira" (`DirectReportDashboard.tsx`)

Na tab `carreira`, apos o bloco do PDI (linha ~593), adicionar:

- Query `activePdiItems`: buscar items ativos do PDI do membro (reutilizar dados ja carregados de `devItems`)
- Query `latestReview`: buscar `content` da review mais recente compartilhada
- Renderizar `<MeuRhitmo ... />` com props derivadas dos dados do linkedMember

---

### 4. Renomear referencias na tab "Visao Geral"

- Linha 481: "Career Coach" -> "Meu Rhitmo"
- Linha 503: "Converse com o Career Coach sobre seu desenvolvimento" -> "Converse com o Meu Rhitmo"
- Adicionar `onClick` no item "Meu Rhitmo" das Proximas Acoes para navegar para tab `carreira`

---

### Arquivos alterados

| Arquivo | Acao |
|---|---|
| `supabase/functions/meu-rhitmo/index.ts` | Criar Edge Function com prompt personalizado |
| `supabase/config.toml` | Registrar nova funcao (automatico) |
| `src/components/MeuRhitmo.tsx` | Criar componente de chat inline |
| `src/components/dashboard/DirectReportDashboard.tsx` | Integrar MeuRhitmo + renomear referencias |

### O que NAO muda

- MentorChat.tsx e chat-mentor (lider)
- SkillsMapCard, PDI, Shared Review Flow
- Rhitmo Sync dialog
- Todas as outras tabs e componentes

