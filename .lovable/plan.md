

## Plano: Renomear Botão de Geração de Avaliação

### Objetivo

Ajustar o texto do botão principal no modal de Nova Avaliação para deixar claro que a IA gera um **rascunho** para edição, não o documento finalizado.

---

### Alteração

| Arquivo | Linha | Texto Atual | Novo Texto |
|---------|-------|-------------|------------|
| `src/components/NewReviewDialog.tsx` | ~259 | `Gerar Avaliação com IA` | `Gerar rascunho de avaliação de desempenho` |

---

### Código Atual

```tsx
<Button
  type="button"
  onClick={generateReview}
  disabled={generating || !canGenerateReview || !dateRange?.from || !dateRange?.to}
  className="gap-2 w-full"
>
  {!canGenerateReview ? (
    <Lock className="h-4 w-4" />
  ) : generating ? (
    <Loader2 className="h-4 w-4 animate-spin" />
  ) : (
    <Sparkles className="h-4 w-4" />
  )}
  Gerar Avaliação com IA
</Button>
```

---

### Código Atualizado

```tsx
<Button
  type="button"
  onClick={generateReview}
  disabled={generating || !canGenerateReview || !dateRange?.from || !dateRange?.to}
  className="gap-2 w-full"
>
  {!canGenerateReview ? (
    <Lock className="h-4 w-4" />
  ) : generating ? (
    <Loader2 className="h-4 w-4 animate-spin" />
  ) : (
    <Sparkles className="h-4 w-4" />
  )}
  Gerar rascunho de avaliação de desempenho
</Button>
```

---

### Observações

- O ícone `<Sparkles />` (brilho/magic) será **mantido**
- Nenhuma outra alteração de lógica ou estilo necessária
- Alteração mínima de 1 linha

