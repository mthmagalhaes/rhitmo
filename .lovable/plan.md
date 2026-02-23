
## Anotacao Multi-Liderado

### Visao Geral

Implementar selecao de multiplos liderados ao criar notas (do dashboard) e replicacao de transcricoes para outros liderados apos gravacao. Tres partes: NewNoteDialog multi-select, MeetingRecorder replicacao, e campo extra na Edge Function upload-meeting.

---

### Parte 1 -- NewNoteDialog: Multi-Select de Liderados

**Arquivo: `src/components/NewNoteDialog.tsx`**

**Novos estados:**
- `selectedMemberIds: string[]` -- inicializado com `[selectedMemberId]` se prop existir, senao `[]`
- `sharedMemberIds: string[]` -- controla quais membros recebem `visibility: 'shared'`

**Comportamento condicional:**
- Se `selectedMemberId` vier via prop (contexto /member/:id): manter Select simples atual, fluxo identico
- Se nao vier (dashboard): substituir Select por Popover + Command com checkboxes (shadcn/ui)

**Componente multi-select (apenas quando sem selectedMemberId):**
- Trigger: botao com badges dos nomes selecionados ou placeholder "Selecione liderados..."
- Dropdown: Command com CommandInput para busca, CommandItems com Checkbox para cada membro
- Badges selecionados com X para remover individualmente
- Minimo 1 liderado para habilitar botao Salvar

**Visibilidade multi-liderado:**
- Quando 1 liderado selecionado: manter Switch original "Compartilhar com colaborador?"
- Quando multiplos: substituir Switch por lista de checkboxes, um por liderado selecionado, controlando `sharedMemberIds`

**Submit (handleSubmit):**
1. Chamar `classify-note` uma unica vez (antes do loop)
2. Loop por cada `memberId` em `selectedMemberIds`:
   - INSERT em feedbacks com `member_id` iterado, mesmos content/title/tags
   - `visibility`: `sharedMemberIds.includes(memberId) ? 'shared' : 'private_leader'`
   - Disparar `analyze-feedback-background` fire-and-forget para cada feedbackId
3. Toast: 1 membro = comportamento atual; multiplos = "Nota salva para {n} liderados!"
4. `onSuccess()` chamado uma vez ao final
5. `backup-data` chamado apenas para o primeiro feedback
6. Remover toast "Backup Seguro Confirmado" (ruido desnecessario)

---

### Parte 2 -- MeetingRecorder: Replicacao pos-Gravacao

**Arquivo: `src/components/MeetingRecorder.tsx`**

**Novos estados:**
- `feedbackContent: string | null` -- texto da transcricao retornado pela Edge Function
- `feedbackId: string | null` -- id do feedback original
- `replicateMembers: string[]` -- membros selecionados para replicacao
- `replicateShared: Record<string, boolean>` -- controle de visibilidade por membro
- `isReplicating: boolean` -- estado de loading da replicacao
- `replicationDone: boolean` -- estado final apos replicar
- `allMembers: array` -- membros do workspace (exceto o atual)

**No estado 'done', apos sucesso:**
- Buscar `feedbackContent` e `feedbackId` da resposta da Edge Function (novo campo)
- Buscar team_members do workspace (exceto memberId atual) via query ao Supabase
- Exibir secao "Esta gravacao envolve outros liderados?" com lista de checkboxes
- Sub-toggle "Compartilhar com [nome]?" para cada membro selecionado
- Botao "Replicar para selecionados": INSERT em feedbacks para cada selecionado, disparar analyze-feedback-background
- Toast: "Nota replicada para {n} liderado(s)!"
- Apos replicar: mostrar estado "Concluido" em vez da lista
- Botao "Fechar" sempre visivel

**Query de membros:**
- Buscar via `supabase.from('team_members').select('id, name, role, teams!inner(workspace_id)')` filtrando pelo workspace do membro atual
- Excluir o `memberId` da lista

---

### Parte 3 -- Edge Function upload-meeting

**Arquivo: `supabase/functions/upload-meeting/index.ts`**

Unica mudanca: adicionar `feedback_content` na resposta final.

No return JSON, incluir:
```text
feedback_content: transcriptionText || null
```

Nenhuma outra alteracao na Edge Function.

---

### Arquivos Alterados

| Arquivo | Acao |
|---------|------|
| `src/components/NewNoteDialog.tsx` | Editar (multi-select, multi-submit, remover toast backup) |
| `src/components/MeetingRecorder.tsx` | Editar (secao de replicacao no estado done) |
| `supabase/functions/upload-meeting/index.ts` | Editar (campo feedback_content na resposta) |

### O que NAO muda

- Fluxo de NewNoteDialog quando selectedMemberId vem via prop
- MeetingRecorder nos estados idle/recording/uploading
- RLS policies
- FeedbackTimeline, MemberDetails, outras paginas
- Toast de classificacao automatica existente
- Nenhuma outra Edge Function
