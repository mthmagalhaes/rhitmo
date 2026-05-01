## Diagnóstico

Sim, há **duplicação real**. Hoje "Configurações" aparece em dois lugares na sidebar, ambos apontando para a mesma rota (`/lider/configuracoes` ou `/liderado/configuracoes`):

1. **Dropdown do WorkspaceSwitcher** (topo) — junto com Central de Ajuda e Convidar membros.
2. **Item da nav principal** (meio) — definido em `LEADER_NAV_ITEMS` e `DIRECT_REPORT_NAV_ITEMS`.

Isso confunde porque a sidebar passa duas mensagens contraditórias: "Configurações é uma área do produto como Pulse/Objetivos" *e* "Configurações é uma ação do workspace junto com Ajuda".

## Decisão (como cofundador técnico)

Manter **apenas no dropdown do WorkspaceSwitcher** e **remover da nav principal**.

Justificativa:
- A nav principal representa **fluxos de trabalho de liderança** (1:1s, Diário, Pulse, Objetivos, Avaliações, Contexto). Configurações não é um fluxo, é uma área utilitária.
- O dropdown do workspace já é o lugar canônico para ações organizacionais (Ajuda, Convidar membros) — Configurações pertence a esse mesmo grupo semântico.
- Reduz a nav de 8 para 7 itens no líder e de 6 para 5 no liderado, melhorando hierarquia visual e respiração — alinhado com o refinamento UX recente (Linear/Windmill).
- Padrão consistente com Linear, Notion, Linear, Slack: settings sempre vivem no menu do workspace/conta, nunca na nav principal.

## Mudanças

### `src/lib/navigation.ts`
- Remover o item `configuracoes` de `LEADER_NAV_ITEMS` (linha 37).
- Remover o item `configuracoes` de `DIRECT_REPORT_NAV_ITEMS` (linha 50).
- Atualizar comentário ("Maximum 5 items. Settings is the 6th, always last.") para refletir que settings vive no WorkspaceSwitcher.

### `src/components/sidebar/WorkspaceSwitcher.tsx`
- Sem mudanças. Já é o lugar correto.

### Documentação de memória
- Atualizar `mem://design/sidebar/workspace-switcher-actions` reforçando: **"Configurações nunca aparece na nav principal — vive exclusivamente no dropdown do WorkspaceSwitcher, junto com Central de Ajuda e Convidar membros."**

## Resultado esperado

- Sidebar do líder: `Início, 1:1s, Diário, Pulse, Objetivos, Avaliações, Contexto` (7 itens, todos fluxos de trabalho).
- Sidebar do liderado: `Compass, 1:1s, Pulse, PDI, Avaliações` (5 itens).
- Configurações acessível em **um único lugar**: dropdown do nome do workspace no topo.
