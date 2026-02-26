

## Sprint 5.4 — Shared Review Flow

O liderado passa a ver avaliacoes formais compartilhadas pelo lider na tab "Feedbacks" do DirectReportDashboard.

---

### 1. Migracao de banco

Adicionar coluna `shared_with_member` a tabela `performance_reviews`:

```sql
ALTER TABLE performance_reviews 
ADD COLUMN IF NOT EXISTS shared_with_member boolean DEFAULT false;
```

Adicionar RLS policy para que o liderado (linked_user) possa ler avaliacoes compartilhadas:

```sql
CREATE POLICY "Linked members can view shared reviews"
ON performance_reviews FOR SELECT
USING (
  shared_with_member = true 
  AND EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.id = performance_reviews.member_id
    AND tm.linked_user_id = auth.uid()
  )
);
```

---

### 2. ReviewViewDialog.tsx — Botao Compartilhar/Revogar (painel do lider)

Adicionar `shared_with_member` a interface `PerformanceReview` e as props do componente.

No header do dialog, junto aos botoes existentes (Exportar PDF, Editar, Excluir), adicionar:
- Se `shared_with_member = false`: botao verde "Compartilhar com liderado" (icone Share2)
- Se `shared_with_member = true`: botao cinza "Revogar acesso" (icone EyeOff)

Handlers `handleShare` e `handleUnshare` fazem update na coluna e invalidam a query.

---

### 3. PerformanceReviewList.tsx — Badge de visibilidade

Na lista de avaliacoes do lider, incluir `shared_with_member` no select da query.

Para cada review com `shared_with_member = true`, exibir um Badge verde: "Visivel para o liderado".

---

### 4. DirectReportDashboard.tsx — Secao "Avaliacoes Formais" na tab Feedbacks

Abaixo dos feedbacks existentes, adicionar:
- Query `useQuery(['shared-reviews', linkedMember.id])` buscando `performance_reviews` onde `member_id = linkedMember.id` e `shared_with_member = true`
- Lista de cards clicaveis com titulo e data
- Empty state quando nao ha avaliacoes compartilhadas
- Estado `selectedReview` para abrir Dialog de leitura
- Dialog read-only com conteudo filtrado (sem "Dicas para Apresentacao") e botao "Exportar PDF"

Funcao `filterReviewForMember` remove blocos de coaching tips do conteudo markdown antes de exibir ao liderado.

---

### Arquivos alterados

| Arquivo | Acao |
|---|---|
| Migracao SQL | Adicionar coluna + RLS policy |
| `src/components/ReviewViewDialog.tsx` | Adicionar botoes Compartilhar/Revogar |
| `src/components/PerformanceReviewList.tsx` | Incluir `shared_with_member` na query + Badge |
| `src/components/dashboard/DirectReportDashboard.tsx` | Secao avaliacoes compartilhadas na tab Feedbacks |

### O que NAO muda

- Geracao de avaliacoes (NewReviewDialog)
- FeedbackTimeline, SkillsMapCard, CareerCompassCard
- Edge Functions existentes
- Demais componentes e paginas

