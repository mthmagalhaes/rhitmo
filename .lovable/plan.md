

## Rhitmo Sync do Lider -- Wizard de Autoconhecimento para Gestores

### Resumo

Implementar um wizard de 4 etapas para o lider configurar seu perfil de lideranca, reutilizando o visual do Rhitmo Sync do liderado. O wizard sera acessivel via Configuracoes (ProfileSettingsDialog) e integrado ao SetupChecklist. Inclui lembrete automatico de 6 meses para revisao.

### Arquivos Novos

**1. `src/components/LeaderSyncWizard.tsx`**

Componente principal do wizard com 4 steps, reutilizando os subcomponentes visuais do RhitmoSync (SelectableCard, MultiSelectChips, StepIndicator, Progress bar). Conteudo adaptado para lideranca:

- Step 1 "Seu Cracha de Lider" -- tempo de lideranca, tamanho do time, maior desafio (texto livre)
- Step 2 "Seu Ritmo como Gestor" -- energizadores (multi-select), drenadores (multi-select), estilo de acompanhamento (single select)
- Step 3 "Seu Jeito de Dar Feedback" -- como da feedback dificil, reacao a baixa performance, tipo de reconhecimento natural
- Step 4 "Quem Voce Quer Ser" -- feedback recebido (texto), meta de desenvolvimento (texto), legado desejado (texto)

Ao submeter, faz UPDATE em `workspaces` setando `leader_sync_data` (JSONB) e `leader_sync_completed_at` (timestamp).

**2. `src/components/LeaderSyncReminder.tsx`**

Banner sutil que aparece no dashboard quando `leader_sync_completed_at` tem mais de 180 dias. Botao "Atualizar agora" abre o wizard. Botao "Agora nao" salva dismiss em localStorage por 30 dias.

### Arquivos Modificados

**3. Migration SQL -- novas colunas em `workspaces`**

```text
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS leader_sync_data jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS leader_sync_completed_at timestamptz DEFAULT NULL;
```

**4. `src/components/ProfileSettingsDialog.tsx`**

Adicionar botao "Configurar Perfil de Lideranca" (ou "Atualizar Perfil") que abre o LeaderSyncWizard em um Dialog. Aparece na secao de Manutencao, abaixo do botao de sincronizacao existente.

**5. `src/components/SetupChecklist.tsx`**

- Adicionar nova prop `hasLeaderSync: boolean` e `onOpenLeaderSync: () => void`
- Inserir novo passo apos "Cadastre seu primeiro liderado" e antes de "Crie uma nota rapida":
  - Label: "Configure seu perfil de lideranca"
  - Descricao visual no actionLabel: "3 min"
  - `done: hasLeaderSync`
  - `action: onOpenLeaderSync`

**6. `src/pages/Index.tsx`**

- Na query de `onboardingStatus`, adicionar check se `workspace.leader_sync_data` nao e null
- Passar `hasLeaderSync` e `onOpenLeaderSync` para o SetupChecklist
- Adicionar estado para controlar abertura do LeaderSyncWizard
- Renderizar `LeaderSyncReminder` acima do SetupChecklist (apenas se leader_sync ja foi feito ha mais de 180 dias)

**7. `src/types/team.ts`**

Atualizar interface `Workspace` para incluir `leader_sync_data` e `leader_sync_completed_at` opcionais.

### Detalhes Tecnicos

**Estrutura do `leader_sync_data` (JSONB):**

```text
{
  "leadership_tenure": "1_to_3",
  "team_size": "4_to_7",
  "biggest_challenge": "texto livre...",
  "energizers": ["develop_people", "build_culture"],
  "drainers": ["conflicts", "too_many_meetings"],
  "monitoring_style": "autonomy_check",
  "difficult_feedback_style": "direct",
  "low_performance_reaction": "next_1on1",
  "recognition_type": "public_praise",
  "feedback_received": "texto livre...",
  "development_goal": "texto livre...",
  "desired_legacy": "texto livre...",
  "version": 1,
  "completed_at": "2026-02-22T..."
}
```

**Logica do Lembrete de 6 meses:**

- Calcula `daysSinceSync = differenceInDays(now, leader_sync_completed_at)`
- Se `daysSinceSync >= 180`, verifica localStorage key `leader_sync_dismiss_until`
- Se dismiss expirou ou nao existe, mostra banner
- "Agora nao" seta `leader_sync_dismiss_until = addDays(now, 30)` em localStorage

**Fluxo de re-preenchimento:**

Diferente do Sync do liderado (que bloqueia re-submissao), o lider pode atualizar seu perfil a qualquer momento. O UPDATE simplesmente sobrescreve `leader_sync_data` e atualiza `leader_sync_completed_at`.

### O que NAO muda

- Rhitmo Sync do liderado (`/sync/:memberId`) permanece intacto
- Nenhuma tabela existente e alterada alem da adicao das 2 colunas em `workspaces`
- Layout e comportamento existente do SetupChecklist (apenas adiciona 1 passo)
- Sidebar nao ganha novo link -- o acesso e via Configuracoes (Settings icon) que ja existe

