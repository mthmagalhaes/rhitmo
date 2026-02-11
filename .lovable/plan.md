

## Plano: Design System Bento na Home do Lider

Refatoracao puramente visual (Tailwind + JSX) em dois arquivos. Nenhuma logica de dados sera alterada.

---

### 1. `src/pages/Index.tsx`

**Fundo da pagina**
- `bg-background` muda para `bg-muted/30` (consistente com DirectReportDashboard)

**Header (linhas 265-337)**
- Remover `border-b bg-card` do container do header
- Workspace name: `text-4xl font-bold tracking-tight text-foreground` (de `text-2xl`)
- Subtitulo: `text-sm text-muted-foreground mt-1`
- Botoes "Nova Nota" e "Novo Membro": adicionar `rounded-full` para consistencia Bento

**Section title (linhas 360-392)**
- Titulo da secao: `text-2xl font-bold tracking-tight`

**Grid de membros (linha 432)**
- Manter `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6` (ja esta correto)

**Empty state (linhas 398-418)**
- Container: trocar `text-center py-12 max-w-2xl mx-auto` por um card visual estilizado
- Adicionar `col-span-full rounded-3xl bg-gradient-to-br from-primary/5 to-card shadow-[0_2px_20px_rgba(0,0,0,0.04)] p-12`
- Botao CTA: `rounded-full px-8 py-3 text-lg` (grande e arredondado)
- Video: manter, mas com `rounded-2xl` e remover `border`

**Empty filtered state (linhas 419-425)**
- Aplicar estilo similar com `rounded-2xl` e shadow soft

---

### 2. `src/components/TeamMemberCard.tsx`

**Card externo (linha 17-18)**
- De: `hover:shadow-lg hover:scale-[1.02] bg-card`
- Para: `rounded-3xl border-0 bg-card shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-300`
- Remover `hover:scale-[1.02]` (substituido pelo translate-y)

**Avatar (linha 23-26)**
- Adicionar `className="ring-2 ring-offset-2 ring-primary/10"` ao MemberAvatar

**Nome (linha 30)**
- `font-bold tracking-tight text-lg`

**Badge de time (linha 47-49)**
- `rounded-full px-3 py-1` (de `mt-1 text-xs font-normal`)

**Botao Settings (linhas 32-42)**
- Adicionar `opacity-0 group-hover:opacity-100 transition-opacity` para aparecer apenas no hover
- Adicionar `group` ao Card pai

**Contadores de notas (linhas 54-62)**
- Manter iconografia, apenas ajustar spacing

---

### Resumo Visual

```text
ANTES:                              DEPOIS:
+===========================+       +-------------------------------+
| border-b header           |       |  header sem borda             |
| text-2xl                  |       |  text-4xl tracking-tight      |
+===========================+       +-------------------------------+
| [card] [card] [card]      |       |  [card]    [card]    [card]   |
| border, scale hover       |       |  rounded-3xl, shadow soft     |
|                           |       |  hover lift -translate-y-1    |
+---------------------------+       +-------------------------------+

Empty State:                        Empty State:
  plain text + button                 gradient card col-span-full
                                      rounded-full CTA button
```

---

### Arquivos Modificados

| Arquivo | Tipo | Descricao |
|---------|------|-----------|
| `src/pages/Index.tsx` | Modificar | Header sem borda, bg-muted/30, empty state com gradient |
| `src/components/TeamMemberCard.tsx` | Modificar | rounded-3xl, shadow soft, hover lift, group hover settings |

Nenhuma logica de dados, queries ou props sera alterada. Apenas classes Tailwind e estrutura JSX de containers.

