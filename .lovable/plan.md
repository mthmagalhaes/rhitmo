
## Sprint 5.3 — SkillsMapCard na tab "Minha Carreira"

### Arquivos alterados
1. **`src/components/dashboard/SkillsMapCard.tsx`** (novo)
2. **`src/components/dashboard/DirectReportDashboard.tsx`** (editado)

---

### 1. Criar SkillsMapCard.tsx

Novo componente com as props `aiAnalysis`, `memberId`, `onReanalyze`, `isReanalyzing`.

Layout:
- **Cabecalho**: icone Compass + titulo "Bussola de Carreira" + botao "Re-analisar" com RefreshCw/Loader2
- **Data da analise**: texto com `analyzed_at` formatado em pt-BR, com alerta amber se > 90 dias
- **Resumo narrativo**: bloco `bg-muted/40 rounded-xl` com texto italico entre aspas
- **Grid 2 colunas**: "Pontos de Atencao" (fundo orange-50) e "Foco Recomendado" (fundo primary/5), cada um com lista de bullet points coloridos
- **Empty state**: quando `aiAnalysis` e null, exibir icone + texto + botao "Gerar analise"
- **SEM score numerico**, sem barra de progresso

Helpers internos: `formatDate` e `isOlderThan90Days`.

### 2. Editar DirectReportDashboard.tsx

**Imports**: Adicionar `SkillsMapCard`, adicionar `RefreshCw` ao import do lucide. Adicionar `useAuth` para acessar `user.id`.

**Estado**: Adicionar `isReanalyzing` state.

**Handler `handleReanalyze`**:
- Chama `supabase.functions.invoke('analyze-job-crafting')` com `role`, `responsibilities`, `aspirations`, `interests` do `linkedMember.skills_data`
- Salva resultado em `skills_data.ai_analysis` via update na tabela `team_members` (filtro `linked_user_id = user.id`)
- Invalida query `['linked-member']`
- Toast de sucesso/erro

**Tab "Minha Carreira" (linhas 336-347)**: Substituir o conteudo atual (CareerCompassCard + placeholder) por:
- `SkillsMapCard` com as props conectadas
- Card placeholder com borda dashed para "Skills Map detalhado, PDI e Career Coach chegam em breve."

### O que NAO muda
- `CareerCompassCard.tsx` permanece intacto (usado pelo lider)
- Tabs, FeedbackTimeline, syncDialog, tab Meu Perfil
- Nenhum outro arquivo
