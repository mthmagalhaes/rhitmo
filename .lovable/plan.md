## Objetivo

Hoje temos dois cards de Slack em locais diferentes, com responsabilidades sobrepostas e comportamentos divergentes:

- **Configurações > Integrações** — mostra status (Conectado/Desconectado) mas **não** permite ação.
- **Configurações > Ajuda** — bloco "Integrações" com card "Conector Slack" que **conecta**, mas **não desconecta** (`disabled={integ.id === 'slack'}`).

A proposta é ter **uma única fonte de verdade**: a aba **Integrações**. A aba Ajuda volta a ser sobre dicas/conteúdo de ajuda, sem duplicar integrações.

## Mudanças

### 1. `src/pages/lider/Configuracoes.tsx` — aba Integrações vira o card "completo"

Cada card (Slack e Google Calendar) passa a ter:
- Ícone + título + descrição (mantém)
- Badge de status (`Conectado` verde / `Disponível` neutro) — alinhado ao estilo da aba Ajuda
- ID do usuário Slack ou e-mail do Calendar quando conectado (igual ao que a Ajuda mostra hoje)
- Botão `Conectar` quando desconectado
- Botão `Desconectar` quando conectado (funcional para ambos)

Para ambos passamos a usar os mesmos hooks: `useSlackConnection` + `useCalendarIntegration`.

### 2. `src/pages/HelpCenter.tsx` — remover bloco "Integrações"

- Remover a seção `<IntegrationsSection />` e a constante `INTEGRATIONS` correspondente.
- Manter o restante (FAQs, dicas, comandos Slack como referência).
- Limpar imports e helpers (`Unlink`, `Link`, `useSlackConnection` no HelpCenter etc.) que ficarem órfãos.

### 3. Suporte a desconectar Slack

Hoje só existe Conectar. Adicionar:
- Mutação no `useSlackConnection` (`disconnectSlack`) que deleta a linha do usuário em `slack_integrations` via Supabase client (RLS já permite o próprio usuário deletar; se não permitir, criar edge function `slack-disconnect` simples seguindo o padrão de `slack-link`).
- Invalida a query `['slack-connection', effectiveUserId]` após deletar.

### Detalhes técnicos

- Manter o visual "Bento/Creme": `rounded-2xl`, `shadow-[0_2px_20px_rgba(0,0,0,0.04)]`, ícone em `bg-primary/10`.
- Badges seguem o padrão atual da aba Ajuda (`bg-green-500/10 text-green-600` para conectado).
- Botões `rounded-xl`, full width dentro do card, ícones `Link` / `Unlink` do lucide.
- Verificar política RLS de DELETE em `slack_integrations` antes de implementar; se faltar, criar edge function minimalista (auth via JWT, deleta por `user_id`).

## Não-objetivos

- Não mexer no fluxo OAuth nem no `slack-oauth-callback` (já corrigido).
- Não alterar a lista de comandos `/rhitmo` exibida na Ajuda — só remover o card de status/ação duplicado.
- Não tocar no card do Google Calendar além de garantir paridade visual.
