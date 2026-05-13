## Contexto

Hoje o Ambient Mode aparece como um card solto, separado do Slack, e os toggles só ficam editáveis para `isHRAdmin`. Isso quebra o caso real do líder solo: ele cria o workspace, conecta o próprio Slack, lidera 2–5 pessoas, mas não tem permissão de ligar/desligar a captura — fica preso em "Somente leitura" sem ter pra quem pedir.

## O que vamos mudar

### 1. Embutir Ambient Mode dentro do card Slack

- `src/components/settings/AmbientSlackSettings.tsx`: adicionar variante `embedded`. Quando embutido, renderiza um bloco interno (sem `<Card>` próprio), separado do card pai por `border-t border-border/40` e `pt-4 mt-4`. Header vira um título menor (`text-sm font-medium` + ícone Eye + badge "Slack" + badge "Somente leitura" quando aplicável). Mantém os dois toggles e o botão "Gerenciar canais".
- `src/pages/lider/Configuracoes.tsx > IntegrationsTab`:
  - Remover o render solto de `<AmbientSlackSettings />` no fim.
  - Refatorar o `.map(items)` para que o card do Slack, quando `slack.isConnected === true`, renderize `<AmbientSlackSettings variant="embedded" />` dentro do `<CardContent>` (logo abaixo do botão "Desconectar"). Card do Google Calendar continua igual.
  - Como os dois cards podem ter alturas diferentes agora, manter o `grid md:grid-cols-2` mas adicionar `items-start` para que o card do Slack cresça sem esticar o do Calendar.

### 2. Corrigir autoridade do toggle (líder solo)

Regra nova: **pode editar quem é Owner do workspace OU HR Admin**. O líder solo é o Owner do próprio workspace (`workspaces.owner_id = auth.uid()`), então passa.

- `src/contexts/AccountContext.tsx`:
  - Adicionar `isWorkspaceOwner: boolean` ao `AccountContextValue`.
  - Estender o RPC `get_account_context` (migration) para retornar também `is_workspace_owner` (compara `workspaces.owner_id` com `p_user_id`). Setar a flag no `useMemo`.
- `src/components/settings/AmbientSlackSettings.tsx`:
  - `const canEdit = isHRAdmin || isWorkspaceOwner;`
  - Atualizar copy do badge/tooltip "Somente leitura" para: "Apenas o owner do workspace ou um HR Admin pode alterar."

### 3. RLS / backend

A tabela que guarda `ambient_mode_enabled` / `autojoin_public_channels` (provavelmente `slack_workspace_settings` ou similar usada por `useSlackChannelMutations`) precisa permitir UPDATE para Owner além de HR Admin.

- Migration: revisar a policy de UPDATE da tabela alvo (vou inspecionar o nome real ao implementar via `useSlackChannels.ts`) e ajustar o predicado para `public.has_role(auth.uid(),'hr_admin') OR EXISTS (select 1 from workspaces w where w.id = workspace_id and w.owner_id = auth.uid())`.
- Manter `SECURITY DEFINER` + `LANGUAGE plpgsql` se houver função auxiliar (regra do projeto para evitar recursão em RLS).

## Fora do escopo

- Não mexer em `useSlackChannels` além do necessário para refletir o novo `canEdit`.
- Não tocar nas outras abas de Configurações.
- Não alterar a regra para liderado/usuário comum (continuam sem acesso).

## Detalhes técnicos

```text
IntegrationsTab grid (md:grid-cols-2, items-start)
├── Card "Slack" (rounded-2xl)
│   ├── CardHeader (ícone + título + badge + descrição)
│   └── CardContent
│       ├── Botão Conectar/Desconectar
│       └── [se conectado] AmbientSlackSettings variant="embedded"
│           ├── border-t + pt-4 mt-4
│           ├── título "Ambient Mode" + badges
│           ├── toggle "Capturar sinais de canais públicos"
│           ├── toggle "Entrar automaticamente em novos canais"
│           └── footer: privacidade + "Gerenciar canais"
└── Card "Google Calendar" (inalterado)
```

Memória relevante a atualizar após implementação: `mem://architecture/papeis-e-permissoes` (Owner agora também controla Ambient Mode no front) e adicionar nota em `mem://features/slack/...` sobre embed + permissão.
