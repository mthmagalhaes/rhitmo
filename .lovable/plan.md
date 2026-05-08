## Tour de Boas-vindas — Líder (60s)

Tour contextual minimalista usando **Driver.js**, sem poluir o app. Único ponto de entrada na Home, dispensável, refazível pelo avatar.

### O que será construído

**1. Migração de banco**
- Adicionar coluna `onboarding_tour_completed_at timestamptz` em `profiles` (nullable).
- Sem RLS nova (já coberta pelas policies existentes da tabela).

**2. Dependência**
- `bun add driver.js` (5kb, zero deps).

**3. Componentes novos**
- `src/components/onboarding/LeaderTour.tsx` — orquestra o tour, marca conclusão no perfil, navega entre rotas quando o passo exige.
- `src/hooks/useOnboardingTour.ts` — lê `profile.onboarding_tour_completed_at`, expõe `shouldShowTour`, `startTour()`, `markComplete()`.
- `src/styles/driver-theme.css` — overrides Creme/Bento (Lora nos títulos do popover, Inter no corpo, accent Rhitmo purple, `rounded-2xl`, shadow soft, sem neon).

**4. Pontos de integração**
- `src/pages/lider/Inicio.tsx` (via `Index.tsx` ou direto): botão sutil "✨ Tour de 60s" no canto superior direito da Home — só renderiza se `shouldShowTour === true`. Não é modal, não é banner.
- `src/components/AppSidebar.tsx` (dropdown do avatar / workspace switcher): item "Refazer tour de boas-vindas" sempre disponível.

**5. Fluxo do tour (5 passos)**
```text
1. Sidebar (data-tour="sidebar")
   "Aqui estão suas áreas: 1:1s, Diário, Pessoas, Avaliações."
2. Magic Paste em /lider/diario (data-tour="magic-paste")
   "Cole transcrições do Meet/Tactiq aqui — a Rhitmo extrai feedback, ações e padrões."
3. /lider/contexto (data-tour="contexto-feed")
   "Linha do tempo unificada de tudo que acontece com seu time."
4. /lider/avaliacoes (data-tour="avaliacoes")
   "Performance Reviews montadas automaticamente a partir das evidências."
5. /lider/configuracoes?tab=integracoes (data-tour="integracoes")
   "Conecte Slack e Google Calendar para a Rhitmo trabalhar em background."
```
Ao final: `markComplete()` grava timestamp e mostra um toast discreto "Tudo pronto. Bom rhitmo. 🌀".

**6. Atributos `data-tour`**
Adicionar atributos data nos elementos-âncora existentes (sidebar, botão Magic Paste, header de cada página). Zero impacto visual.

### Princípios de design

- **Um único ponto de entrada visual** (botão sutil na Home), nada de badges/confete/checklist permanente.
- **Dispensável**: clicar fora ou ESC fecha e marca como completo.
- **Refazível**: opção no dropdown do avatar resolve "esqueci como funciona" sem help center.
- **Não bloqueia o app**: spotlight + popover, usuário pode interagir normalmente após fechar.
- **Tema Creme/Bento**: popover `rounded-2xl`, sombra `0_2px_20px_rgba(0,0,0,0.04)`, accent Rhitmo purple, Lora no título, Inter no corpo.

### Detalhes técnicos

- Driver.js navega entre rotas via callback `onNextClick` chamando `navigate()` do react-router antes do próximo step.
- `shouldShowTour` = `profile.onboarding_tour_completed_at IS NULL && isLeader`. Liderados não veem.
- `markComplete()` faz `UPDATE profiles SET onboarding_tour_completed_at = now() WHERE id = auth.uid()`.
- Tour não dispara automaticamente — sempre clique no botão. Evita susto no primeiro login enquanto o WorkspaceOnboarding ainda está rodando.
- CSS scopeado com prefixo `.driver-popover.rhitmo-theme` para não vazar.

### Arquivos tocados

- `supabase/migrations/<novo>.sql` (add coluna)
- `package.json` (driver.js)
- `src/components/onboarding/LeaderTour.tsx` (novo)
- `src/hooks/useOnboardingTour.ts` (novo)
- `src/styles/driver-theme.css` (novo)
- `src/pages/Index.tsx` ou `src/pages/lider/Inicio.tsx` (botão de entrada)
- `src/components/AppSidebar.tsx` (item "Refazer tour")
- ~5 arquivos existentes recebem `data-tour="..."` nos elementos-âncora

Sem novas rotas, sem novos providers globais, sem mudanças de layout.
