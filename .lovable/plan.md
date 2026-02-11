

## Plano: Refatorar AppSidebar para Design System Bento/Soft

Refatoracao puramente visual do `AppSidebar.tsx`. Nenhuma logica de dados sera alterada.

---

### Arquivo: `src/components/AppSidebar.tsx`

**1. Container da Sidebar (linha 79)**
- De: `className="border-r border-sidebar-border"`
- Para: `className="border-0 shadow-[4px_0_24px_rgba(0,0,0,0.02)]"`

**2. Header / Logo (linhas 80-84)**
- Remover `border-b border-sidebar-border`
- Aumentar padding: `px-5 py-6`
- Logo: `className="text-primary"` (de `text-sidebar-foreground`)
- Adicionar badge "Beta" ao lado do logo: `<Badge variant="secondary" className="rounded-full text-[10px] px-2 py-0">Beta</Badge>`

**3. Group Label (linha 88)**
- Adicionar `tracking-tight uppercase text-[11px] font-semibold`

**4. Itens de Menu - NavLink (linhas 96-104 e 119-127)**
- De: `className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"`
- Para: `className="rounded-2xl tracking-tight font-medium transition-all duration-200 hover:translate-x-1 hover:bg-primary/5 hover:text-primary"`
- Active state de: `activeClassName="bg-primary text-primary-foreground font-medium"`
- Para: `activeClassName="bg-primary/10 text-primary font-bold"`
- Icones: `h-5 w-5` (manter)

**5. Footer (linhas 136-188)**
- Remover `border-t border-sidebar-border`
- Adicionar classe vazia no SidebarFooter
- Bloco de usuario (linha 151): envolver em card flutuante
  - De: `className="flex items-center gap-3 px-4 pb-4"`
  - Para: `className="flex items-center gap-3 p-3 mx-2 mb-4 rounded-2xl bg-muted/30 shadow-sm"`
- Botao Suporte (linha 138-148): aplicar `rounded-2xl` e hover consistente

**6. Botoes de acao no footer (Settings/Logout)**
- De: `hover:bg-sidebar-accent`
- Para: `hover:bg-primary/5 rounded-xl`

---

### Resumo Visual

```text
ANTES:                          DEPOIS:
+--border-r-----------------+  +--shadow-suave--------------+
| [Logo] border-b            |  | [Logo] text-primary        |
|                            |  |  + Badge "Beta"            |
| Menu (label cinza)         |  | MENU (tracking-tight)      |
|  > Inicio  [bg-primary]   |  |  > Inicio [bg-primary/10]  |
|  > Analytics               |  |  > Analytics hover:x+1    |
|                            |  |                            |
| --------border-t---------- |  |                            |
| [avatar] [nome] [icons]   |  | [card flutuante]           |
+----------------------------+  |  rounded-2xl shadow-sm     |
                                |  [avatar] [nome] [icons]   |
                                +----------------------------+
```

---

### Arquivos Modificados

| Arquivo | Tipo | Descricao |
|---------|------|-----------|
| `src/components/AppSidebar.tsx` | Modificar | Shadow soft, rounded-2xl menus, footer flutuante, hover translate-x |

Nenhuma logica de dados, queries ou props sera alterada. Apenas classes Tailwind.

