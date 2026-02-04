

## Plano: Renomear e Excluir Conversas no Mentor Chat

### Objetivo

Adicionar funcionalidade de gerenciamento de conversas na sidebar do MentorChat, permitindo renomear e excluir threads similar ao ChatGPT.

---

### Estado Atual

| Item | Situação |
|------|----------|
| Lista de threads | Renderiza apenas botão clicável |
| Ações de contexto | Não existem |
| Tabela `chat_threads` | Já possui coluna `title` atualizável |

---

### Parte 1: Adicionar Imports Necessários

Adicionar ao MentorChat.tsx:

```typescript
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
```

---

### Parte 2: Adicionar Estados de Controle

```typescript
const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
const [editingTitle, setEditingTitle] = useState('');
const [deletingThread, setDeletingThread] = useState<ChatThread | null>(null);
```

---

### Parte 3: Função de Renomear (handleRenameThread)

```typescript
const handleRenameThread = async (threadId: string, newTitle: string) => {
  if (!newTitle.trim()) return;
  
  try {
    const { error } = await supabase
      .from('chat_threads')
      .update({ title: newTitle.trim() })
      .eq('id', threadId);
    
    if (error) throw error;
    
    // Atualizar cache local imediatamente
    queryClient.setQueryData(['chat-threads', memberId], (old: ChatThread[] | undefined) => 
      old?.map(t => t.id === threadId ? { ...t, title: newTitle.trim() } : t) || []
    );
    
    toast({ title: 'Conversa renomeada' });
  } catch (error) {
    console.error('Erro ao renomear:', error);
    toast({ 
      title: 'Erro ao renomear', 
      description: 'Tente novamente.', 
      variant: 'destructive' 
    });
  } finally {
    setEditingThreadId(null);
    setEditingTitle('');
  }
};
```

---

### Parte 4: Função de Excluir (handleDeleteThread)

```typescript
const handleDeleteThread = async (thread: ChatThread) => {
  try {
    // Primeiro excluir mensagens da thread
    await supabase
      .from('mentor_messages')
      .delete()
      .eq('thread_id', thread.id);
    
    // Depois excluir a thread
    const { error } = await supabase
      .from('chat_threads')
      .delete()
      .eq('id', thread.id);
    
    if (error) throw error;
    
    // Se era a thread ativa, limpar seleção
    if (selectedThreadId === thread.id) {
      setSelectedThreadId(null);
    }
    
    // Atualizar cache
    queryClient.invalidateQueries({ queryKey: ['chat-threads', memberId] });
    
    toast({ title: 'Conversa excluída' });
  } catch (error) {
    console.error('Erro ao excluir:', error);
    toast({ 
      title: 'Erro ao excluir', 
      description: 'Tente novamente.', 
      variant: 'destructive' 
    });
  } finally {
    setDeletingThread(null);
  }
};
```

---

### Parte 5: Refatorar Renderização dos Itens da Sidebar

Substituir o botão simples por um componente com hover actions:

```tsx
{group.threads.map(thread => (
  <div 
    key={thread.id} 
    className="group relative"
  >
    {editingThreadId === thread.id ? (
      // Modo de edição inline
      <div className="flex items-center gap-1 px-2 py-1">
        <Input
          value={editingTitle}
          onChange={(e) => setEditingTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleRenameThread(thread.id, editingTitle);
            if (e.key === 'Escape') {
              setEditingThreadId(null);
              setEditingTitle('');
            }
          }}
          onBlur={() => handleRenameThread(thread.id, editingTitle)}
          autoFocus
          className="h-8 text-sm"
        />
      </div>
    ) : (
      // Modo normal com hover menu
      <button
        onClick={() => {
          setSelectedThreadId(thread.id);
          setIsCreatingNewThread(false);
        }}
        className={`w-full text-left px-3 py-2 rounded-lg text-sm truncate transition-colors flex items-center justify-between ${
          selectedThreadId === thread.id
            ? 'bg-primary/10 text-primary'
            : 'hover:bg-muted text-foreground'
        }`}
      >
        <span className="truncate">{thread.title}</span>
        
        {/* Botão de ações - aparece no hover */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              onClick={(e) => e.stopPropagation()}
              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-accent transition-opacity"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem 
              onClick={(e) => {
                e.stopPropagation();
                setEditingThreadId(thread.id);
                setEditingTitle(thread.title);
              }}
            >
              <Pencil className="h-4 w-4 mr-2" />
              Renomear
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={(e) => {
                e.stopPropagation();
                setDeletingThread(thread);
              }}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </button>
    )}
  </div>
))}
```

---

### Parte 6: Adicionar AlertDialog de Confirmação

Adicionar antes do fechamento do Dialog principal:

```tsx
{/* Dialog de confirmação de exclusão */}
<AlertDialog open={!!deletingThread} onOpenChange={() => setDeletingThread(null)}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Excluir conversa?</AlertDialogTitle>
      <AlertDialogDescription>
        Esta ação é irreversível. A conversa "{deletingThread?.title}" e todas as mensagens serão excluídas permanentemente.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancelar</AlertDialogCancel>
      <AlertDialogAction 
        onClick={() => deletingThread && handleDeleteThread(deletingThread)}
        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
      >
        Excluir
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

### Resumo das Alterações

| Arquivo | Alteração |
|---------|-----------|
| `src/components/MentorChat.tsx` | Adicionar imports, estados, funções de rename/delete, UI com DropdownMenu e AlertDialog |

---

### Seção Técnica

**Prevenção de Propagação de Eventos:**

O uso de `e.stopPropagation()` em três pontos é crucial:
1. No `DropdownMenuTrigger` - evita selecionar a thread ao abrir o menu
2. No `DropdownMenuItem` de renomear - evita selecionar a thread
3. No `DropdownMenuItem` de excluir - evita selecionar a thread

**Atualização Otimista do Cache:**

Para renomear, usamos `queryClient.setQueryData()` para atualizar imediatamente o estado local sem aguardar nova busca no banco. Isso dá feedback instantâneo ao usuário.

Para exclusão, usamos `invalidateQueries()` pois a estrutura da lista muda (item removido).

**Edição Inline:**

O modo de edição inline troca o botão por um Input que:
- Tem autoFocus para começar a digitar imediatamente
- Salva com Enter ou onBlur
- Cancela com Escape

**Fluxo Visual:**

```text
Usuário passa mouse sobre thread
         │
         ▼
┌─────────────────────────────────────┐
│ 📝 Análise de padrões...  [···]     │  ← MoreHorizontal aparece
└─────────────────────────────────────┘
         │ click [···]
         ▼
    ┌───────────────┐
    │ ✏️ Renomear   │
    │ 🗑️ Excluir    │
    └───────────────┘
         │
    ┌────┴────┐
    │         │
Renomear   Excluir
    │         │
    ▼         ▼
Input      AlertDialog
inline     confirmação
```

