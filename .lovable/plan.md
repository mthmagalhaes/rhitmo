

# i18n sweep — páginas de Líder, Liderado e RH Admin

## Diagnóstico

A infra de i18n está pronta (`react-i18next`, 3 locales, ~1141 chaves em `pt-BR/en/es.json`), mas várias páginas de uso diário ainda têm strings PT-BR hardcoded. Já confirmado por screenshot: dashboard do líder (badge "Próximas 1:1s", "Sincronizar", "Desconectar", "Transcrição automática", "Transcrever") e perfil do liderado ("Nova Nota", "Mais ações", "Usuário Ativo", "Diário de Bordo", "Avaliações Formais", "Objetivos / Metas", "Filtrar data", "Mais recentes", "Reunião Geral", "Minhas anotações", "X notas registradas"). Audit cruzado revelou os mesmos buracos em HR Dashboard / HR Members / HR Teams / HR Analytics, FeedbackFilters, NewTeamDialog, TeamTabs, InviteMemberDialog, PerformanceReviewList, BatchSyncDialog, WorkStyleCard, parte do Analytics e parte do Onboarding.

`DirectReportDashboard` (portal do liderado) já tem 126 ocorrências de `t()` — está OK e fica de fora.

## O que entra (3 ondas)

### Onda 1 — Dashboard do líder (página inicial pós-login)

Arquivo: `src/components/dashboard/UpcomingMeetingsCard.tsx`

- "Próximas 1:1s", "Conectar Google Calendar", "Conecte o Google Calendar para ver…", "Sincronizar / Sincronizando…", "Desconectar", "Reconectar", "Tentar novamente", "Sessão do Google Calendar expirou", "Falha ao sincronizar calendário", "Reconecte sua conta…", "Tente sincronizar novamente…", "Nenhuma reunião nas próximas 48h", "X eventos encontrados, mas nenhum com liderados…", "Verifique se os e-mails…", "Transcrição automática", "Transcrito", "Gravando", "Agendado", "Auto ✓", "Processando", "Entrando", "Pendente", "Transcrever", tooltip "Limite de reuniões com bot atingido…", `Hoje HH:mm` / `Amanhã HH:mm` (só os labels "Hoje"/"Amanhã" — formatação fica).

### Onda 2 — Perfil do liderado (visão do líder) + filtros + diálogos

- `src/pages/MemberDetails.tsx`: "Início", "Nova Nota", "Mais ações", "Gravar Reunião", "Mentor Chat", "Usuário Ativo", "Convidar" / "Ver Convite", "X notas registradas", "Rhitmo Sync", "Preenchido" / "Pendente", "Recurso Premium", "Disponível no plano Pro ou superior", "Desbloquear", "Aguardando preenchimento do Rhitmo Sync", "Copiar Link", "Reenviar Convite", "Objetivos / Metas", "Diário de Bordo", "Avaliações Formais", "Minhas anotações", "Adicionar Primeira Nota", labels do PDI ("Concluído", "Em andamento", "Prazo: …", "X de Y objetivos concluídos"), labels V1/V2 do Rhitmo Sync ("Cronotipo", "Estilo de Feedback", "Estilo de Reconhecimento", "Motivadores Principais", "Processamento de informações", "Estilo de feedback", "Estilo de trabalho", "Horário de pico", "Motivação principal").
- `src/components/FeedbackFilters.tsx`: "Filtrar data", "Mais recentes", "Mais antigos", e os labels das tag-pills (1:1, PDI, Check-in, Feedback, Melhoria, Destaque, Risco, Reunião Geral, Brainstorming, Feedback Difícil).
- `src/lib/tagConfig.ts`: as tags são chaves persistidas no banco — **mantemos a chave em PT-BR** e adicionamos um helper `getTagLabel(tag, t)` que mapeia a chave para a tradução exibida (ex.: chave "Reunião Geral" → label `tags.generalMeeting`). Isso preserva os dados existentes.
- `src/components/InviteMemberDialog.tsx`: "Usuário Ativo" e textos de status do convite.
- `src/components/PerformanceReviewList.tsx`: "Avaliações Formais" e contadores.
- `src/components/WorkStyleCard.tsx`: "Preferências de trabalho • Preenchido em…".
- `src/components/NewTeamDialog.tsx` + `src/components/TeamTabs.tsx`: "Novo Time".
- `src/components/BatchSyncDialog.tsx`: "Sincronizar Inteligência do Sistema" e descrições.

