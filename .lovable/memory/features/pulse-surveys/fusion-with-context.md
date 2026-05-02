---
name: Pulse vive dentro do Contexto
description: /lider/pulse redireciona para /lider/contexto; primeira visita mostra banner explicativo dismissível (localStorage rhitmo:contexto-pulse-banner-dismissed); botão SendPulseButton fica na barra sticky de filtros
type: feature
---
A feature de Pulse não tem página própria. Disparo é feito pelo SendPulseButton na sticky bar de `/lider/contexto`, e respostas viram evidência (source_table=`pulse_responses`) na timeline. Para evitar confusão na primeira visita, o header da página mostra um card `bg-primary/5 border-primary/20` com ícone Sparkles explicando "Pulse vive aqui dentro: toda resposta vira evidência". Dismiss é persistido em localStorage. As rotas `/lider/pulse` e `/liderado/pulse` ainda existem como Navigate replace para preservar deep-links e DMs do Slack.
