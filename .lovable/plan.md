# Plano: Corrigir loop multi-CAP (HR Admin + Líder de Time)

## Sintoma
Usuário `matheus.magalhaes@fstr.co` (HR Admin da Faster + líder de 5 times) entra sempre em `/hr` e não consegue alternar para a visão de líder. Clicar em "Minha equipe" no WorkspaceSwitcher ou no card "Ver como Líder" não muda nada — a tela volta para o painel de RH. Persiste mesmo após logout/login.

## Causa raiz
`src/hooks/useActiveMode.ts` mantém o estado com `useState` local **em cada componente** que chama o hook. AppSidebar, WorkspaceSwitcher e RoleRouteGuard têm cópias **independentes** de `mode`.

Fluxo do bug quando o usuário clica em "Minha equipe":
1. `WorkspaceSwitcher.setMode('leader')` → atualiza só o `useState` interno **dele** e escreve no localStorage.
2. `navigate('/lider/inicio')`.
3. A rota `/lider/*` está envolvida por `RoleRouteGuard expects="leader"`. Esse guard chama `useActiveMode()` e tem sua **própria** cópia de `mode`, ainda `'company'` (nunca foi notificada da mudança).
4. `resolvePersona(...)` com `activeMode='company'` retorna `'hr_admin'`.
5. Como `expects !== persona`, o guard faz `<Navigate to={getHomeRoute(...)} replace />` → joga o usuário de volta em `/hr`.

O `useEffect` que relê localStorage só dispara em mudanças de `[userId, loading, canSeeLeader, canSeeCompany]` — nada disso muda durante a troca de modo, então as cópias defasadas nunca se atualizam.

Mesma falha explica o pós-logout/login: localStorage fica com `'company'`, o hook lê isso, AppSidebar adicionalmente força `setMode('company')` ao detectar URL `/hr`, e o guard nunca enxerga `'leader'`.

## Correção
Refatorar `useActiveMode` para usar um **store em escopo de módulo** consumido via `useSyncExternalStore`, garantindo que todos os componentes vejam o mesmo valor e re-renderizem juntos. Resumo do que muda em `src/hooks/useActiveMode.ts`:

- `subscribers: Set<() => void>` no módulo.
- `cache: Map<userId, ActiveMode>` lida primeiro o localStorage uma vez e mantém o valor em memória.
- `writeMode(userId, next)` atualiza cache + localStorage e chama `notify()` para todos os subscribers.
- Hook usa `useSyncExternalStore(subscribe, () => getSnapshot(userId))` em vez de `useState/useEffect`.
- Listener de `window.addEventListener('storage', ...)` invalida o cache em mudanças vindas de outras abas (cross-tab sync).
- Validação contra `canSeeLeader/canSeeCompany` continua, com fallback para `defaultMode`.

Nenhuma outra mudança é necessária:
- `WorkspaceSwitcher`, `AppSidebar` e `RoleRouteGuard` continuam consumindo o hook exatamente como hoje, mas agora compartilham estado.
- `lib/navigation.ts` e `useHomeRoute` ficam intactos.
- A auto-sincronização do AppSidebar (URL `/hr` → `setMode('company')`) continua válida, mas deixa de competir com o WorkspaceSwitcher porque ambos veem o mesmo valor instantaneamente.

## Validação manual sugerida
1. Login com `matheus.magalhaes@fstr.co`. Limpar `rhitmo:active-mode:<uid>` no localStorage.
2. Deve cair em `/lider/inicio` (defaultMode='leader').
3. Trocar para "Empresa" no switcher → vai para `/hr`. Chip mostra "Empresa".
4. Trocar para "Minha equipe" → vai para `/lider/inicio` e **permanece** lá (sem bounce).
5. Refresh em `/hr` → permanece em `/hr` com chip "Empresa".
6. Refresh em `/lider/inicio` → permanece com chip "Minha equipe".
7. Logout/login: respeita o último modo persistido, mas o switcher continua funcional.
8. Abrir duas abas: trocar modo em uma reflete na outra após próximo render (storage event).

## Arquivos a editar (build mode)
- `src/hooks/useActiveMode.ts` — refator para store compartilhada.
