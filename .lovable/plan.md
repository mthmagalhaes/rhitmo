## Diagnóstico

Comparando nossas telas atuais com a referência Windmill:

**Problemas identificados (1:1s, Diário, Objetivos):**

1. **Header da página flutua "soltinho"** acima da master list, criando uma faixa horizontal que atravessa AS DUAS colunas. Resultado: o "1:1s · 6 pessoas" fica do lado esquerdo, mas a linha visual continua até o lado direito, sem fechamento. Isso é o que o usuário marcou de vermelho na primeira screenshot.
2. **TeamTabs (Todos / Business Ops / CreativeOps...) está renderizado no topo da master list (320px)** mas com largura excedente — vaza para dentro do painel direito porque usa `flex-wrap` sem clipping. Resultado: as abas atravessam o divisor vertical.
3. **Empty state do painel direito** (`EmptyMemberDetail`) tem um quadrado de fundo lavanda atrás do ícone que parece um "card invasor" sobre a área da timeline (segunda screenshot do usuário marcada em vermelho).
4. **Falta o divisor vertical claro** entre master list e detalhe — no Windmill o divisor é um único `border-r` limpo, do topo ao rodapé, sem cards/headers cruzando ele.
5. **Footer "Novo liderado"** está flutuando como botão com ícone à esquerda; no Windmill é um item discreto de texto, alinhado.
6. **Padding inconsistente** entre as 3 páginas — Diário usa banner de privacidade dentro do conteúdo, mas o cabeçalho `Diário de Bordo · ` flutua igualzinho o do 1:1s, criando o mesmo "L invertido" visual.

**Referência Windmill (screenshot do usuário):**
- Layout 100% limpo de duas colunas com border-r único entre elas.
- Header da página vive DENTRO da coluna direita (não atravessa a master list).
- Master list ocupa 100% da altura, com seu próprio título no topo.
- Empty state é minimalista: ícone outline pequeno + título + descrição centralizados, SEM card com fundo colorido atrás do ícone.
- Sem TeamTabs vazando — quando precisa filtrar, é dentro da master list, contido.

## Solução

Refatorar 3 arquivos de página + 2 componentes compartilhados para implementar um layout de duas colunas 100% disciplinado, ao estilo Windmill.

### Mudanças por arquivo

**`src/components/leader/MemberMasterList.tsx`**
- Remover `mb-4` do trigger mobile (não causa problema mas vamos limpar).
- Manter aside com `border-r` único, mas garantir que o filho `<InnerList>` use `overflow-hidden` no container do `TeamTabs` para evitar overflow horizontal.
- TeamTabs hoje usa `flex-wrap` — vamos trocar por `overflow-x-auto` com scroll horizontal sutil + `flex-nowrap`, ou (preferível) usar um Select compacto quando há >3 times. Decisão: scroll-x horizontal contido, nenhum wrap. Vai garantir que NUNCA vaze para fora da master list.
- Remover o título da master list duplicado (hoje tem "1:1s · 6 pessoas") — o título da página fica APENAS na coluna direita. A master list ganha um header neutro: apenas "Liderados · N" pequeno e cinza, sempre. Isso elimina a redundância visual de "1:1s" aparecer duas vezes (no breadcrumb e dentro da lista).
- Footer "Novo liderado" → estilo `ghost` mas com ícone menor e padding maior pra parecer um item de menu, não um botão CTA.

**`src/components/leader/EmptyMemberDetail.tsx`**
- REMOVER o quadrado lavanda (`bg-primary/10 rounded-2xl`) atrás do ícone — esse é o quadrado invasor que aparece na screenshot do usuário.
- Substituir por: ícone outline simples (cor `text-muted-foreground/40`, tamanho `h-12 w-12`), centralizado, SEM background.
- Ajustar tipografia para parecer mais Windmill: título serif menor (`text-lg`), descrição menor (`text-xs text-muted-foreground/80`), max-w-xs.

**`src/pages/lider/OneOnOnes.tsx`, `Diario.tsx`, `Objetivos.tsx`**

