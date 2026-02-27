

## Sprint 5.5 — PDI Interativo com Protagonismo do Liderado

O liderado propoe seus objetivos de desenvolvimento. O lider valida. Nao o contrario.

---

### 1. Migracao de banco

**Duas tabelas novas** com RLS:

```sql
-- development_plans
CREATE TABLE development_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid REFERENCES team_members(id) ON DELETE CASCADE,
  created_by_member boolean DEFAULT true,
  status text DEFAULT 'draft',
  proposed_at timestamptz,
  approved_at timestamptz,
  leader_comment text,
  period_label text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- development_items
CREATE TABLE development_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid REFERENCES development_plans(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  category text,
  status text DEFAULT 'pending',
  due_date date,
  completed_at timestamptz,
  leader_note text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**RLS policies** (6 policies):

- **Liderado SELECT/INSERT/UPDATE** em `development_plans`: via `linked_user_id = auth.uid()` join em `team_members`
- **Lider SELECT/UPDATE** em `development_plans`: via workspace owner join (padrao existente). Lider NAO pode INSERT (apenas o liderado cria)
- **Liderado SELECT/INSERT/UPDATE** em `development_items`: via join `development_plans -> team_members` onde `linked_user_id = auth.uid()`
- **Lider SELECT/UPDATE** em `development_items`: via workspace owner join

---

### 2. DirectReportDashboard.tsx — Secao PDI na tab "Minha Carreira"

Substituir o card placeholder "Skills Map detalhado, PDI e Career Coach chegam em breve" por secao "Meu Desenvolvimento" com tres estados:

**Estado "sem plano":**
- Card com icone Sprout, texto motivacional, pre-populate com aspiracoes do Rhitmo Sync
- Botao "Propor meu PDI" abre dialog de criacao

**Estado "pending_approval":**
- Card com borda esquerda amber, badge "Aguardando aprovacao do lider"
- Lista de itens read-only com dots coloridos por categoria (azul=aprender, roxo=praticar, verde=entregar)

**Estado "active":**
- Card com badge verde "Aprovado pelo lider"
- Comentario do lider em destaque se existir
- Botoes de acao por item: "Iniciar" e "Concluir"
- Itens concluidos com line-through e badge emerald

**Queries necessarias:**
- `useQuery(['my-dev-plan', linkedMember.id])` busca `development_plans` onde `member_id = linkedMember.id` e status != 'completed', com items via segunda query
- `useQuery(['my-dev-items', planId])` busca `development_items` onde `plan_id = planId`

**Estado local:** `showPDIDialog` para controlar o dialog de criacao.

---

### 3. Componente NewPDIDialog (novo arquivo)

`src/components/NewPDIDialog.tsx`

Dialog com:
- Campo `period_label` (input texto)
- Lista dinamica de itens (max 5), cada um com: `title` (obrigatorio), `category` (select: Aprender/Praticar/Entregar), `description` (textarea opcional), `due_date` (date picker opcional)
- Botao "+ Adicionar objetivo" e botao de remover item
- Footer: Cancelar + "Enviar para aprovacao"

Ao submeter:
1. Insert em `development_plans` com `status: 'pending_approval'`, `proposed_at: now()`
2. Insert em `development_items` (batch)
3. Toast de sucesso
4. Invalidar queries
5. Fechar dialog

---

### 4. MemberDetails.tsx — Card de aprovacao do lider

Na pagina `/member/:id`, adicionar card "PDI Proposto" quando houver plano com `status = 'pending_approval'`.

**Query:** `useQuery(['member-dev-plan', memberId])` busca planos pendentes do membro.

**Card:** Borda esquerda primary, lista de itens com labels de categoria, campo de comentario opcional (Textarea), dois botoes:
- "Pedir ajuste" — atualiza status para 'draft' com `leader_comment`
- "Aprovar PDI" — atualiza status para 'active', `approved_at: now()`, salva `leader_comment`

Posicionar este card logo acima das Tabs "Diario de Bordo / Avaliacoes Formais" (abaixo do Accordion e acima do conteudo principal).

---

### 5. Notificacoes

Sem tabela `notifications` existente, usar abordagem leve:
- **Liderado propoe PDI:** `console.log` no lado do lider (visivel quando ele abre o perfil do membro via query)
- **Liderado conclui item:** toast no lado do liderado apenas
- **Lider aprova:** toast no lado do liderado (ja que esta no contexto da sessao)

Nao bloquear o fluxo principal com notificacoes.

---

### Arquivos alterados

| Arquivo | Acao |
|---|---|
| Migracao SQL | Criar tabelas + RLS policies |
| `src/components/NewPDIDialog.tsx` | Criar dialog de proposta do PDI (novo) |
| `src/components/dashboard/DirectReportDashboard.tsx` | Secao PDI na tab Minha Carreira (substituir placeholder) |
| `src/pages/MemberDetails.tsx` | Card de aprovacao do PDI para o lider |

### O que NAO muda

- SkillsMapCard, CareerCompassCard
- SharedReviewFlow (Sprint 5.4)
- FeedbackTimeline
- Rhitmo Sync dialog
- Edge Functions existentes
- Nenhum outro componente

