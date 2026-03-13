

## Adicionar Legenda de Saúde no Dashboard do Líder

Inserir uma div com a legenda das 4 cores dos indicadores de saúde logo após o parágrafo de contagem de liderados no `src/pages/Index.tsx`.

### Alteração única em `src/pages/Index.tsx`

Após a linha `<p className="text-muted-foreground">` que mostra `{filteredMembers.length} liderados · Clique em um card...`, adicionar:

```tsx
<div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground mt-3">
  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500"></span> Até 7 dias</span>
  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-yellow-500"></span> 8 a 14 dias</span>
  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-destructive"></span> Mais de 14 dias</span>
  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-muted-foreground/40"></span> Sem notas</span>
</div>
```

Nenhum outro arquivo ou lógica alterada.