O fix arquitetural principal: hoje cada página coloca `<MemberMasterList>` ao lado de `<main>`. Mas o título "1:1s · 6 pessoas" está dentro do `<MemberMasterList>` — o que faz com que a faixa horizontal do título fique apenas na coluna esquerda (320px), enquanto o detalhe do liderado fica do outro lado. Isso PARECE certo no código mas visualmente cria a "linha quebrada" que o usuário viu.

Solução:
- A master list vai ter APENAS um header sutil ("Liderados · N pessoas"), nunca o nome da página.
- O título da página ("1:1s", "Diário de Bordo", "Objetivos") vai SEMPRE viver dentro do `<main>`, ACIMA do conteúdo do liderado selecionado, mesmo no estado vazio.
- Quando não há liderado selecionado, o `<main>` mostra: título da página (h1 grande) + descrição + EmptyMemberDetail centralizado.
- Quando há liderado, o `<main>` mostra: título da página menor (subtítulo) + cabeçalho do liderado + conteúdo.

Isso elimina a "faixa flutuante" e dá a sensação de "duas colunas independentes" que a Windmill tem.

**Padronizar containers do `<main>`:**
- Largura: trocar `max-w-3xl` por `max-w-2xl` (mais próximo do Windmill que tem ~640px de conteúdo útil).
- Padding: `px-8 py-10` (mais ar, menos apertado).
- `space-y-8` (não 6).

**Diário de Bordo especificamente:**
- O banner "Notas 100% privadas" hoje é um Card com bg-muted/40. Vamos transformá-lo num **alert inline mais sutil**: apenas um pequeno bloco com `border-l-2 border-primary/30 pl-3 py-1` + texto pequeno. Sem card, sem ícone destacado. Privacidade vira um **status indicator**, não um banner intrusivo (alinhado com o que a Windmill faz com as Private Notes).

### Layout final (referência ASCII)

```text
┌─────────────────┬──────────────────────────────────────────┐
│ Liderados · 6   │                                          │
│ ─────────────── │                                          │
│ [tabs scroll]   │   1:1s                                   │
│                 │   ─────────────                          │
│ ● Gabriela      │                                          │
│ ● Giovanna      │   [avatar] Gabriela Lucas                │
│ ● Guilherme     │           Analista de Business Ops       │
│ ● Laís          │                                          │
│ ● Matheus       │   ✨ Sugestões da Rhitmo ...             │
│ ● Yasmin        │                                          │
│                 │   Próximas reuniões                      │
│                 │   [card]                                 │
│                 │                                          │
│ ─────────────── │   Pauta · Anotação privada               │
│ + Novo liderado │   [textarea] [textarea]                  │
└─────────────────┴──────────────────────────────────────────┘
```

Estado vazio:
```text
┌─────────────────┬──────────────────────────────────────────┐
│ Liderados · 6   │                                          │
│ [tabs]          │   1:1s                                   │
│                 │   ─────────────                          │
│ ● Gabriela      │                                          │
│ ● Giovanna      │              📅 (ícone outline)          │
│ ● ...           │       Selecione um liderado              │
│                 │   Escolha alguém na lista à esquerda     │
└─────────────────┴──────────────────────────────────────────┘
```

## Arquivos editados

1. `src/components/leader/MemberMasterList.tsx` — header sempre genérico ("Liderados · N"), TeamTabs com overflow contido
2. `src/components/leader/EmptyMemberDetail.tsx` — remove quadrado lavanda, ícone outline simples
3. `src/pages/lider/OneOnOnes.tsx` — título da página dentro do `<main>`, max-w-2xl, espaçamento maior
4. `src/pages/lider/Diario.tsx` — mesmo + banner privacidade vira inline sutil
5. `src/pages/lider/Objetivos.tsx` — mesmo padrão
6. `.lovable/memory/design/dashboard/master-detail-pages.md` — atualizar com regras "header da página vive na coluna direita" e "master list nunca duplica nome da página"

## Fora de escopo

- Não mexemos na lógica de salvamento (AgendaBlock, GoalsManager, FeedbackTimeline continuam idênticos).
- Não mexemos em `useLeaderMembers`.
- Não alteramos o comportamento mobile (sheet continua igual).
- Não tocamos em outras páginas (`/lider/inicio`, `/lider/contexto`, `/lider/pulse`, `/lider/avaliacoes`).