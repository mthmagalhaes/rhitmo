## Remover botões duplicados de troca de modo no sidebar

Hoje o `AppSidebar` renderiza dois botões de troca de modo logo abaixo da navegação:

- **"Voltar ao Painel RH"** (`ArrowRightLeft`) — aparece pra líder com cap de Owner/HR Admin quando está no modo `leader`.
- **"Ver como Líder"** — aparece pra HR Admin que também é líder quando está no modo `company`.

A mesma ação já existe (de forma canônica) no `WorkspaceSwitcher` no topo da sidebar (modo dropdown), que segue nossa regra "um ponto de entrada por ação" (memo `workspace-switcher-actions`). Os botões grandes embaixo do nav são duplicação e poluem visualmente.

### Mudança

**`src/components/AppSidebar.tsx`**
- Remover o bloco `{open && availableModes.length > 1 && persona === 'leader' && (...)}` que renderiza o botão "Voltar ao Painel RH".
- Remover o bloco `{open && availableModes.length > 1 && persona === 'hr_admin' && isTeamLeader && (...)}` que renderiza o botão "Ver como Líder".
- Remover imports não usados (`ArrowRightLeft`, `useNavigate` se não houver outro uso, `LEADER_HOME`, `Button` se não for mais usado em outro lugar — `Button` continua sendo usado no banner de impersonation, então mantém).
- Manter o `useEffect` de sincronização rota↔modo intacto — ele continua útil quando o usuário troca via WorkspaceSwitcher ou navega direto.

### Verificação

- Confirmar via Workspace Switcher dropdown que ainda é possível trocar entre "Minha equipe" e "Empresa".
- Confirmar que o sidebar fica limpo: nav primária → CTA Pergunte à Rhitmo → footer.

Sem mudanças em backend, RLS ou business logic.