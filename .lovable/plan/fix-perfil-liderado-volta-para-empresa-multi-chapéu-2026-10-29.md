# Fix: perfil "Liderado" volta para "Empresa" (multi-chapéu)

Afetado: guto.biazzi@fstr.co (HR Admin + Líder do time People + Liderado no C-Level).

## Causa provável
O guarda de rota (`RoleRouteGuard`) decide o perfil pelo modo salvo, e a sincronização rota→modo só acontece depois, num efeito do `AppSidebar`. Quando o modo salvo é "company" e a pessoa cai em `/liderado/*` (link, refresh, redirect ou corrida com a troca), o guarda redireciona para `/hr` antes do efeito rodar, e o efeito então grava "company" de novo. Resultado: o perfil "não fixa".

## O que muda
1. Função pura `modeFromPath(path)` em `src/lib/navigation.ts`: `/liderado/*` → member, `/hr/*` → company, `/lider/*` → leader (checando `/liderado` antes de `/lider`).
2. `RoleRouteGuard`: se a rota indica um modo permitido para o usuário, usa esse modo para resolver o perfil (e grava via `setMode`), em vez de redirecionar pelo modo antigo. Só redireciona quando o modo da rota não é permitido.
3. `AppSidebar`: o efeito de sincronização passa a usar a mesma `modeFromPath` (sem lógica duplicada).
4. `WorkspaceSwitcher`: manter `setMode` antes de `navigate`, sem alteração de comportamento.

## Testes (bun:test)
- `modeFromPath('/liderado/inicio') === 'member'`, `/lider/inicio` → leader, `/hr/pessoas` → company.
- `resolvePersona` com HR+líder+liderado e modo member → `direct_report`; modo company → `hr_admin`.

## Validação
- Impersonar Guto: Sou liderado → fica em `/liderado/inicio` após recarregar; Minha equipe → `/lider/inicio`; Empresa → `/hr`.
- Fechar o ticket de suporte como resolvido após confirmação.

Sem mudanças em banco, permissões ou dados.
