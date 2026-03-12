

## Refatorar Meu Rhitmo — Dialog com Sidebar de Threads

Transformar o Meu Rhitmo de componente inline em um Dialog completo espelhando a estrutura do MentorChat, com botao em destaque no header.

---

### 1. Migracao: coluna `type` em `chat_threads`

Adicionar coluna `type` para diferenciar threads do lider (mentor) e do liderado (career):

```sql
ALTER TABLE chat_threads ADD COLUMN IF NOT EXISTS type text DEFAULT 'mentor';
```

Threads existentes ficam como `'mentor'` (default). Meu Rhitmo usara `type = 'career'`.

A thread antiga com `title = 'meu-rhitmo'` sera ignorada naturalmente pois a nova query filtra por `type = 'career'`.

---

### 2. Edge Function `meu-rhitmo` — aceitar `threadId`

Atualizar a edge function para:
- Aceitar `threadId` opcional no input (quando o usuario ja tem uma thread selecionada)
- Se `threadId` fornecido: usar diretamente para buscar historico e salvar mensagens
- Se nao: criar nova thread com `type: 'career'` e `title` baseado na primeira mensagem (truncada em 40 chars)
- Remover logica antiga de buscar thread por `title = 'meu-rhitmo'`
- `member_id` na thread pode ser o `memberId` do linked member (manter compatibilidade com a tabela)

---

### 3. Reescrever `MeuRhitmo.tsx` como Dialog com sidebar

Copiar a estrutura completa do `MentorChat.tsx` mas com as diferencas especificadas:

**Props:**
```typescript
interface MeuRhitmoProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberName: string;
  memberRole: string;
  workStyleData: any;
  aiAnalysis: any;
  pdiItems: any[];
  latestReview: string | null;
  userId: string;
}
```

**Identico ao MentorChat:**
- Dialog max-w-5xl h-[85vh] p-0
- Sidebar colapsavel (240px) com botao "Nova conversa" e collapse
- Lista de threads agrupadas por data (Hoje, Ontem, Ultima semana, Anteriores)
- Inline rename (Input ao clicar no icone Pencil)
- Delete thread com AlertDialog de confirmacao
- Hover actions nos threads (Pencil + Trash2)
- ScrollArea para mensagens
- User bubble com bg-muted/60 e initials
- Assistant com icone Sparkles (em vez de emoji alvo) e texto direto com ReactMarkdown
- Copy button no hover das respostas
- Loading dots animados
- Input pill com textarea auto-height + botao Send/ArrowUp
- Enter envia, Shift+Enter quebra linha

**Diferente do MentorChat:**
- Header: icone Sparkles + titulo "Meu Rhitmo" + Badge "Confidencial" (sem ContextPicker, sem nome de membro)
- Sem anexo de arquivo (sem Paperclip, sem VoiceInput)
- Quick suggestions especificas de carreira (5 opcoes)
- Empty state: saudacao personalizada para o liderado
- Placeholder: "Pergunte sobre sua carreira ou descreva uma situacao..."
- Rodape: texto de confidencialidade
- Edge function: `meu-rhitmo` (nao `chat-mentor`)
- Query key: `['meu-rhitmo-threads', userId]` — busca threads com `type = 'career'`
- Ao criar thread: insere com `type: 'career'`
- `member_id` vem do linked member (buscar via `linked_user_id`)
- Envio: POST para `meu-rhitmo` com `{ question, threadId, memberName, memberRole, workStyleData, aiAnalysis, pdiItems, latestReview }`

---

### 4. DirectReportDashboard.tsx — botao no header + remover inline

**Header (linhas 407-410):** Adicionar botao "Meu Rhitmo" no canto direito, ao lado do titulo:

```tsx
<div className="container mx-auto px-6 py-8 flex items-start justify-between">
  <div>
    <h1 ...>Ola, {displayName}! ...</h1>
    <p ...>Painel do Colaborador ...</p>
  </div>
  <Button onClick={() => setMeuRhitmoOpen(true)} variant="outline" className="gap-2">
    <Sparkles className="h-4 w-4" />
    Meu Rhitmo
  </Button>
</div>
```

**Estado:** Adicionar `const [meuRhitmoOpen, setMeuRhitmoOpen] = useState(false);`

**Tab Carreira (linhas 616-627):** Remover o `<MeuRhitmo ... />` inline.

**Proximas Acoes (linha 523):** Ao clicar em "Converse com o Meu Rhitmo", abrir o dialog (`setMeuRhitmoOpen(true)`) em vez de navegar para tab.

**Resumo card (linhas 501-508):** Ao clicar em "Meu Rhitmo", abrir o dialog.

**Instanciacao do Dialog:** Adicionar no final do JSX (antes do fechamento do `</div>` principal):

```tsx
<MeuRhitmo
  open={meuRhitmoOpen}
  onOpenChange={setMeuRhitmoOpen}
  memberName={displayName}
  memberRole={linkedMember.role}
  workStyleData={linkedMember.work_style_data}
  aiAnalysis={aiAnalysis}
  pdiItems={activePdiItems}
  latestReview={latestReviewContent ?? null}
  userId={user.id}
/>
```

Manter as queries `activePdiItems` e `latestReviewContent` que ja existem.

---

### Arquivos alterados

| Arquivo | Acao |
|---|---|
| Migracao SQL | Coluna `type` em `chat_threads` |
| `supabase/functions/meu-rhitmo/index.ts` | Aceitar threadId, criar threads com type='career' |
| `src/components/MeuRhitmo.tsx` | Reescrever como Dialog com sidebar de threads |
| `src/components/dashboard/DirectReportDashboard.tsx` | Botao no header, remover inline, abrir dialog |

### O que NAO muda

- MentorChat.tsx (zero alteracoes)
- chat-mentor Edge Function
- PDI, SkillsMapCard, Shared Review Flow
- Nenhum outro componente

