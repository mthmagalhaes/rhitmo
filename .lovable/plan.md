

# Avaliação Formal — 4 ajustes do passo 2

Resposta a cada item do feedback, com causa-raiz e solução.

## 1. "Passo 1 de 2" no modal de criação

**Onde:** `CreateFormalReviewDialog.tsx`

- Adicionar um stepper minimalista no topo do `DialogHeader`: `● Passo 1 de 2 — Briefing` com um indicador visual leve (linha + bolinhas), e renomear o `DialogTitle` para "Briefing da Avaliação Formal".
- Trocar o botão final "Criar Avaliação" → **"Avançar para revisão →"**, deixando explícito que o próximo passo é abrir o painel de revisão (Sheet).
- Adicionar uma linha curta abaixo da descrição: *"Definimos o escopo aqui. No próximo passo você revisa, ajusta e compartilha."*

Sem mudar lógica de mutação — só copy + UI do header e do CTA.

## 2. Minimizar "Dicas para Apresentação"

**Onde:** `FormalReviewSheet.tsx` (linhas 326–338)

Hoje o card azul de coaching ocupa 200–300px no topo da aba "Rascunho Geral" e empurra a avaliação real para baixo. Solução:

- Transformar o card num **Collapsible** (`@/components/ui/collapsible`, já disponível no Shadcn).
- Default: **fechado** (mostra só o header `↗ Dicas para Apresentação · Visível apenas para você` + chevron).
- Persistir o estado aberto/fechado em `localStorage` por `reviewId` (ex: `coaching-tip-open-${reviewId}`) para respeitar a preferência do usuário entre sessões.
- Quando aberto, mantém o conteúdo Markdown atual.

## 3. Ícones não aparecem (causa-raiz arquitetural)

Esse é o item mais sério e explica também o ponto 4.

### Diagnóstico

A edge function `generate-formal-review` gera um **HTML estruturado** com:
- `<div class="review-section">`, `<div class="section-header">`, `<span class="section-icon">{SVG}</span>`
- `<table class="dimension-table">`, `<div class="classification-grid">`, `<span class="evidence-tag">`
- 7 blocos com classes específicas para tipografia hierárquica.

Esse HTML é jogado dentro do `RichTextEditor` (TipTap + StarterKit). O TipTap **só conhece** `p`, `h1-3`, `ul`, `ol`, `strong`, `em`, `highlight`. Ao fazer parse:
- `<div>`, `<table>`, `<span class="...">` → **descartados** (sem schema).
- Os SVGs dentro de `<span>` → **descartados junto**.
- Restam só os textos soltos. Quando o placeholder `{{ICON_SUMMARY}}` por algum motivo não é substituído (ex: a IA escapou as chaves), o texto literal vaza para a UI — exatamente o que aparece nas screenshots.

Além disso, **não existe CSS** no projeto para `.review-section`, `.dimension-table`, `.classification-grid`, `.evidence-tag`, etc. → mesmo se o HTML sobrevivesse, renderizaria sem estilo.

### Solução

Trocar o pipeline de **HTML rico não-suportado** por **Markdown estruturado renderizado fora do editor**:

**a) Backend (`generate-formal-review/index.ts`)**

- Reescrever o prompt para gerar **Markdown puro** (sem HTML), seguindo a estrutura de 7 blocos:
  ```md
  ## 📋 Visão geral do período
  Parágrafo único…

  ## 🏆 Principais contribuições
  ### Nome curto da entrega
  Descrição + impacto. *(fonte: Anotação 12/mar)*
  ```
- Trocar os placeholders `{{ICON_*}}` por **emojis nativos** (📋 🏆 📈 🎯 📊 ⚖️ ➡️) — renderizam sempre, sem JS, sem CSS, sem perda no parse.
- Manter o tamanho 350–600 palavras e regras anti-alucinação.
- Remover a substituição `.replace(/\{\{ICON_*\}\}/g, …)` do código — não precisa mais.

**b) Frontend (`FormalReviewSheet.tsx`)**

Separar **modo leitura** de **modo edição** na aba "Rascunho Geral":

- **Modo leitura (default)**: renderiza `review.content` com `<ReactMarkdown>` (já está no projeto, usado no `coaching_tip`) num container `prose prose-sm` com classes Tailwind ricas para hierarquia (ver item 4).
- **Botão "Editar texto" no canto**: ao clicar, alterna para o `RichTextEditor` (modo atual). Ao salvar, volta pra leitura.
- Isso resolve dois problemas: ícones aparecem (são emojis no Markdown) **e** o usuário só usa o editor quando realmente quer editar — a leitura fica bonita por padrão.

