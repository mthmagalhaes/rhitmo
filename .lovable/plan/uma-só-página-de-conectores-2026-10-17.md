# Uma só página de Conectores

## Objetivo
A Central de Conectores (menu lateral) passa a ser o único lugar para conectar e ajustar integrações. Configurações deixa de ter uma tela própria de conectores.

## O que muda para o líder
- **Configurações:** a aba "Conectores" sai. Quem chegar por um link antigo é levado direto para a Central.
- **Slack na Central:** o painel lateral do Slack passa a mostrar ali mesmo os ajustes que hoje só existem em Configurações (modo ambiente e saúde da conexão). Some o botão "Ajustes" que mandava para Configurações.
- **Horas de bot:** o cartão de horas de bot, que hoje aparece em Configurações, passa a aparecer no topo da Central.
- **Outros atalhos** (medidor de horas do menu, cartão de primeiros passos na home) passam a apontar para a Central.
- Nada muda no funcionamento das conexões: Granola, Fireflies, tl;dv, Fathom, Meet, Agenda e Slack continuam iguais.

## Detalhes técnicos
- `src/pages/v2/Conectores.tsx`: no sheet `kind === 'slack'` conectado, renderizar `AmbientSlackSettings variant="embedded"` e `SlackHealthPanel`; remover link para `?tab=integracoes`. Adicionar `BotHoursCard` acima das seções. Manter `data-tour="integrations"` na grade da Central.
- `src/pages/lider/Configuracoes.tsx`: remover `IntegrationsTab` e imports órfãos; se `?tab=integracoes`, `<Navigate to="/lider/conectores" replace />`.
- `SidebarBotHoursMeter.tsx` e `AccountSetupBento.tsx`: trocar links para `/lider/conectores`.
- Conferir `tourSteps.ts` e a Central de Ajuda (`#l-calendar`) para âncoras que dependiam da aba antiga.
- Verificar visualmente a Central e o redirecionamento.
