

## Plano: Remover Ações Rápidas e Expandir Reuniões

### Problema
O card "Ações Rápidas" é redundante — 3 dos 4 botões levam à mesma tela. Ele ocupa espaço valioso que poderia dar mais respiro ao card de reuniões.

### Alterações

**1. `src/pages/Index.tsx`**
- Remover import do `QuickActionsCard`
- Reorganizar o Bento Grid: reuniões ocupam `col-span-8` (era 7), coluna direita `col-span-4` (era 5) com apenas `ActivityPreview` + `PendingInvitesSection`

```text
┌──────────────────────────┬────────────────┐
│  Próximas 1:1s (8 cols)  │ Atividade (4)  │
│                          ├────────────────┤
│                          │ Convites (4)   │
└──────────────────────────┴────────────────┘
```

**2. `src/components/dashboard/QuickActionsCard.tsx`**
- Deletar arquivo (não será mais utilizado)

### Arquivos

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/Index.tsx` | Remover QuickActionsCard, ajustar grid para 8/4 |
| `src/components/dashboard/QuickActionsCard.tsx` | Deletar |

