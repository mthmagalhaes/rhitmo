

## Dois Ajustes no DirectReportDashboard

### Arquivo alterado
`src/components/dashboard/DirectReportDashboard.tsx`

### Ajuste 1 — Mover CareerCompassCard para tab "Minha Carreira"

**Tab "Visão Geral" (linhas 130-198):**
- Remover o bloco do CareerCompassCard (linhas 132-137)
- Manter apenas o grid com Resumo (col-span-1) e Próximas Ações (col-span-2)

**Tab "Minha Carreira" (linhas 200-211):**
- Inserir o CareerCompassCard no topo (condicional ao `aiAnalysis`)
- Manter o card placeholder "Skills map, PDI e Career Coach chegam em breve" abaixo

### Ajuste 2 — TabsList com estilo underline (GitHub/Notion)

**Linhas 110-127:** Substituir o `TabsList` pill-style por um wrapper com `border-b` e triggers com `border-b-2` underline ativo.

Novo markup:
```tsx
<div className="border-b border-border bg-background sticky top-0 z-10 -mx-6 px-6 mb-6">
  <TabsList className="bg-transparent p-0 h-auto gap-1">
    <TabsTrigger value="..." className="rounded-none border-b-2 border-transparent 
      data-[state=active]:border-primary data-[state=active]:bg-transparent 
      data-[state=active]:text-primary data-[state=active]:shadow-none 
      text-muted-foreground hover:text-foreground px-4 py-3 text-sm font-medium 
      transition-colors gap-2">
```

### Resumo de edições

| Linhas | Alteração |
|--------|-----------|
| 110-127 | TabsList: pill → underline style com wrapper border-b |
| 130-137 | Remover CareerCompassCard da tab Visão Geral |
| 200-211 | Tab Carreira: adicionar CareerCompassCard + manter placeholder |

### O que NÃO muda
- Toda lógica de queries, feedbacks, estado
- CareerCompassCard componente intacto
- Tabs Feedbacks e Meu Perfil intactas
- Nenhum outro arquivo

