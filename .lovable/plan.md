## Fase 2 — Migração completa 1:1s → Pessoas

A página de teste foi aprovada. Agora promovemos `/lider/pessoas-v2` ao lugar oficial, com 3 ajustes:

1. **Mais espaço na tabela** (estilo Tako, full-bleed, não mais limitada a `max-w-5xl`).
2. **CTAs "Adicionar liderado" e "Adicionar time"** vivem na nova Pessoas (botão também segue no Workspace switcher).
3. **Zero quebra** de rotas/links antigos do 1:1s.

---

### 1. Sidebar e rotas

Em `src/lib/navigation.ts`:
- Item `1on1s` da sidebar do líder vira **Pessoas** (ícone `Users`, labelKey `nav.lider.pessoas`), apontando para `/lider/pessoas`.

Em `src/App.tsx`:
- `/lider/pessoas` → nova lista (Tako-style, código vindo de `PessoasV2`).
- `/lider/1on1s` → `<Navigate to="/lider/pessoas" replace />` (preserva links salvos, Slack DMs antigas, e-mails).
- `/lider/1on1s/:meetingId` → permanece intacto (continua renderizando `BriefPage` — não tem nada a ver com a tela 1:1s, é deep-link de meeting).
- `/lider/pessoas-v2` → `<Navigate to="/lider/pessoas" replace />` (legacy da fase de teste).
- `/analytics` → continua redirecionando para `/lider/pessoas?tab=analytics` (já existe; agora a aba Analytics mora dentro da nova Pessoas).

i18n: adiciono `nav.lider.pessoas` em `pt-BR/en/es` (mantenho `nav.lider.um_pra_um` no JSON pra compat, sem uso).

### 2. Nova `/lider/pessoas` — full-bleed Tako-style

`src/pages/lider/Pessoas.tsx` é reescrita combinando o melhor das duas páginas:

- **Layout full-bleed** (igual ao master-detail das outras páginas do líder, mas sem sidebar lateral):
  - Root `h-[calc(100svh-3rem)] overflow-hidden` + `main overflow-y-auto`.
  - Conteúdo usa `max-w-7xl px-6 lg:px-8` (em vez de `max-w-5xl`) — aproveita melhor o espaço horizontal da tabela, idêntico ao padrão Tako/Linear.
- **Header editorial** com título "Pessoas", subtítulo e CTAs à direita:
  - `[ + Adicionar liderado ]` (primário) → abre `NewMemberDialog` (mesmo dialog do workspace switcher).
  - `[ + Adicionar time ]` (outline, só visível para HR Admin/Owner) → abre dialog/inline para criar time.
- **Tabs no topo** (componente `PageTabs` que já existe):
  1. **Liderados** (default) — lista densa estilo Tako, ocupando toda a largura.
  2. **Convites** — conteúdo atual do `InvitesTab` da Pessoas legacy (pendentes, bounce, reenviar).
  3. **Times** (só HR Admin) — conteúdo do `TeamsTab` atual + botão "Novo time".
  4. **Analytics** — `<AnalyticsContent />` atual.
- **Tabela de Liderados** (aba default):
  - Header `bg-muted/30`, linhas 44px, avatar sm, bolinha de health (`fresh/warm/cold`).
  - Colunas: Nome (avatar+nome+health) · Cargo · Time · Último sinal · chevron.
  - Toolbar: busca por nome/cargo + Select de time + contador `N de N`.
  - Click na linha → `navigate('/member/:id')`.
  - Footer-row "Novo liderado" abre `NewMemberDialog`.
- Deep-link `?tab=analytics|convites|times|membros` é respeitado.

### 3. Ficha do liderado absorve o que era exclusivo da 1:1s

Em `src/pages/MemberDetails.tsx`, adicionar nova aba **"1:1"** dentro do `Tabs` existente (junto de `diary`, `rhitmo`, `reviews`), com:

