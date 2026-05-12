## Remover "Pulso do time" da Home do líder

A seção Contexto foi removida do produto, mas o widget `TeamPulseBento` continua aparecendo em `/lider/inicio` e aponta para `/lider/contexto?tab=rede` (rota morta).

### Mudanças

1. `**src/pages/Index.tsx**` — remover o `<TeamPulseBento />` da Home e o respectivo import. A Home volta a ter exatamente 3 seções: Account Setup, Próximas 1:1s, Histórico do Mentor (alinhado à memória `home-v3-windmill`, que já não lista Pulso do time).
2. `**src/components/dashboard/TeamPulseBento.tsx**` — deletar o arquivo (não é usado em nenhum outro lugar).
3. **Memória `mem://design/dashboard/home-v3-windmill**` — já está correta (lista só 3 seções). Sem mudança.

### Fora de escopo (não mexer agora)

- Hook `useTeamPulse`, tabela `network_signals`, edge `detect-network-signals`, cron, RPCs `get_team_pulse`/`acknowledge`, e bloco de rede no brief continuam existindo no backend. Se a decisão for desligar a feature por completo (cron + tabelas), faço num passo separado — me avisa.
- Página `/lider/contexto` em si: confirmar se também já foi removida da navegação ou se sobra algum link/rota a limpar.

### Pergunta rápida

Quer que eu também remova o cron `detect-network-signals` e o bloco "Contexto de rede" do `briefGenerator` agora, ou só limpa a Home por ora? Só limpa da Home agora

&nbsp;