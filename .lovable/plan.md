

## Correcoes de Responsividade Mobile

Quatro correcoes pontuais de CSS/classes Tailwind, sem alteracao de logica de negocio.

---

### BLOCKER 1 -- FeedbackTimeline: menu invisivel em touch

**Arquivo:** `src/components/FeedbackTimeline.tsx` (linha 255)

Atual:
```text
className="h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
```

Novo:
```text
className="h-7 w-7 text-muted-foreground sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
```

Em mobile (< sm) o botao fica sempre visivel. Em desktop, mantem o hover.

---

### IMPORTANT 2 -- Index.tsx: header overflow mobile

**Arquivo:** `src/pages/Index.tsx`

a) **Titulo H1** (linha 278): trocar `text-4xl` por `text-2xl sm:text-4xl`

b) **Container do titulo** (linha 277): adicionar `flex-wrap` ao `flex items-center gap-3 mb-1`

c) **Botao "Novo Membro"** (linha ~323): envolver texto em `<span className="hidden sm:inline">`:
```text
<UserPlus className="h-5 w-5" />
<span className="hidden sm:inline">Novo Membro</span>
```

d) **Botao "Nova Nota"** (linhas ~339-340): mesmo padrao:
```text
<PenSquare className="h-5 w-5" />
<span className="hidden sm:inline">Nova Nota</span>
```

---

### IMPORTANT 3 -- MemberDetails.tsx: header mobile

**Arquivo:** `src/pages/MemberDetails.tsx`

a) **Botao "Mentor Chat"** (linha 336): envolver texto:
```text
<Sparkles className="h-4 w-4" />
<span className="hidden sm:inline">Mentor Chat</span>
```

b) **Botao "Nova Anotacao"** (linha 339-340): envolver texto:
```text
<PenSquare className="h-4 w-4" />
<span className="hidden sm:inline">Nova Anotacao</span>
```

c) **Container do perfil** (linha 346): trocar `flex items-start gap-6` por `flex flex-col sm:flex-row items-start gap-6`

d) **MemberAvatar** (linha 347): adicionar `className="mx-auto sm:mx-0"` ao wrapper (ou envolver em div com essas classes)

---

### IMPORTANT 4 -- NewNoteDialog: espaco vertical mobile

**Arquivo:** `src/components/NewNoteDialog.tsx`

a) **Zona de drag-and-drop** (linha 539): trocar `p-8` por `p-4 sm:p-8`

b) **RichTextEditor** (linha 634): trocar `minHeight="200px"` por `minHeight="150px"`

c) **Calendar PopoverContent** (linha 516): adicionar `align="start"` (ja existe) -- nenhuma mudanca necessaria aqui, ja esta correto.

---

### Resumo de alteracoes

| Arquivo | Linhas afetadas | Tipo de mudanca |
|---------|----------------|-----------------|
| FeedbackTimeline.tsx | ~255 | Classes CSS do botao 3 pontinhos |
| Index.tsx | ~277-278, ~323, ~340 | Classes CSS do header e botoes |
| MemberDetails.tsx | ~335-340, ~346-347 | Classes CSS do header e perfil |
| NewNoteDialog.tsx | ~539, ~634 | Padding e minHeight |

Nenhuma alteracao de logica, queries, estados ou Edge Functions.

