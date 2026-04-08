

## Melhorias de Design — 3 Dashboards do Rhitmo

### Diagnóstico Visual (baseado nos screenshots em 67%)

**Líder (Tela 1)**: Layout funcional mas o card "Próximas 1:1s" domina 70% da viewport com background amarelo/creme que compete visualmente com o branding. Os cards de membros estão bem com proporção 3:4, mas há muito espaço vazio entre a seção de meetings e os membros.

**HR Admin (Tela 2)**: O banner de upgrade amarelo é visualmente agressivo e quebra a estética Creme/Bento. O empty state do calendário ocupa espaço excessivo. O Setup Checklist fica abaixo da dobra (below the fold), perdendo visibilidade.

**Liderado (Tela 3)**: A "Visão Geral" é a mais fraca — o card "Resumo" é uma lista estática de links disfarçados de métricas, e "Próximas Ações" são 3 CTAs hardcoded sem contexto real. Muito espaço vazio abaixo. Não há sensação de progresso ou momentum.

---

### Alterações Propostas

#### 1. Dashboard do Líder — Densidade informacional + cor

| Arquivo | Alteração |
|---------|-----------|
| `UpcomingMeetingsCard.tsx` | Remover background amarelo/creme. Usar `bg-card` com shadow padrão Bento. Limitar lista a 3 reuniões visíveis + "Ver mais N" colapsável. Reduz altura em ~40%. |
| `Index.tsx` | Adicionar um "greeting strip" no topo do Bento Grid: saudação contextual ("Boa tarde, Matheus") + micro-métricas inline (ex: "3 reuniões amanhã · 2 notas esta semana · 1 membro precisa de atenção"). Ocupa 1 linha, dá contexto imediato. |
| `ActivityPreview.tsx` | Se não há atividade recente, mostrar um micro empty state com ícone sutil em vez de card vazio. |

#### 2. Dashboard HR Admin — Hierarquia e banner

| Arquivo | Alteração |
|---------|-----------|
| `UpgradeBanner.tsx` | Redesign do banner: trocar amarelo por gradiente sutil `primary/5 → primary/10` com borda `primary/20`. Mais discreto e alinhado com a paleta Creme. |
| `Index.tsx` (seção HR) | Quando Setup Checklist existe, posicioná-lo ACIMA do Bento Grid (antes das meetings), não abaixo. É a ação mais importante para um novo user. |
| `SetupChecklist.tsx` | Adicionar uma progress bar visual no topo do checklist (ex: "2/5 concluídos") com animação de preenchimento, tornando-o mais motivacional. |

#### 3. Dashboard do Liderado — De estático para dinâmico

| Arquivo | Alteração |
|---------|-----------|
| `DirectReportDashboard.tsx` (Visão Geral) | Substituir o card "Resumo" por um **"Pulse Card"** com dados reais: último feedback recebido (data + tipo positivo/construtivo), progresso do PDI (X/Y itens concluídos com mini progress bar), e dias desde a última 1:1. Substitui os badges "Atualizar"/"Novo" por métricas reais. |
| `DirectReportDashboard.tsx` (Visão Geral) | Substituir "Próximas Ações" hardcoded por ações contextuais: se tem review não lida → "Leia sua avaliação"; se PDI tem item vencido → "Item X vence em 2 dias"; se não fez Rhitmo Sync → "Complete seu perfil". Quando tudo está em dia, mostrar mensagem positiva ("Tudo em dia! 🎉"). |
| `DirectReportDashboard.tsx` (Header) | Adicionar um subtítulo contextual abaixo de "Olá, Matheus!" com a última ação: "Último feedback recebido há 3 dias" ou "PDI 60% concluído". Dá sensação de continuidade. |

#### 4. Ajustes globais (afetam os 3 dashboards)

| Arquivo | Alteração |
|---------|-----------|
| `TeamMemberCard.tsx` | Adicionar um micro indicador de "invite pending" mais visível (ícone de envelope pulsando no canto, em vez de texto). |
| `AppSidebar.tsx` | No estado colapsado, garantir que o logo Rhitmo tenha padding adequado. Nos screenshots o logo fica muito colado ao topo. |

---

### Arquivos modificados

| Arquivo | Tipo |
|---------|------|
| `src/components/dashboard/UpcomingMeetingsCard.tsx` | Edit — remover bg amarelo, limitar a 3 items |
| `src/components/billing/UpgradeBanner.tsx` | Edit — redesign com paleta Creme |
| `src/components/SetupChecklist.tsx` | Edit — mover para cima + progress bar |
| `src/components/dashboard/DirectReportDashboard.tsx` | Edit — Pulse Card + ações contextuais |
| `src/pages/Index.tsx` | Edit — greeting strip + reordenar checklist |
| `src/components/TeamMemberCard.tsx` | Edit — indicador de invite |
| `src/components/AppSidebar.tsx` | Edit — padding do logo |

### Notas
- Zero alterações no banco de dados
- Todas as mudanças são puramente visuais e de UX
- Mantém o design system Creme/Bento existente, apenas refina a hierarquia e densidade

