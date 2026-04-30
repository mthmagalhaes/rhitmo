## Refazer fluxo de Avaliações

### 1. Modal de seleção (`src/pages/lider/Avaliacoes.tsx`)

Reduzir o modal de 3 cards para **2 cards principais**, removendo "Diário de Bordo" e "Objetivo/Meta" (já existem no sidebar):

- **Rhitmo** (card principal)
  - Ícone: `Music` (mantém DNA da marca)
  - Descrição: "Resumos automáticos do mês e do trimestre, com destaques, riscos e ações."
  - Sub-opções inline (dois botões pill dentro do card): **Mensal** | **Trimestral**
  - Mensal → `/member/:id?tab=rhitmo&sub=monthly`
  - Trimestral → `/member/:id?tab=rhitmo&sub=quarterly`

- **Avaliações Formais** (card principal)
  - Ícone: `Sparkles`
  - Descrição: "Performance Review fundamentada em evidências reais. Você revisa, ajusta e compartilha."
  - Click → `/member/:id?tab=reviews&action=new` (deep-link já abre a aba + sinaliza criação)

Layout: dois cards `rounded-2xl` empilhados; dentro do card "Rhitmo", as duas sub-opções aparecem como botões secundários alinhados à direita, separados visualmente do título/descrição.

### 2. CTA contextual no MemberDetails (`src/pages/MemberDetails.tsx`)

Hoje o botão primário do header é fixo "Nova Nota". Vamos torná-lo **contextual ao deep-link**:

- Quando a URL contém `?tab=reviews` (ou seja, o usuário veio do fluxo de Avaliações):
  - Botão primário vira **"Nova Avaliação"** (ícone `Sparkles`)
  - Click → abre `CreateFormalReviewDialog` (já existe em `src/components/review/CreateFormalReviewDialog.tsx`) com o membro pré-selecionado
  - "Nova Nota" desce para dentro do dropdown "Mais ações"
- Caso contrário (qualquer outro tab): mantém "Nova Nota" como hoje

Adicionalmente, se `?action=new` estiver presente junto com `?tab=reviews`, abrir o dialog automaticamente após mount (e limpar o param da URL via `setSearchParams`).

### 3. Limpeza

- Remover do array `cycles` os 3 cards atuais e a iteração `.map(cycles)`; substituir por JSX explícito dos 2 cards.
- Manter `MembersGrid` (seleção de liderado) inalterado.
- Sem mudanças em rotas, navegação, ou MembersGrid.

### Arquivos

- **Editar** `src/pages/lider/Avaliacoes.tsx` — novo conteúdo do modal (2 cards + sub-opções Rhitmo)
- **Editar** `src/pages/MemberDetails.tsx` — CTA contextual no header + auto-open do dialog formal quando `action=new`
- Sem novos componentes, sem mudanças de schema, sem i18n novo (textos PT-BR já no padrão da página)

### Detalhes técnicos

- `useSearchParams` já está em uso em MemberDetails para `tab`/`sub`/`openNote` — adicionar leitura de `action` e do estado `formalReviewDialogOpen`.
- Reaproveitar `CreateFormalReviewDialog` passando `member={{ id, name, role }}` e `workspaceId` (ambos já disponíveis no escopo do componente).
- Garantir que ao fechar o dialog, o param `action` seja removido para evitar reabertura em refresh.
