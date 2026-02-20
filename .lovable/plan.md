

## Correcao: Estado Visual do Campo "Data registrada"

### Problema

O campo de data exibe borda laranja e mensagem de aviso imediatamente ao abrir o modal, antes de qualquer interacao do usuario. Isso acontece porque as condicoes visuais dependem apenas de `!occurredAt`, que e `true` no estado inicial.

### Solucao

Adicionar um flag `hasAttemptedSubmit` que controla a exibicao do estado de erro.

**Arquivo: `src/components/NewNoteDialog.tsx`**

1. Adicionar estado `hasAttemptedSubmit` inicializado como `false`
2. Setar `hasAttemptedSubmit = true` no inicio da funcao `handleSubmit`, antes das validacoes
3. Incluir `setHasAttemptedSubmit(false)` na funcao `resetForm`
4. Condicionar a borda laranja e a mensagem de aviso a `hasAttemptedSubmit && !occurredAt`

### Detalhes Tecnicos

**Novo estado (junto aos outros useState, ~linha 75):**

```text
const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
```

**No resetForm (~linha 87), adicionar:**

```text
setHasAttemptedSubmit(false);
```

**No handleSubmit (~linha 187), primeira linha da funcao:**

```text
setHasAttemptedSubmit(true);
```

**Borda do botao de data (~linha 282):**

```text
// Antes:
!occurredAt && "text-muted-foreground border-orange-300"

// Depois:
!occurredAt && hasAttemptedSubmit && "text-muted-foreground border-orange-300"
```

**Mensagem de helper (~linha 298):**

```text
// Antes:
{occurredAt 
  ? "Quando o fato aconteceu" 
  : "⚠️ Campo obrigatório - selecione quando o fato aconteceu"}

// Depois:
{occurredAt 
  ? "Quando o fato aconteceu" 
  : hasAttemptedSubmit 
    ? "⚠️ Campo obrigatório - selecione quando o fato aconteceu"
    : "Selecione quando o fato aconteceu"}
```

### O que NAO muda

- Logica de validacao no submit permanece identica
- Botao "Salvar" continua desabilitado quando `!occurredAt`
- Nenhuma alteracao em outros componentes ou no backend
