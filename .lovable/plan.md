## Objetivo
Substituir os dois cards ilustrativos do hero da Landing (`src/pages/Landing.tsx`, linhas 996–1053) por mockups fiéis às telas reais anexadas:
1. **Card principal** → Sheet do liderado "Gabriela Lucas · Rhitmo Mensal — Maio de 2026" (a imagem com fundo creme).
2. **Card flutuante** → Mini-preview da listagem "Diário de Bordo · Anotações" (a segunda imagem, condensada).

Mantém a moldura iridescente e a janela com os dots de browser para preservar o "produto vivo" do hero.

## Edições de design para ficar mais fluido/profissional
- **Card principal (sheet do Rhitmo Mensal):**
  - Cabeçalho creme (`bg-[#f5f0e8]`) com avatar laranja gradiente (mesmo do produto), nome em serifa `font-serif font-bold` e subtítulo "Analista de Business Ops".
  - Banner "Rhitmo desta pessoa" em card branco com borda suave, pílula verde `6 confirmado(s)` e botão pílula "Ver linha do tempo Rhitmo ↓" (apenas visual).
  - Tabs em pílula segmentada: **Acompanhamento Mensal** (ativo, branco) | **Histórico Formal**.
  - Bloco "Junho de 2026 · Mês em curso" tracejado.
  - Card destacado "Rhitmo Mensal — Maio de 2026 · Confirmado 10/06" com **anel azul fino** (`ring-1 ring-indigo-300/60`) — esse é o foco visual.
  - Conteúdo do mês: três blocos `1. MANDOU BEM`, `2. ATENÇÃO`, `3. PADRÃO DO MÊS` em uppercase `tracking-[0.16em]` com cópia curta (mesma da screenshot, truncada para caber). Pílula de evidência "📄 ANOTAÇÃO · 27/05".
  - Densidade reduzida vs. screenshot real (corte do 3º bloco com fade), pra parecer um preview e não um print.
- **Card flutuante (substitui "Análise IA"):**
  - Vira mini-card "Diário de Bordo" com header pequeno (ícone livro + título serifa + sublabel "5 registros").
  - 2 linhas de anotação enxutas: `🔒 08/06 · Gabriela · Alinhamento Operações` e `🔒 27/05 · sync — Projeto automações`.
  - Mantém posição `-bottom-6 -left-6`, largura ~w-64, sombra `shadow-xl`.
- **Refinos globais do hero:**
  - Trocar fundo da moldura iridescente pra um tom mais quente/creme sutil — combina com o produto real (Bento Creme).
  - Manter os dots do browser; trocar a label da URL pra `rhitmo.co · Pessoas · Gabriela Lucas`.
  - Garantir que tudo cabe sem overflow horizontal em `lg` e que o card flutuante não cobre conteúdo importante (ajustar para `-bottom-8 -left-4`).
  - Tipografia: serifa (`font-serif`) só nos títulos (nome, "Rhitmo Mensal", "Diário de Bordo") — Inter pro resto. Sem emojis decorativos no corpo.
  - Acessibilidade: `aria-hidden="true"` no bloco inteiro (é decorativo).

## Arquivos
- `src/pages/Landing.tsx` — substituir o bloco `{/* Iridescent product card */}` (linhas 996–1053). Sem mudanças em copy fora do mockup, sem novos imports além de `BookOpen`/`Lock`/`Calendar` da lucide-react.

Sem mudanças em outros arquivos, sem backend, sem i18n novo (o mockup tem rótulos PT fixos — segue o padrão atual do produto e da landing PT-first).

## Aprovação
Antes de implementar, aguardo seu OK. Se quiser, posso já gerar um screenshot do resultado proposto via render isolado em vez de descrição — só pedir.
