

## Refazer Guia Rhitmo — Central de Conhecimento inspirada no Lovable Docs

### Conceito

Transformar a página `/help` de um simples grid de 5 cards com accordion em uma **Central de Conhecimento completa** com navegação por tabs (por perfil de usuário), cards de funcionalidades com ícones, seção de vídeo, e conteúdo expandido cobrindo todos os use cases.

### Estrutura da página

```text
┌──────────────────────────────────────────────┐
│  Hero Strip (branded, wave bg)               │
│  "Central de Conhecimento"                   │
│  Subtítulo + Search input (filtro local)     │
├──────────────────────────────────────────────┤
│  [Tabs] Líder | Liderado | RH Admin         │
├──────────────────────────────────────────────┤
│  Seção: Comece por aqui (vídeo tour)         │
├──────────────────────────────────────────────┤
│  Grid de Feature Cards (por tab ativa)       │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│  │ Icon    │ │ Icon    │ │ Icon    │       │
│  │ Título  │ │ Título  │ │ Título  │       │
│  │ Desc    │ │ Desc    │ │ Desc    │       │
│  │ Steps   │ │ Steps   │ │ Steps   │       │
│  └─────────┘ └─────────┘ └─────────┘       │
├──────────────────────────────────────────────┤
│  Seção: Integrações (Slack, Calendar, etc)   │
├──────────────────────────────────────────────┤
│  Seção: Dicas & Truques (accordion FAQ)      │
├──────────────────────────────────────────────┤
│  Footer: Suporte (support@rhitmo.co)         │
└──────────────────────────────────────────────┘
```

### Conteúdo por Tab

**Tab Líder** (~8 cards):
- Primeiros Passos (Workspace + Times)
- Diário de Bordo (notas, voz, Magic Paste)
- Mentor Chat IA
- Avaliações de Desempenho (gerar, editar, PDF)
- Rhitmo Sync (convite comportamental)
- Analytics & Métricas
- Reuniões 1:1 (brief, calendar)
- Competências & PDI

**Tab Liderado** (~5 cards):
- Primeiro Acesso (onboarding, Sync)
- Meu Painel (Career Compass, Skills Map)
- Avaliações Recebidas (visualizar, reconhecer)
- Meus Objetivos (PDI, goals)
- Perfil & Configurações

**Tab RH Admin** (~6 cards):
- Painel RH (visão geral, métricas)
- Gestão de Times e Líderes
- Gestão de Liderados
- Framework de Competências
- Analytics Organizacional (heatmap, risco)
- Integrações (Slack, convites)

### Seção Integrações (compartilhada entre tabs)
- Slack (notificações, convites)
- Google Calendar (1:1s automáticas)
- Import de Transcrições (Tactiq, Fireflies)

### Seção Dicas & Truques (accordion FAQ)
- "Registre fatos, não opiniões"
- "Quanto mais notas, melhor a IA"
- "Use Magic Paste para reuniões externas"
- "Exporte avaliações em PDF"
- etc.

### Design

- Hero strip com gradient `bg-primary/5` e RhythmWave divider
- Tabs usando Shadcn `Tabs` component
- Feature cards: `rounded-2xl`, icon badge `bg-primary/10`, step-by-step com numbered list dentro de accordion
- Search input no topo filtra cards por título/conteúdo
- Seção integrações com badges de status (ativo/disponível)
- FAQ com accordion Shadcn
- Adaptado ao design system V2 (tipografia serif para headings, overline labels)
- Tab ativa baseada no `useUserRole()` — auto-seleciona a tab do perfil do usuário

### Arquivos

| Arquivo | Ação |
|---------|------|
| `src/pages/HelpCenter.tsx` | Reescrever completamente |

Nenhuma mudança em rotas ou sidebar — a rota `/help` já existe.

