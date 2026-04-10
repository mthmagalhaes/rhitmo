

## Plano: Renomear "Extensão" para "Conector" + Redesign dos botões + Criar Conector Slack

### O que muda

1. **Renomear "Extensão Chrome" → "Conector Chrome"** em toda a sidebar e modais
2. **Criar seção "Conectores" na sidebar** com dois botões grandes, retangulares arredondados (estilo card/pill), um para Chrome e outro para Slack — substituindo o item de menu simples atual
3. **Criar modal "Conector Slack"** com instruções de como conectar (OAuth via `/rhitmo` no Slack), status de conexão e botão de conectar

### Design dos botões na sidebar

Os dois botões ficam abaixo do menu principal, em uma seção visual separada. Cada um será um card compacto (~48px altura) com:
- Ícone à esquerda (Chrome / Slack)
- Nome "Conector Chrome" / "Conector Slack"
- Borda suave, `rounded-xl`, cor de destaque (`text-primary`)
- Hover com lift sutil

Referência visual: como aparece no screenshot do usuário ("Conector Chrome" e "Conector Slack" em roxo/laranja).

### Detalhes técnicos

**Arquivos modificados:**
- `src/components/AppSidebar.tsx` — remover "Extensão Chrome" do `menuItems`, criar seção "Conectores" com dois botões estilizados que abrem seus respectivos modais
- `src/components/extension/ChromeExtensionSetupDialog.tsx` — renomear título para "Conector Chrome — Rhitmo Recorder"

**Arquivo novo:**
- `src/components/slack/SlackConnectorDialog.tsx` — modal com:
  - Status de conexão (usando `useSlackConnection`)
  - Instruções de como conectar via Slack (`/rhitmo`)
  - Botão "Conectar ao Slack" (redireciona para OAuth)
  - Se já conectado, mostrar status verde + opção de reconectar

**Sem mudanças no backend** — o fluxo Slack OAuth já existe (`useSlackConnection`, `slack-oauth-callback`, `slack-link`).

