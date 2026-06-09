## Causa raiz

O switcher está mudando só o rótulo/estado local para `Minha equipe`, mas a tela continua em `/hr/members`. O `AppSidebar` tem uma regra que força menu de RH sempre que a URL começa com `/hr`, independentemente do `activeMode` estar como `leader`:

```text
URL atual: /hr/members
activeMode: leader
AppSidebar: pathname startsWith('/hr') -> usa HR_ADMIN_NAV_ITEMS
conteúdo da rota: continua HRMembers porque a rota /hr/members não redireciona
```

Além disso, `resolvePersona` ainda usa `isLeader` com uma exceção antiga para HR Admin não-owner, o que conflita com o novo sinal correto `isTeamLeader`. Resultado: multi-função pode ter o chip `Minha equipe`, mas a rota, sidebar e CTAs continuam no contexto de Empresa/RH.

## Objetivo

Para qualquer usuário que seja líder de time e também tenha acesso de empresa (Owner ou HR Admin):

- `Minha equipe` deve levar para `/lider/inicio` e renderizar sidebar de líder.
- `Empresa` deve levar para `/hr` e renderizar sidebar de empresa.
- Entrar direto em `/hr/*` enquanto o modo ativo é `leader` deve alinhar o modo para `company`, ou redirecionar de forma consistente.
- Entrar direto em `/lider/*` enquanto o modo ativo é `company` deve alinhar o modo para `leader`, ou redirecionar de forma consistente.
- Líder puro, HR puro, Owner puro e liderado puro não devem mudar de comportamento.

## Implementação proposta

1. **Centralizar a persona em `isTeamLeader`**
   - Atualizar `src/lib/navigation.ts` para aceitar `isTeamLeader` em `PersonaOpts`.
   - `resolvePersona` passa a usar:
     - `hasLeaderAccess = isTeamLeader || (isLeader && !isHRAdmin)` para compatibilidade.
     - `hasCompanyAccess = isHRAdmin || isWorkspaceOwner`.
     - Se ambos forem true, `activeMode` decide: `leader` ou `hr_admin`.
   - Remover a lógica antiga que exclui HR Admin não-owner de `isAlsoLeader`.

2. **Propagar `isTeamLeader` para os consumidores**
   - Atualizar chamadas em:
     - `AppSidebar.tsx`
     - `RoleRouteGuard.tsx`
     - `DirectReportGuard.tsx`
     - `useHomeRoute.ts`
     - `WorkspaceSwitcher.tsx`
   - Isso garante que Matheus, Vitor e qualquer líder multi-função sejam tratados como líderes reais quando `activeMode='leader'`.

3. **Corrigir o AppSidebar para respeitar o modo ativo**
   - Substituir a regra “se está em `/hr`, força menu RH” por uma regra compatível com o modo:
     - Se `activeMode === 'company'` e há acesso de empresa, usar menu RH.
     - Se `activeMode === 'leader'` e há liderança de time, usar menu de líder, mesmo que a URL ainda seja `/hr/*` por alguns instantes.
   - Ajustar os botões auxiliares:
     - Em modo líder, mostrar opção clara para “Ver como Empresa”.
     - Em modo empresa, mostrar “Ver como Líder” apenas se `isTeamLeader=true`.

4. **Sincronizar rota e modo no switcher**
   - Ao selecionar `Minha equipe` no `WorkspaceSwitcher`:
     - `setMode('leader')`
     - navegar para `/lider/inicio`
   - Ao selecionar `Empresa`:
     - `setMode('company')`
     - navegar para `/hr`
   - Atualizar também os botões legados “Ver como Líder/Voltar ao Painel RH” para chamar `setMode(...)` antes de navegar.

5. **Adicionar um pequeno guard de consistência de contexto**
   - Criar/ajustar uma lógica leve no layout/sidebar para quando a pessoa cair por link direto:
     - Se está em `/hr/*`, tem `company` disponível e modo atual não é `company`, atualizar o modo para `company`.
     - Se está em `/lider/*`, tem `leader` disponível e modo atual não é `leader`, atualizar para `leader`.
   - Isso evita estados impossíveis como `Minha equipe` + tela `/hr/members`.

6. **Atualizar memória/plano técnico**
   - Atualizar a memória do Active Mode Switcher com a nova regra: URL e modo precisam estar sincronizados; `isTeamLeader` é a fonte para liderança real.

## Validação

- Cenário Matheus/Faster em `/hr/members`:
  - Clicar `Minha equipe` deve ir para `/lider/inicio` e exibir menu `Visão geral / Liderados / Diário / Objetivos / Avaliações`.
- Cenário Vitor/Owner + líder:
  - Deve alternar entre `/lider/inicio` e `/hr` corretamente.
- HR Admin puro:
  - Continua sem opção `Minha equipe`.
- Líder puro:
  - Continua sem opção `Empresa`.
- Link direto `/hr/members`:
  - Modo e chip devem ficar `Empresa`, não `Minha equipe`.
- Link direto `/lider/inicio`:
  - Modo e chip devem ficar `Minha equipe`.