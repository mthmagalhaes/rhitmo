# Limpar dropdown do WorkspaceSwitcher

## Diagnóstico

Sim, há duplicação real. No modo **Empresa**, a sidebar de HR já contém:
- Overview (`/hr`)
- Pessoas (`/hr/members`)
- Times (`/hr/teams`)
- Analytics (`/hr/analytics`)
- Framework (`/hr/competency-framework`)

E o dropdown do workspace, quando o usuário é Owner/HR, repete exatamente os mesmos destinos:
- "Visão do workspace" → `/hr` (= Modo Empresa + Overview da sidebar)
- "Times" → `/hr/teams`
- "Pessoas do workspace" → `/hr/members`
- "Analytics" → `/hr/analytics`

Ou seja: o bloco inteiro `(isWorkspaceOwner || isHRAdmin)` no `WorkspaceSwitcher.tsx` (linhas ~150–183) é redundante com a sidebar de HR e com o próprio item "Empresa" da seção Modo.

## Mudança

**Arquivo:** `src/components/sidebar/WorkspaceSwitcher.tsx`

Remover o bloco inteiro de 4 `DropdownMenuItem`s + separador:
- Visão do workspace
- Times
- Pessoas do workspace
- Analytics

O dropdown passa a ter apenas:
1. **Modo** (Minha equipe / Empresa) — quando `canSwitch`
2. **Workspaces** (lista) — quando multi-workspace
3. **Configurações**
4. **Central de Ajuda**
5. **Refazer tour** (quando aplicável)
6. **Adicionar liderado(a)** (quando líder e `onOpenInvite`)

Isso alinha com a memória `workspace-switcher-actions`, que define o dropdown como concentrador de Settings / Ajuda / Convite — navegação operacional fica na sidebar.

## Não-objetivos

- Não mexer na sidebar de HR (ela já cobre esses destinos).
- Não mexer na seção "Modo" nem na lista de Workspaces.
- Não mexer em memória — a regra atual já reflete o desejado.