### Onda 3 — Páginas de RH Admin

- `src/pages/HRDashboard.tsx`: "Painel de Liderança", "Visão Geral", "Pontos de Atenção", "Nenhuma atividade no período", cabeçalhos da tabela ("Líder", "Notas registradas", "Liderados cobertos").
- `src/pages/HRMembers.tsx`: "Liderados", "Todos os líderes", "Todos / Com PDI / Sem PDI", "Nenhum liderado encontrado".
- `src/pages/HRTeams.tsx`: "Times e Líderes", "Sem feedback", "Nenhum liderado cadastrado", "Nunca".
- `src/pages/HRAnalytics.tsx`: "Liderados", "Líderes Ativos", "Cobertura PDI", abas ("Visão Geral", "Tendências", "Riscos", "Engajamento"), "Todos os times", "Todos os líderes".
- `src/pages/Analytics.tsx` (líder Pro): banner de upgrade, períodos ("Últimos 30 dias", "Último Trimestre", "Último Ano"), títulos dos cards ("Cobertura de Atenção", "Termômetro de Sentimento", "Adoção do Rhitmo Sync") e respectivas descriptions.

## Implementação técnica

1. **Novos namespaces no JSON** (em `pt-BR.json`, `en.json`, `es.json`):
   - `meetings.*` (UpcomingMeetingsCard)
   - `member.*` (MemberDetails — header, accordions, abas, PDI, work-style)
   - `tags.*` (labels traduzidos das 9 tags do tagConfig)
   - `filters.*` (date, sort)
   - `hr.dashboard.*`, `hr.members.*`, `hr.teams.*`, `hr.analytics.*`
   - `analytics.*` (charts do líder)
   - Reutilizar `common.*` (Concluído, Em andamento, Pendente, Hoje, Amanhã, Nunca etc.) onde já existir.

2. **Padrão de troca**: cada componente recebe `const { t } = useTranslation()` (vários já têm) e cada literal vira `t('chave')`. Datas continuam usando `date-fns/locale` — adicionar resolução dinâmica em `src/lib/dateLocale.ts` (já existe) para retornar `enUS` / `es` / `ptBR` conforme `i18n.language`, e propagar para os 3 pontos que ainda fixam `ptBR`: `UpcomingMeetingsCard`, `FeedbackFilters` (Calendar `locale`) e `MemberDetails` (`formatDate`).

3. **Tags persistidas**: não renomear chaves no banco. Criar `getTagLabel(tagKey: string): string` em `src/lib/tagConfig.ts` que faz lookup por chave PT-BR fixa → `i18n.t('tags.<slug>')`. Usar em FeedbackFilters, FeedbackTimeline e onde quer que o label da tag seja renderizado.

4. **Garantir fallback**: chaves novas adicionadas nos 3 locales na mesma migração; nada de chave faltando em EN/ES.

5. **QA manual**: alternar idioma via `useLocale()` e percorrer Dashboard líder → MemberDetails → Filtros → HR Dashboard → HR Members → HR Teams → HR Analytics → Analytics em PT/EN/ES.

## Fora do escopo desta sprint

- `PrivacyPolicy.tsx`, `TermsOfService.tsx` (textos jurídicos longos — exigem revisão legal por idioma).
- `Landing.tsx`, `Enterprise.tsx`, `HelpCenter.tsx` (páginas públicas/marketing — sweep próprio em sprint separada).
- `Onboarding.tsx` (já parcialmente i18n, requer auditoria dedicada do wizard).
- `AdminStructure.tsx` e demais páginas em `/admin/*` (uso interno do super admin matheus@rhitmo.co — fica em PT-BR).
- `DirectReportDashboard.tsx` — já internacionalizado, sem mudanças.
- Toasts e mensagens de Edge Functions (servidor) — escopo de backend, não desta sprint.
- Não vamos renomear tags no banco nem migrar dados.

## Critérios de aceite

- Trocar idioma para EN ou ES e percorrer as 7 páginas-alvo (Dashboard líder, MemberDetails, HR Dashboard, HR Members, HR Teams, HR Analytics, Analytics) sem encontrar string PT-BR visível nas áreas marcadas.
- Tag pills nos filtros aparecem traduzidas, mesmo com a chave continuando em PT-BR no banco.
- Datas formatadas no idioma ativo ("Tomorrow 10:00" / "Mañana 10:00").
- Nenhuma regressão em PT-BR (default).

