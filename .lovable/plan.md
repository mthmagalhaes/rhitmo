## Ajustes no piloto `/lider/diario-v2`

Três mudanças focadas pra deixar o feed mais escaneável e com paridade de filtros do clássico, antes de decidir migração.

### 1. Card compacto colapsável (igual ao clássico)
Substituir o `DiaryFeedItem` atual (mostra snippet de 2 linhas + tags + privacidade sempre) por uma linha compacta no padrão do `/lider/diario`:

```
🔒 📅 11/05/2026  Apresentação Comfaster   [Destaque Positivo]            ⌄
```

- Header: ícone de privacidade + data formatada (dd/MM/yyyy) + título + tags + chevron à direita.
- Avatar + nome do liderado entram **antes do título** no mesmo header (é cross-member, então o "quem" precisa aparecer sem expandir).
- Click no chevron expande in-place mostrando: snippet/conteúdo completo, "há X horas", botão "Abrir nota" (mantém deep-link para `/lider/diario?member={id}#{noteId}`).
- Sem snippet visível no estado fechado — alinhado ao "uma vez feita a nota, não preciso ler tudo ali".
- Estado de expansão é local ao item (useState), não persiste em URL.

### 2. Contador dinâmico de registros
Adicionar bloco de cabeçalho idêntico ao clássico, logo abaixo do header da página:

```
Anotações
{N} registros no histórico.
```

- N = `items.length` (resultado pós-filtros), atualiza ao mudar liderado/time/período/busca/tags.
- Substitui visualmente o título "Diário de Bordo" duplicado — fica: H1 "Diário de Bordo" + subtítulo privacy → Insight Card → bloco "Anotações · N registros" + botão Nova nota → Filtros → Feed.
- Move o botão "Nova nota" pra esse bloco (próximo ao contador), liberando o header do topo.

### 3. Paridade de filtros com o clássico
Estender `DiaryFilters.tsx` adicionando duas linhas:

**Linha 1 (já existe):** busca + Liderado + Time + Período.

**Linha 2 (nova):** chips de tag + filtro de data customizada + ordenação.
- **Tags:** chips clicáveis multi-seleção usando o mesmo conjunto do clássico (`1:1`, `PDI`, `Check-in`, `Feedback Difícil`, `Melhoria`, `Destaque`, `Risco`) — derivado de `tagConfig`/`FeedbackFilters` existente. Estado em URL como `?tags=pdi,risco`.
- **Filtrar data:** popover com date range (reusar `DateRangePicker`/lógica do `FeedbackFilters` clássico). Estado em URL como `?from=...&to=...`. Quando setado, sobrepõe o filtro de Período.
- **Ordenação:** select "Mais recentes" / "Mais antigos". Estado em URL como `?sort=desc|asc` (default `desc`).

Aplicar todos os filtros no `useMemo` de `items` e reordenar antes de bucketar. Quando `sort=asc`, inverter a ordem dentro de cada bucket e exibir buckets em ordem cronológica crescente (Mais antigas → Esta semana → Hoje).

### Detalhes técnicos

**Arquivos a editar:**
- `src/components/leader/diario-v2/DiaryFeedItem.tsx` — virar card colapsável (chevron, useState local, header compacto com avatar+data+título+tags).
- `src/components/leader/diario-v2/DiaryFilters.tsx` — segunda linha com tags/data/ordenação; expandir props.
- `src/pages/lider/DiarioV2.tsx` — adicionar bloco "Anotações · N registros" + botão Nova nota; ler/escrever `tags`, `from`, `to`, `sort` nos searchParams; aplicar filtros e ordenação no `useMemo`.

**Sem mudanças em:** schema, RLS, edge functions, `Diario.tsx` clássico, `AppSidebar`, `navigation.ts`, `NewNoteDialog`.

**Reuso:** importar lista de tags de `src/lib/tagConfig.ts` (ou do componente `FeedbackFilters` se já exportado) pra manter paridade visual e semântica com o clássico.

### Fora de escopo
- Migração para `/lider/diario`.
- Replicação para Objetivos/Avaliações.
- Edição/exclusão inline a partir do feed (continua via deep-link).
- Persistir estado de expansão entre sessões.