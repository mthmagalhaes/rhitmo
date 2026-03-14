

## Ajustes na Landing Page

### 1. Forçar Light Mode

Envolver o conteúdo retornado pelo componente Landing com uma `div` que força o tema claro. Alterar a linha 132:

**De:**
```tsx
return <div className="min-h-screen bg-background">
```

**Para:**
```tsx
return <div className="light" style={{ colorScheme: 'light' }}>
  <div className="min-h-screen bg-background">
```

E fechar a `div` extra antes do fechamento final do componente.

Isso também se aplica ao estado de loading (linha 127) — envolver igualmente para consistência.

### 2. Título da seção de pricing

Já verificado no código atual (linhas 360-368). O título "Simples. Transparente." e subtítulo "Comece grátis. Evolua quando seu time crescer." estão presentes e renderizando corretamente acima dos cards. Nenhuma alteração necessária aqui.

### Arquivo alterado
- `src/pages/Landing.tsx` — apenas o wrapper light mode

