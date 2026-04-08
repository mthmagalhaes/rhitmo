

## Protótipo: Dashboard do Líder — Redesign inspirado no 15five

### Conceito

Criar uma nova página `/dashboard-v2` como protótipo isolado, sem alterar o dashboard atual. Usa a **disposição e elementos do 15five** (hero strip contextual, seções com overline labels, cards com padding generoso, tipografia editorial) mas mantém a **paleta Rhitmo** (roxo #7C3AED, creme #F5F3EE, foreground #1A1035).

### O que muda visualmente vs. o dashboard atual

| Aspecto | Atual | Novo (15five-inspired) |
|---------|-------|----------------------|
| Header | Título + botões inline, denso | Hero strip com saudação editorial (font-serif), subtítulo contextual, CTAs pill |
| Layout | Bento Grid 8/4 fixo | Seções empilhadas full-width com overline labels ("SEU TIME", "PRÓXIMAS 1:1s") |
| Cards de membros | Grid 4 colunas, aspect-ratio 3:4 | Cards horizontais mais largos (2 colunas), com avatar + métricas inline |
| Meetings | Card único grande | Seção compacta com lista horizontal de "chips" de reunião |
| Activity | Card lateral pequeno | Seção "Atividade Recente" com timeline vertical sutil |
| Tipografia | Inter apenas | Lora (serif) para títulos de seção, Inter para body — editorial feel |
| Spacing | gap-6, padding p-6 | Padding mais generoso (p-8/p-10), spacing entre seções 48-64px |
| Botões | rounded-full com shadow | Pill buttons (rounded-full, h-12, px-8) — mais respiração |

### Alterações

#### 1. Nova página `src/pages/DashboardV2.tsx`
Página protótipo completa que reutiliza os mesmos hooks e queries do `Index.tsx` (workspace, teams, members, meetings) mas com layout totalmente novo:

- **Hero Strip**: Fundo `bg-accent` (tint roxo leve), saudação com hora do dia ("Boa tarde, Matheus"), micro-métricas contextuais (N liderados, N reuniões hoje, N notas esta semana), CTAs "Nova Nota" e "Novo Membro" como pill buttons
- **Seção "Próximas 1:1s"**: Overline label uppercase, chips horizontais de reunião (badge de tempo + nome + link Meet), max 4 visíveis
- **Seção "Seu Time"**: Overline label, grid 2 colunas de cards horizontais — cada card com avatar, nome, cargo, health dot, última nota, contagem de feedbacks. Hover com lift sutil
- **Seção "Atividade"**: Timeline vertical com nudges e syncs, empty state com ícone sutil
- **Setup Checklist**: Se incompleto, aparece como banner hero no topo com progress bar

#### 2. Rota temporária em `App.tsx`
Adicionar rota `/dashboard-v2` apontando para `DashboardV2` — permite comparar lado a lado sem quebrar nada.

#### 3. Não altera nenhum componente existente
Todos os componentes (UpcomingMeetingsCard, TeamMemberCard, etc.) ficam intactos. O protótipo reimplementa a UI inline para máxima liberdade visual.

### Arquivos

| Arquivo | Ação |
|---------|------|
| `src/pages/DashboardV2.tsx` | Novo — protótipo completo |
| `src/App.tsx` | Adicionar rota `/dashboard-v2` |

### Notas
- Zero alterações no banco de dados
- Zero alterações em componentes existentes
- Mesmos dados reais (queries Supabase idênticas)
- Após aprovação visual, migraremos o design para o `Index.tsx` principal