1. `OneOnOnePrepCard` (sugestões da Rhitmo)
2. `MemberUpcomingMeetings`
3. `SlackActivityCard`
4. CTA "Ver histórico de 1:1s" → muda para a aba `diary`

A aba aparece como default quando a ficha é aberta via lista de Pessoas (sem `?tab=`). Deep-links existentes (`?tab=diary|rhitmo|reviews`) continuam funcionando.

### 4. O que morre da página 1:1s

A página `src/pages/lider/OneOnOnes.tsx` vira:

```tsx
import { Navigate } from 'react-router-dom';
export default function LiderOneOnOnes() {
  return <Navigate to="/lider/pessoas" replace />;
}
```

Componentes `AgendaBlock` (pauta compartilhada), `ActionItemsBlock` (itens de ação) e `AgendaBlock` (anotação privada) **continuam no repo** mas saem de qualquer rota viva. Sem migração de dados — só desuso na UI. Manter no repo permite reaproveitar nos briefs/recall se quisermos.

### 5. Garantias de "nada quebra"

- `/lider/1on1s` → redireciona pra `/lider/pessoas` (preserva links salvos).
- `/lider/1on1s/:meetingId` → continua funcionando (é `BriefPage`, independente).
- `/lider/pessoas-v2` → redireciona pra `/lider/pessoas` (não quebra o teste atual).
- `/analytics` → continua indo para `/lider/pessoas?tab=analytics`.
- `/lider/pessoas?tab=convites|times|analytics|membros` → continua respeitado (aba `membros` agora é a lista nova).
- `NewMemberDialog` no Workspace switcher segue intacto (memória `workspace-switcher-actions` preservada).
- `BulkOnboardDialog` segue acessível via aba Convites (e em `/admin`).
- `MemberDetails` ganha aba nova; deep-links `?tab=` antigos seguem funcionando.

### 6. Memória

Após esta fase:
- Atualizar `mem://design/dashboard/master-detail-pages` removendo `/lider/1on1s` (não é mais master-detail).
- Criar `mem://features/people/pessoas-page` documentando: tabs (Liderados/Convites/Times/Analytics), full-bleed Tako-style com `max-w-7xl`, CTAs (Adicionar liderado/time) duplicados no Workspace switcher, redirect `/lider/1on1s → /lider/pessoas`.
- Atualizar `mem://design/sidebar/workspace-switcher-actions` esclarecendo que "Adicionar liderado" agora tem 2 entradas (workspace switcher + página Pessoas), por design.

---

### Arquivos tocados

| Arquivo | Mudança |
|---|---|
| `src/pages/lider/Pessoas.tsx` | Reescrito: tabs (Liderados Tako-style/Convites/Times/Analytics), full-bleed, CTAs de Adicionar |
| `src/pages/lider/OneOnOnes.tsx` | Substituído por `<Navigate to="/lider/pessoas" replace />` |
| `src/pages/lider/PessoasV2.tsx` | **Deletado** (conteúdo absorvido por `Pessoas.tsx`) |
| `src/pages/MemberDetails.tsx` | Adiciona aba "1:1" com `OneOnOnePrepCard` + `MemberUpcomingMeetings` + `SlackActivityCard` |
| `src/App.tsx` | Redirects de `/lider/1on1s` e `/lider/pessoas-v2`; remove import de `PessoasV2` |
| `src/lib/navigation.ts` | Item sidebar `1on1s` → `pessoas` (labelKey + to + icon mantém Users) |
| `src/i18n/locales/{pt-BR,en,es}.json` | `nav.lider.pessoas` |
| `.lovable/memory/...` | 3 memórias atualizadas/criadas (ver §6) |

### Pergunta única antes de codar

**"Adicionar time"** — só pra HR Admin/Owner ou pra todo líder? Hoje o `TeamsTab` legacy mostra times só pra HR Admin. Default que vou adotar se você não responder: **só HR Admin/Owner** (consistente com o resto do sistema; líderes comuns não criam times, só consomem). Líderes comuns veem o botão "Adicionar liderado" mas não "Adicionar time".
