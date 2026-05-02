## Ajustes no Pulse Wizard

Três correções pontuais sem mexer na arquitetura — o fluxo dos 5 passos fica intacto.

### 1. Dois "X" de fechar janela

**Causa:** o `DialogContent` do shadcn (`src/components/ui/dialog.tsx`) já injeta automaticamente um botão `<DialogPrimitive.Close>` no canto superior direito. O `PulseWizard` desenha um segundo X manual no header. Por isso aparecem dois.

**Correção:** remover o botão X manual do header do wizard e deixar só o nativo do `DialogContent`. Para manter o estilo do header limpo (com o título "Pulse Setup"), o close nativo já fica posicionado no canto correto. Aplicar a mesma checagem rápida em outros wizards/sheets fullscreen para garantir que o padrão "DialogContent já tem X" seja respeitado.

### 2. Tópicos no Passo 2 não se movem (drag handle decorativo)

**Causa:** o ícone `GripVertical` é puramente visual — não há listener de drag nem biblioteca de DnD plugada.

**Correção:** plugar drag-and-drop real usando `@dnd-kit/core` + `@dnd-kit/sortable` (já é o padrão do projeto em outras listas reordenáveis). Estados:
- Envolver a lista em `DndContext` + `SortableContext` (estratégia vertical).
- Cada `Topic` vira um `SortableItem` com handle no `GripVertical` (cursor-grab/grabbing).
- `onDragEnd` reordena o array `topics` via `arrayMove`.
- Manter botão "Adicionar tópico" e botão X (remover) intactos.

### 3. "0 liderados" para matheus.magalhaes@fstr.co (bug crítico)

**Diagnóstico no banco:** o usuário tem 4 teams como `leader_user_id` e 6 liderados ativos no workspace `27ee8977...`. A query do wizard deveria retornar 6, mas retorna 0.

**Causa raiz:** a query usa `.eq('workspace_id', workspaceId)` na tabela `team_members`, mas **`team_members` não tem coluna `workspace_id`** — só `teams` tem. PostgREST falha silenciosamente ou retorna vazio nesse caso. O mesmo erro existe em `PulseDetail.tsx` (linha 104, no `handleLaunch` quando `audience === 'everyone'`).

**Correção:** trocar o filtro para a coluna correta na tabela joinada:

```ts
// Antes
.from('team_members')
.select('id, name, teams!inner(leader_user_id)')
.eq('workspace_id', workspaceId!)         // ❌ coluna inexistente em team_members
.eq('teams.leader_user_id', userId!)

// Depois
.from('team_members')
.select('id, name, teams!inner(workspace_id, leader_user_id)')
.eq('teams.workspace_id', workspaceId!)   // ✅ filtra via join
.eq('teams.leader_user_id', userId!)
```

Aplicar nos dois lugares:
- `src/components/pulse/PulseWizard.tsx` (query `wizard-members`)
- `src/pages/lider/PulseDetail.tsx` (resolução de targets no `handleLaunch`)

Bônus: também checar `src/components/pulse/SendPulseModal.tsx` (linhas 85–87) por segurança — se tiver o mesmo padrão, corrigir.

## Detalhes técnicos

- **Arquivos alterados:**
  - `src/components/ui/dialog.tsx` — não muda (referência apenas)
  - `src/components/pulse/PulseWizard.tsx` — remove X duplo do header, troca filtro `workspace_id`, adiciona DnD nos tópicos
  - `src/pages/lider/PulseDetail.tsx` — troca filtro `workspace_id` no `handleLaunch`
  - `src/components/pulse/SendPulseModal.tsx` — auditoria/correção se necessário

- **Dependências:** `@dnd-kit/core` e `@dnd-kit/sortable` (verificar se já estão instaladas; se não, adicionar).

- **Memória a atualizar:** registrar uma nova memória `design/wizards/pulse-wizard-pattern` capturando o padrão validado (5 passos, max-w-3xl, header simples, barra de progresso fina, navegação Voltar/Próximo) para reaproveitamento em wizards futuros, conforme pediu o usuário.

- **QA manual após implementação:**
  1. Abrir wizard → confirmar 1 único X.
  2. Passo 2 → arrastar tópicos pra cima/baixo, confirmar reordenação.
  3. Passo 3 logado como matheus.magalhaes@fstr.co → contador "Todos os meus liderados (6)" e lista em "Pessoas específicas" com 6 nomes.
