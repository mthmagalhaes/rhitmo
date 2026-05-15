## Objetivo
Promover a experiência piloto de `/lider/diario-v2` (visão cross-member com insight de cobertura, feed cronológico unificado, filtros avançados e cards colapsáveis) para a rota oficial `/lider/diario`, aposentando a versão clássica master-detail.

## Mudanças

### 1. Substituir conteúdo de `/lider/diario`
- Reescrever `src/pages/lider/Diario.tsx` com o conteúdo atual de `src/pages/lider/DiarioV2.tsx`.
- Remover o `<VersionSwitchBanner />` (não há mais "outra versão" para alternar).
- Manter o título "Diário de Bordo" e copy de privacidade.

### 2. Remover o piloto V2
- Deletar `src/pages/lider/DiarioV2.tsx`.
- Deletar `src/components/leader/diario-v2/VersionSwitchBanner.tsx` (não usado em outros lugares).
- Manter os demais componentes em `src/components/leader/diario-v2/` (`DiaryCoverageInsight`, `DiaryFeedItem`, `DiaryFilters`) — eles continuam sendo a base da nova `/lider/diario`. Opcionalmente renomear a pasta para `src/components/leader/diario/` para refletir que não é mais piloto.

### 3. Atualizar roteamento
- Em `src/App.tsx`: remover a rota `/lider/diario-v2` e o import de `DiarioV2`.
- Adicionar redirect `/lider/diario-v2` → `/lider/diario` (compatibilidade com links antigos em DMs do Slack, e-mails e prints).

### 4. Limpeza pontual
- Conferir se `MemberMasterList`, `EmptyMemberDetail`, `FeedbackTimeline` e `FeedbackFilters` continuam sendo usados em outras páginas (ex.: `/lider/1on1s`, `/lider/objetivos`). Não remover — apenas garantir que ficam órfãos só onde de fato deixam de ser usados.

## Decisão necessária
**Renomear a pasta `diario-v2/` para `diario/`?**
- **Sim (recomendado):** mantém naming limpo, sem dívida visual de "v2" na base de código. Custo: ajustar 4 imports.
- **Não:** zero risco de regressão; aceita um nome levemente fora do padrão.

Posso seguir com a opção "Sim" por padrão se nada for sinalizado.

## Validação pós-implementação
- `/lider/diario` carrega com insight de cobertura + feed cross-member.
- `/lider/diario-v2` redireciona para `/lider/diario`.
- Nenhum import quebrado para `DiarioV2` ou `VersionSwitchBanner`.
- Sidebar do líder continua apontando para `/lider/diario` (já está).
