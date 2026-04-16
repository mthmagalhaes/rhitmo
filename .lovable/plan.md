

## Plano: Botão de saída de impersonate + esconder Design System de não-admins

### Diagnóstico

**Bug 1 — Design System aparecendo para Yasmin durante impersonate:**
Na linha 277 do `AppSidebar.tsx`:
```tsx
{!isInHRContext && user?.email === 'matheus@rhitmo.co' && (...)}
```
A checagem usa `user?.email` (auth user = Matheus), não o usuário efetivo. Como `useAdmin().isAdmin` retorna `false` durante impersonate (correto), o `isSuperAdmin` da linha 114 fica `false` e cai no `else`. Mas a checagem do bloco "Marca/Design System" continua olhando `user.email` do auth → mostra para qualquer impersonado. **Precisa adicionar `&& !isImpersonating`**.

**Bug 2 — Falta botão fácil de sair do impersonate:**
Hoje só existe o anel âmbar no avatar do footer (precisa achar e clicar) e a tag "Personificando" oculta (`showTag={false}` na linha 378). Sem affordance clara para encerrar e voltar pro `/admin`.

### Solução

**1. Esconder Design System durante impersonate** (`AppSidebar.tsx` linha 277):
```tsx
{!isInHRContext && user?.email === 'matheus@rhitmo.co' && !isImpersonating && (...)}
```

**2. Botão dedicado "Voltar ao Admin" no SidebarFooter** quando `isImpersonating`:
- Botão proeminente em âmbar, full-width, com ícone `ArrowLeft` + texto "Encerrar visualização" + sublinha discreta com o email impersonado
- Posicionado logo acima do bloco do user, sempre visível
- Ao clicar → chama `stopImpersonation()` (já redireciona para `/admin`)

**3. Reativar a tag "Personificando"** ao lado do avatar (`showTag={true}`) para reforçar o estado visual

**4. Versão colapsada** do sidebar: quando `!open`, mostrar só ícone do botão com tooltip "Encerrar visualização"

### Arquivos modificados

- `src/components/AppSidebar.tsx` — adicionar `!isImpersonating` no guard do Design System + novo botão "Encerrar visualização" no footer + `showTag={true}`

### Escopo

Pequeno. ~5 min. Sem migration, sem edge function, sem mudança de hook. Só guard de UI + botão novo no footer.

### Validação

1. Impersonando Yasmin → não aparece "Design System" no sidebar
2. Botão âmbar "Encerrar visualização" visível no footer durante impersonate, leva para `/admin` ao clicar
3. Sair de impersonate (logando como Matheus normal) → Design System volta a aparecer
4. Sidebar colapsado → ícone do botão visível com tooltip