**c) Migração do conteúdo legado**

Reviews já criadas têm HTML quebrado salvo em `content`. Duas opções:
- Detectar HTML legado (`content.includes('class="review-section"')`) e exibir aviso "Este rascunho foi gerado num formato antigo. Clique em **Regenerar** para usar o novo formato." com botão que chama `generate-formal-review` de novo.
- Não tentar conversão automática — risco de corromper conteúdo que o líder já editou.

## 4. Padrão de formatação inteligente

Hoje "está tudo um formato só" porque o HTML estruturado morre no TipTap (item 3). Resolvendo o item 3 com Markdown + `ReactMarkdown`, definimos um sistema visual claro via classes `prose-*` do Tailwind Typography:

| Elemento Markdown | Render visual |
|---|---|
| `## Título do bloco` (com emoji) | Header de seção com emoji 20px, fonte 16px semibold, border-top sutil, padding-top 16px, margem superior 24px |
| `### Subtítulo` | 14px font-semibold, color foreground, sem margin-top exagerada |
| Parágrafo | 14px, line-height 1.65, color muted-foreground-90 |
| `*(fonte: ...)*` (itálico entre parênteses) | Pílula visual via regex no remark — fundo `bg-blue-50`, borda `border-blue-200`, fonte 11px, `rounded-full`, padding 2px 8px |
| Lista `-` | Marcador discreto, espaçamento confortável entre itens |
| `**negrito**` | Para "labels" tipo "Desempenho:", "Promoção:", "Mérito:" no bloco de classificação |

Implementação concreta no `FormalReviewSheet.tsx`:

```tsx
<div className="prose prose-sm max-w-none
  prose-headings:tracking-tight prose-headings:font-semibold
  prose-h2:text-base prose-h2:mt-8 prose-h2:mb-3 prose-h2:pb-2 
  prose-h2:border-b prose-h2:border-border/50 prose-h2:flex prose-h2:items-center prose-h2:gap-2
  prose-h3:text-sm prose-h3:mt-4 prose-h3:mb-1 prose-h3:text-foreground
  prose-p:text-sm prose-p:leading-relaxed prose-p:text-muted-foreground
  prose-strong:text-foreground
  prose-li:text-sm prose-li:my-0.5
">
  <ReactMarkdown components={{ em: EvidenceTag }}>
    {review.content}
  </ReactMarkdown>
</div>
```

Onde `EvidenceTag` é um componente custom que detecta `*(fonte: ...)*` e renderiza como pílula:

```tsx
const EvidenceTag = ({ children }) => {
  const text = String(children);
  if (text.startsWith('(fonte:') || text.startsWith('(Trimestral') || text.startsWith('(Mensal') || text.startsWith('(1:1')) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/30 
                       text-blue-700 dark:text-blue-300 text-[11px] font-medium border border-blue-100 
                       dark:border-blue-900 not-italic ml-1">
        {children}
      </span>
    );
  }
  return <em>{children}</em>;
};
```

## Arquivos alterados

1. `supabase/functions/generate-formal-review/index.ts` — prompt para Markdown + emojis, remover placeholders `{{ICON_*}}` e o bloco de SVGs
2. `src/components/review/CreateFormalReviewDialog.tsx` — stepper "Passo 1 de 2", copy do CTA
3. `src/components/review/FormalReviewSheet.tsx` — Collapsible para coaching tip, modo leitura/edição na aba Rascunho, ReactMarkdown estilizado, componente `EvidenceTag`, detecção de HTML legado

Sem migração de banco. Sem novas dependências (`react-markdown` e `@/components/ui/collapsible` já existem).

## Critério de aceite

- Modal de criação mostra "Passo 1 de 2 — Briefing" e CTA "Avançar para revisão →"
- Card "Dicas para Apresentação" inicia fechado, com toggle, persistido por review
- Novas avaliações renderizam com emojis visíveis nos títulos de seção e tipografia hierárquica clara (H2 ≠ H3 ≠ parágrafo ≠ pílula de fonte)
- "Fonte: Anotação X/Y" aparece como pílula azul, não como texto inline
- Avaliações antigas (HTML legado) mostram banner pedindo regeneração — sem quebrar
- Sem `ICON_SUMMARY`, `ICON_CONTRIBUTIONS`, `ICON_DIMENSIONS`, `ICON_NEXT_STEPS` aparecendo como texto literal

