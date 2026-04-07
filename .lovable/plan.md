

## Plano: Corrigir espaçamento de parágrafos em avaliações salvas

### Problema
O editor Tiptap (RichTextEditor) exibe espaçamento correto entre parágrafos durante a edição, pois o Tailwind `prose` aplica margens aos `<p>`. Porém, ao visualizar o conteúdo salvo em dois locais — `ReviewViewDialog` e `DirectReportReviewView` — o espaçamento colapsa porque as classes `prose` aplicadas são insuficientes ou o dark mode não está coberto.

### Análise dos 3 pontos de renderização

1. **RichTextEditor (edição)** — Já usa `prose prose-sm max-w-none` ✅
2. **ReviewViewDialog (leitura, líder)** — Linha 464: `prose prose-sm max-w-none` mas **sem `dark:prose-invert`** e sem classes de espaçamento explícitas
3. **DirectReportReviewView (leitura, liderado)** — Linha 124: `prose prose-sm max-w-none dark:prose-invert` — ok, mas Tiptap read-only pode não aplicar margens do `prose` corretamente nos nós internos

### Causa raiz
O Tailwind `prose` aplica estilos a `> p`, `> h2`, etc., mas o Tiptap gera uma estrutura DOM com `.ProseMirror > p` — o seletor do prose pode não alcançar. Além disso, o `dangerouslySetInnerHTML` no ReviewViewDialog renderiza HTML cru sem wrapper adequado.

### Alterações

**1. `src/index.css` — Adicionar estilos globais para prose em contexto de review**

Adicionar regras CSS que garantem espaçamento em qualquer conteúdo `.prose` renderizado (seja via Tiptap read-only ou `dangerouslySetInnerHTML`):

```css
/* Review content paragraph spacing */
.prose p {
  margin-bottom: 1rem;
}
.prose .ProseMirror p {
  margin-bottom: 1rem;
}
.prose h1, .prose h2, .prose h3 {
  margin-top: 1.5rem;
  margin-bottom: 0.75rem;
}
.prose ul, .prose ol {
  margin-top: 0.75rem;
  margin-bottom: 0.75rem;
}
```

**2. `src/components/ReviewViewDialog.tsx` (linha 464)**

Atualizar classes do container de visualização:

```tsx
// De:
<div className="prose prose-sm max-w-none">

// Para:
<div className="prose prose-sm max-w-none dark:prose-invert prose-p:mb-4 prose-p:leading-relaxed prose-headings:mb-3 prose-headings:mt-6 prose-ul:my-4 prose-ol:my-4">
```

**3. `src/pages/DirectReportReviewView.tsx` (linha 124)**

Adicionar classes de espaçamento ao container do Tiptap read-only:

```tsx
// De:
<div className="prose prose-sm max-w-none dark:prose-invert">

// Para:
<div className="prose prose-sm max-w-none dark:prose-invert prose-p:mb-4 prose-p:leading-relaxed prose-headings:mb-3 prose-headings:mt-6 prose-ul:my-4 prose-ol:my-4">
```

**4. `src/components/ui/rich-text-editor.tsx` (linha 223)**

Adicionar classes de espaçamento ao editor para consistência visual entre edição e visualização:

```tsx
// De:
"prose prose-sm max-w-none p-3",

// Para:
"prose prose-sm max-w-none p-3 prose-p:mb-4 prose-p:leading-relaxed prose-headings:mb-3 prose-headings:mt-6",
```

### Arquivos modificados

| Arquivo | Alteração |
|---------|-----------|
| `src/index.css` | Adicionar regras CSS globais para espaçamento em `.prose` |
| `src/components/ReviewViewDialog.tsx` | Adicionar classes prose de espaçamento (linha 464) |
| `src/pages/DirectReportReviewView.tsx` | Adicionar classes prose de espaçamento (linha 124) |
| `src/components/ui/rich-text-editor.tsx` | Adicionar classes prose de espaçamento (linha 223) |

### Notas técnicas
- Sem alterações no banco de dados
- O conteúdo salvo (HTML do Tiptap) já contém tags `<p>` corretas — o problema é puramente de CSS na renderização
- As classes `prose-p:mb-4` do Tailwind Typography plugin são a forma canônica de customizar espaçamento

