

## Replicar Nota para Liderados -- Menu da FeedbackTimeline

### Visao Geral

Adicionar opcao "Replicar para liderados" no menu de 3 pontinhos de cada nota na FeedbackTimeline. Ao clicar, abre um Dialog com multi-select de membros do workspace, controle de visibilidade individual, e replica a nota com analise de IA independente para cada liderado selecionado.

---

### Alteracoes no arquivo `src/components/FeedbackTimeline.tsx`

**Novos imports:**
- `Copy` de lucide-react
- `Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter` de ui/dialog
- `Checkbox` de ui/checkbox
- `Switch` de ui/switch
- `Label` de ui/label
- `ScrollArea` de ui/scroll-area
- `useAuth` de hooks/useAuth
- `useQuery` de @tanstack/react-query

**Novos estados (dentro do componente, que precisa deixar de ser stateless):**
```text
replicateDialog: { open: boolean, feedback: Feedback | null }
replicateTargets: string[]
replicateShared: Record<string, boolean>
isReplicating: boolean
```

**useAuth:** para obter `user.id` como `manager_id` nos inserts.

**useQuery:** buscar `team_members` do workspace (excluindo o `member_id` da nota selecionada). Query: `supabase.from('team_members').select('id, name, role')` -- a RLS ja filtra pelo workspace do owner.

**Novo item no DropdownMenu (antes do Excluir):**
- Icone Copy + texto "Replicar para liderados"
- `onClick`: abre o dialog setando o feedback selecionado

**Dialog de replicacao (renderizado uma vez fora do map):**
- Titulo: "Replicar nota para outros liderados"
- Subtitulo com o titulo da nota
- ScrollArea (max-h-[300px]) com lista de membros:
  - Checkbox + nome + cargo para cada membro
  - Quando marcado, sub-linha com Switch "Compartilhar com [nome]?"
- Footer: Botao Cancelar + Botao Replicar (disabled se nenhum selecionado ou isReplicating)

**Logica de replicacao (ao clicar Replicar):**
1. setIsReplicating(true)
2. Para cada memberId em replicateTargets:
   - INSERT em feedbacks com:
     - member_id: memberId
     - manager_id: user.id
     - content, title, tags, occurred_at, source: copiados da nota original
     - visibility: replicateShared[memberId] ? 'shared' : 'private_leader'
     - type: copiado da nota original
     - summary, sentiment, coaching_tips, bias_alert: null
   - Apos INSERT: fire-and-forget analyze-feedback-background
3. Toast: "Nota replicada para {n} liderado(s)!"
4. Fechar dialog, limpar estados
5. setIsReplicating(false)

**Estilo do Dialog:**
- DialogContent com classe `max-w-md`
- Lista de membros dentro de ScrollArea com max-h-[300px]
- Seguir padrao visual existente (bg-background, rounded-lg do DialogContent padrao)

---

### O que NAO muda

- Logica de Compartilhar/Tornar privado existente
- Logica de Excluir existente
- Botao Reanalisar (dev-only)
- BiasDetectionPanel
- Nenhum outro componente ou arquivo
- RLS policies
- Edge Functions

