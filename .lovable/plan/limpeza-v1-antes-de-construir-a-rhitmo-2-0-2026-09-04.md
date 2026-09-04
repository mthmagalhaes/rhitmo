# Limpeza v1 antes de construir a Rhitmo 2.0

Varredura feita agora no código: cada item abaixo foi conferido por busca de referências (quem importa o quê) e pelas rotas ativas em `App.tsx` / menus em `navigation.ts`. Nada aqui apaga tabela, dado ou política de segurança — só remove código que ninguém alcança.

## 1. Telas que existem mas ninguém abre

Estas rotas continuam registradas, mas não aparecem em nenhum menu e nenhuma tela linka para elas:

| Tela | Situação |
|---|---|
| Objetivos do líder (`/lider/objetivos`) | A rota já está comentada em `App.tsx`. A página e todo o bloco de metas (`GoalsManager`, `GoalCard`, `NewGoalDialog`, tabela cruzada, sheet, insight de cobertura, `useTeamGoalsSummary`) só se referenciam entre si. |
| Compass do liderado (`/liderado/compass`) e PDI (`/liderado/pdi`) | Fora do menu; são wrappers de uma linha em cima da home. Viram redirecionamento para `/liderado/inicio`. |
| Frameworks de competência (`/hr/competency-framework`) | Fora do menu, marcada como "não pronta". Página + 3 componentes de competência sem nenhum consumidor. |
| Times e Analytics do RH (`/hr/teams`, `/hr/analytics`) | Fora do menu desde o Lean. Analytics ainda é usada como aba dentro de Pessoas, então **fica**; `/hr/teams` sai. |
| Membros do RH (`/hr/members`) | Duplicata antiga de `/hr/pessoas`, que é a do menu. Vira redirecionamento. |

Proposta: apagar as páginas de Objetivos, Compass, PDI, Frameworks e Times do RH, e transformar as rotas antigas em redirecionamentos, para links salvos e e-mails não caírem em "página não encontrada".

## 2. Componentes órfãos (zero importações)

Confirmado por varredura: ninguém importa. Saem do repositório.

`BiasAlert`, `EmptyState`, `LeaderSyncReminder`, `MemberSyncWizard`, `NudgesBanner`, `OnboardingModal`, `RequestConversationDialog`, `WaitlistDialog`, `SectionEyebrow`, `ExecutiveBrief`, `CareerCompassCard`, `SkillRadar`, `SmartInbox`, `EvidenceFilters`, `HealthScoreHero`, `LeadersAtRiskTable`, `ChromeIcon`, `GoogleCalendarIcon`, `EmptyMemberDetail`, `ActionItemsBlock`, `ReviewCommentsSection`, `ThreadsList`, `SlackConnectorDialog`, além dos três componentes de competência.

Hooks órfãos: `useContextTimeline`, `useLeaderInfo`.

`NewPDIDialog` fica por enquanto: ainda é chamado pela home do liderado — decisão separada em (4).

## 3. Funções de servidor sem chamador

Quatro funções não são chamadas nem pelo app, nem por agendamento, nem por outra função: `ai-router`, `generate-review` (substituída por `generate-formal-review`), `reanalyze-feedback`, `send-disc-invite`. Proposta: remover.

Também encontrei um agendamento apontando para uma função que não existe mais (`slack-deliver-quarterly-recap`), o que gera erro silencioso a cada trimestre. Proposta: desativar esse agendamento.

## 4. Decisões que preciso de você

Estes ainda estão ligados na interface, então não removo sem sua palavra:

- **PDI na home do liderado** — o botão "propor ação de desenvolvimento" continua vivo. Manter ou tirar?
- **Aba Contexto do líder (`/lider/contexto`)** — está no código, fora do menu principal. Manter como atalho ou aposentar?
- **Gravador próprio (`/recorder` + `MeetingRecorder`)** — anterior ao bot e aos conectores. Ainda faz sentido?

## Notas técnicas

- Ordem: remover imports nas telas que sobrevivem → apagar arquivos → limpar `routeLoaders.ts` e `App.tsx` → apagar chaves de tradução órfãs nos três idiomas → fechar com verificação de tipos.
- Nenhuma migração destrutiva: `goals`, `development_plans`, `competency_*` e o histórico continuam no banco com RLS intacta.
- Reversível pelo histórico de commits.
