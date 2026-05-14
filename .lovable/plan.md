
## Piloto: Diário de Bordo V2 (rota paralela)

Criar uma versão alternativa em `/lider/diario-v2` para validar a abordagem AI-Native cross-member **sem tocar no `/lider/diario` atual**. Se aprovado depois do uso real, migramos a rota original e replicamos a fórmula em Objetivos e Avaliações.

### Por que Diário como cobaia?

- É a página com o "vazio mais gritante" hoje (cadeado + "selecione alguém")
- Maior densidade de dados pra IA cruzar (notas privadas de todo o time)
- Padrões cross-member (gaps de cobertura, recência) só aparecem nessa visão agregada

### Como vai parecer

```text
┌─────────────────────────────────────────────────────────────┐
│ Diário de Bordo                              [+ Nova nota] │
│ Suas notas privadas sobre o time, em um só lugar.          │
├─────────────────────────────────────────────────────────────┤
│ ┌─ INSIGHT DA RHITMO ──────────────────────────────────┐   │
│ │ ✦ 3 liderados sem nota há +14 dias: Laís, Yasmin,    │   │
│ │   Guilherme. Próxima 1:1 da Laís é em 2 dias.        │   │
│ │   [Criar nota da Laís]   [Ver cobertura completa]    │   │
│ └──────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│ [Todos os liderados ▾] [Todos os times ▾] [30 dias ▾] [⌕] │
├─────────────────────────────────────────────────────────────┤
│ HOJE                                                       │
│  ● Gabriela Lucas · Business Ops · há 2h                  │
│    "Conversa sobre prioridade Q3..."     🔒 · 🏷 Prioridades│
│                                                            │
│  ● Matheus · COO · há 5h                                  │
│    "Pediu feedback sobre apresentação..."  🔒 · 🏷 Feedback│
│                                                            │
│ ESTA SEMANA                                                │
│  ● Giovanna Barletta · há 2 dias                           │
│    ...                                                     │
│                                                            │
│ MAIS ANTIGAS                                               │
│  ...                              [Carregar mais]          │
└─────────────────────────────────────────────────────────────┘
```

### Os 3 elementos-chave

**1. Insight Card (o "AI-Native moment")**
Bloco no topo, gerado client-side a partir do mesmo dataset da página. Mostra **gaps de cobertura**:
- Liderados sem nota há +14 dias (calibra com `health-status-logic`: 7 / 8-14 / +14)
- Cruza com próximas 1:1s — se há 1:1 nos próximos 3 dias e zero notas recentes, vira flag prioritária
- CTA primário abre o dialog de nota nova com pessoa pré-selecionada

Se não houver gaps, vira estado positivo ("Cobertura em dia. Última nota há 2h."). Sem edge function — pura agregação determinística do que já vem da query.

**2. Feed cronológico cross-member**
Substitui o painel direito vazio. Lista as notas do líder agrupadas em buckets temporais (Hoje / Esta semana / Mais antigas), cada item com:
- Avatar + nome + cargo do liderado
- Snippet da nota (3 linhas, fade)
- Tags + timestamp relativo + ícone de privacidade
- Click → navega para `/lider/diario?member={id}` (a versão antiga, abrindo direto na nota daquela pessoa)

**3. Filtros leves no topo**
- Dropdown "Liderado" (substitui a master list lateral)
- Dropdown "Time"
- Dropdown "Período" (7d / 30d / 90d / tudo)
- Busca textual

Filtros vivem na URL (`?member=X&period=30d`) pra preservar deep-link.

### Coexistência com o /lider/diario atual

| | `/lider/diario` (atual) | `/lider/diario-v2` (novo) |
|---|---|---|
| Layout | full-bleed, master-detail 260px | normal `max-w-5xl` |
| Entry point | escolher pessoa pra ver algo | feed agregado + insight |
| Continua existindo? | ✅ sim, intacto | ✅ novo, paralelo |
| Sidebar | aponta para `/lider/diario` (atual) | aparece um banner discreto no topo das duas rotas com "Experimentar nova versão" / "Voltar ao Diário clássico" |

### Detalhes técnicos

- **Nova rota**: `/lider/diario-v2` em `src/App.tsx`
- **Nova página**: `src/pages/lider/DiarioV2.tsx`
- **Novos componentes** (em `src/components/leader/diario-v2/`):
  - `DiaryCoverageInsight.tsx` — card de insight no topo
  - `DiaryFeedItem.tsx` — item do feed
  - `DiaryFilters.tsx` — barra de filtros
  - `VersionSwitchBanner.tsx` — banner discreto pra alternar entre v1/v2 (montado nas duas páginas)
- **Query**: `safeQuery` em `feedbacks` filtrado por `manager_id = auth.uid()`, ordenado por `created_at desc`, `LIMIT 50` + paginação cursor-based
- **Cobertura**: agregação no client a partir de `useLeaderMembers` (já dá `last_signal_at`) cruzado com `useLeaderInbox` ou query de 1:1s próximas
- Sem mudanças em: schema, RLS, edge functions, `AppSidebar`, `navigation.ts`, `MemberAdminSheet`

### Critério pra promover v2 → v1

Depois de alguns dias usando, valida:
1. Abrir Diário v2 = ver algo útil sem clicar?
2. Insight Card te leva a ações (criar nota, abordar alguém)?
3. Filtros no topo substituem bem a master list?

Se sim → promovemos v2 pra `/lider/diario`, arquivamos a v1, e replicamos a fórmula em Objetivos (lista cross-member + insight de prazos) e Avaliações (ciclos ativos + insight de pendências).

### Fora de escopo deste piloto

- Migrar Objetivos e Avaliações
- Mexer em `/lider/1on1s` (agenda tem natureza diferente)
- Edge function de IA pro insight (v1 é regra determinística; v2 pode virar IA depois)
- Mudar a página de detalhe individual da nota
