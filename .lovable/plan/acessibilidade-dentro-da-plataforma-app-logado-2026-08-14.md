# Acessibilidade dentro da plataforma (app logado)

Os tokens de cor e os chips já foram corrigidos globalmente, então o app herdou boa parte da melhoria. O que sobrou é específico das telas internas. Levantamento feito no código agora.

## O que está pendente (por severidade)

### Crítico — bloqueia quem usa leitor de tela ou teclado
1. **Botões só com ícone sem nome acessível.** 36 arquivos usam `size="icon"`; em boa parte deles não há `aria-label` (ex.: `GoalCard`, `VoiceInput`, `BiasAlert`, `TeamMemberCard`, `ActivityBadge`, `PendingInvitesSection`, `Pessoas`, `HRPessoas`, `CompetencyFramework`, `ActivitySheet`, `NewPDIDialog`, `Billing`). O leitor de tela anuncia apenas "botão".
2. **Imagens sem `alt`.** `MemberAvatar.tsx` (foto do liderado) e `MentorChat.tsx` (anexo enviado pelo líder) renderizam `<img>` sem alternativa textual.
3. **Múltiplos `<main>` por rota.** Existem 11 `<main>` no app, incluindo um dentro de `components/ui/sidebar.tsx` que pode aninhar com o `<main id="main-content">` do `AppLayout`. Landmark duplicado quebra a navegação por regiões.

### Aviso — degrada a experiência
4. **Cores fixas fora do design system em telas internas:** `HRTeams.tsx` (16 ocorrências), `TranscriptExpandedView.tsx`, `MemberDetails.tsx`, `CompetencyCard`, `WorkStyleCard`, `CompetencyPreviewTable`, `CompanyCard`, `CompaniesTable`, `AdminUsers`, `ProfileSettingsDialog`, `BiasDetectionPanel`, `SyncQrHandoff`. São `text-white`/`bg-white`/`text-slate-*` que ignoram tema e contraste.
5. **Restos de opacidade em texto secundário:** 6 arquivos ainda usam `text-muted-foreground/10..60`.
6. **`h-screen` em vez de `h-dvh`** em telas de tela cheia (Onboarding, AuthPage, Invite, PersonaSelector, CompanySetup, RhitmoSync, SlackConnect, HRRitmo, NotFound e outras). No mobile a barra do navegador corta o conteúdo.
7. **Alvos de toque menores que 44px:** botões ícone com `h-7 w-7` e `h-8 w-8` em Pessoas, GoalCard, BiasAlert, CompetencyFramework.

### Info — polimento
8. **Contraste do anel de foco.** O `--ring` roxo tem contraste baixo sobre o roxo do botão primário; adicionar `ring-offset` já existe, falta validar nos botões primários e nos chips.
9. **Regiões dinâmicas sem `aria-live`:** toasts do app já cobrem, mas chat do Mentor e estados de "processando transcrição" não anunciam atualização.

## Ordem de execução proposta

1. Nomes acessíveis em todos os botões ícone + `alt` nas duas imagens.
2. Um único `<main>` por rota (remover/renomear o do sidebar e os aninhados).
3. Substituir cores fixas pelos tokens semânticos nas 12 telas listadas e limpar as opacidades restantes.
4. `h-screen` → `h-dvh` nas telas cheias; alvos de toque para `min-h-11 min-w-11` nos ícones primários.
5. Validação: varredura de contraste nos estados (hover, disabled, selecionado) em claro e escuro, com screenshots das telas principais (Home, Diário, Avaliações, Pessoas, Configurações, Admin).

## Notas técnicas

- Nenhuma mudança de regra de negócio, RLS ou edge function: o trabalho é 100% de apresentação.
- Os tokens novos (`success-strong`, `warning-strong`, `info-strong`, `--input`) já existem e devem ser reusados no lugar de cores fixas.
- Botões ícone usam o `Button` do shadcn, então basta `aria-label`; não é necessário criar wrapper novo.
- Os `<img>` de avatar devem usar `alt=""` quando houver o nome ao lado (decorativo) e `alt={nome}` quando o avatar for o único identificador.
