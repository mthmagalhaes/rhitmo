

## Plano: Correcao do Bug Smart Date - Reset de Estado

### Problema Identificado

O recurso Smart Date funciona apenas no primeiro upload porque o estado nao e limpo corretamente:

| Local | Problema |
|-------|----------|
| Linha 246 | Apos submit, `setOccurredAt(new Date())` ao inves de `undefined` |
| Linha 83 | Guard `if (occurredAt) return;` impede nova extracao |
| Fechamento | Nao existe reset quando o modal e fechado |

### Fluxo do Bug

```text
1. Usuario abre modal → occurredAt = undefined ✓
2. Upload arquivo → Smart Date detecta e preenche ✓
3. Salvar → setOccurredAt(new Date()) ← ERRADO
4. Abre modal novamente → occurredAt = Date (nao undefined)
5. Upload novo arquivo → Guard bloqueia extracao ✗
```

---

### Solucao

**1. Criar funcao `resetForm()`**

Centralizar a limpeza de todos os estados do formulario:

```typescript
const resetForm = () => {
  setContent('');
  setMemberId('');
  setOccurredAt(undefined);
  setIsDragging(false);
  setIsProcessingFile(false);
  
  // Limpar input de arquivo
  if (fileInputRef.current) {
    fileInputRef.current.value = '';
  }
  
  // Limpar editor TipTap
  if (editorRef.current) {
    editorRef.current.commands.clearContent();
  }
};
```

**2. Corrigir `handleSubmit`**

Substituir os sets individuais pela chamada de `resetForm()`:

```typescript
// ANTES (linha 244-247)
setContent('');
setMemberId('');
setOccurredAt(new Date()); // ← BUG

// DEPOIS
resetForm();
```

**3. Aplicar reset no fechamento do modal**

Criar um wrapper para `onOpenChange` que limpa o estado ao fechar:

```typescript
const handleOpenChange = (newOpen: boolean) => {
  if (!newOpen) {
    resetForm();
  }
  onOpenChange(newOpen);
};
```

Atualizar referencias:
- `<Dialog onOpenChange={handleOpenChange}>` (linha 283)
- Botao Cancelar: `onClick={() => handleOpenChange(false)}` (linha 423)

---

### Alteracoes no Arquivo

| Linha | Alteracao |
|-------|-----------|
| ~80 | Adicionar funcao `resetForm()` |
| 244-247 | Substituir sets individuais por `resetForm()` |
| 283 | Trocar `onOpenChange` por `handleOpenChange` |
| 423 | Trocar callback do botao Cancelar |

---

### Secao Tecnica

**Implementacao completa do `resetForm`:**

```typescript
const resetForm = () => {
  setContent('');
  setMemberId('');
  setOccurredAt(undefined);
  setIsDragging(false);
  setIsProcessingFile(false);
  
  if (fileInputRef.current) {
    fileInputRef.current.value = '';
  }
  
  if (editorRef.current) {
    editorRef.current.commands.clearContent();
  }
};

const handleOpenChange = (newOpen: boolean) => {
  if (!newOpen) {
    resetForm();
  }
  onOpenChange(newOpen);
};
```

**handleSubmit atualizado:**

```typescript
toast({
  title: "Anotacao salva!",
  description: "Registro adicionado ao historico.",
});

resetForm();
onOpenChange(false);

if (onSuccess) {
  onSuccess();
}
```

---

### Resultado Esperado

Apos a correcao:

```text
1. Usuario abre modal → occurredAt = undefined ✓
2. Upload arquivo → Smart Date detecta e preenche ✓
3. Salvar → resetForm() → occurredAt = undefined ✓
4. Abre modal novamente → occurredAt = undefined ✓
5. Upload novo arquivo → Smart Date funciona novamente ✓
```

