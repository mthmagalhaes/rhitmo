## Objetivo

Padronizar **/lider/avaliacoes** com a mesma estrutura Master-Detail full-bleed das páginas **/lider/1on1s**, **/lider/diario** e **/lider/objetivos**: lista de liderados fixa à esquerda (260px), conteúdo à direita. Hoje a página usa um grid de cartões grandes + modal, o que destoa visualmente do resto da navegação.

## Comportamento atual

- Página renderiza `MembersGrid` (cartões grandes com avatar, time, "Slack ✓", botão "Ver").
- Clicar num liderado abre um **Dialog** com 2 cartões: "Rhitmo" (Mensal/Trimestral) e "Avaliações Formais".
- Cada ação navega para `/member/:id?tab=...`.

## Comportamento desejado

Mesma estrutura de Diário/Objetivos:

```text
┌──────────────┬──────────────────────────────────────────┐
│ MasterList   │  AVALIAÇÕES (eyebrow)                    │
│ (liderados)  │  ┌─ Avatar + Nome + Cargo ─────────────┐ │
│              │                                         │
│ • Gabriela ◄ │  Escolha o tipo de avaliação:           │
│ • Giovanna   │                                         │
│ • Guilherme  │  ┌────────────────────────────────────┐ │
│ • Laís       │  │ 🎵 Rhitmo                          │ │
│ • Matheus    │  │ Resumos automáticos…               │ │
│ • Yasmin     │  │ [ Mensal → ]  [ Trimestral → ]     │ │
│              │  └────────────────────────────────────┘ │
│              │  ┌────────────────────────────────────┐ │
│              │  │ ✨ Avaliação Formal                │ │
│              │  │ Performance Review com evidências  │ │
│              │  └────────────────────────────────────┘ │
└──────────────┴──────────────────────────────────────────┘
```

Sem modal. Os 2 cartões (que já existem no Dialog) viram conteúdo inline da coluna direita quando há liderado selecionado. Sem liderado selecionado, mostra empty state estilo Diário.

## Mudanças

### `src/pages/lider/Avaliacoes.tsx` — reescrita completa

Espelhar o esqueleto de `Objetivos.tsx`:

- Container raiz: `flex h-[calc(100svh-3.5rem)] lg:h-[calc(100svh-3rem)] overflow-hidden`.
- `MemberMasterList` à esquerda com `selectedMemberId` + `onSelect` (`LeaderMemberRow`).
- `<main>` à direita: `flex-1 min-w-0 overflow-y-auto bg-background`, container interno `max-w-3xl px-6 lg:px-8 py-6`.
- Estado vazio: header "Avaliações" + `EmptyMemberDetail` com ícone `ClipboardCheck`, copy "Selecione um liderado" / "Escolha alguém à esquerda para gerar um Rhitmo (mensal/trimestral) ou uma Avaliação Formal."
- Estado com liderado:
  - Eyebrow `AVALIAÇÕES`
  - Header com `MemberAvatar size="lg"` + nome + cargo (mesmo bloco usado em Diário/Objetivos)
  - Subtítulo curto: "Escolha o tipo de avaliação."
  - Os 2 `Card`s já existentes (Rhitmo com sub-botões Mensal/Trimestral + Avaliação Formal), reutilizando o JSX atual sem alterar estilos, ações ou rotas (`/member/:id?tab=rhitmo&sub=monthly|quarterly` e `/member/:id?tab=reviews&action=new`).
- Remover: `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `MembersGrid`.
- Adicionar imports: `MemberMasterList`, `EmptyMemberDetail`, `MemberAvatar`, `LeaderMemberRow`.

### Memória

Atualizar `mem://design/dashboard/master-detail-pages` para incluir `/lider/avaliacoes` na lista de páginas que seguem este padrão.

## Não muda

- Lógica de navegação para `/member/:id?tab=...` (rotas, params, comportamento).
- Componentes filhos (`MemberMasterList`, `EmptyMemberDetail`, `MemberAvatar`).
- Os 2 cartões de ação (Rhitmo / Avaliação Formal) mantêm copy, ícones e estilos atuais.
- Outras páginas do líder.

## Riscos

Baixíssimos. Página é puramente de seleção + roteamento; não toca em RPC, dados ou RLS. O grid antigo (`MembersGrid` no modo `select`) continua usado em outros lugares (não removido).
