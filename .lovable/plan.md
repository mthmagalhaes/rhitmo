

## Plano: Redesign das seções Antes & Depois, Comparativo, Resultados e Publico-Alvo + Copy Senior

Baseado nos padroes visuais dominantes no Dribbble para SaaS landing pages premium (cards com gradientes sutis, tipografia de alto contraste, layouts assimétricos, métricas em destaque com animação visual), e aplicando copy de nível senior tech copywriter.

---

### 1. Antes & Depois — De lista simples para "Split Timeline"

**Design:** Inspirado no padrão Dribbble de split-screen com contraste visual forte. Lado esquerdo escuro (problema), lado direito claro com destaque primary (solução). Sem emojis — usar ícones Lucide consistentes.

**Novo copy (PT):**
- Overline: `O DIA A DIA SEM IA`
- Titulo: `"Antes era burocracia. Agora é estratégia."`
- Sem Rhitmo: items reescritos com tom técnico-direto, sem emojis
  - `4h por review — reescrevendo do zero toda vez`
  - `Viés invisível passando despercebido em cada avaliação`
  - `70% das conversas do trimestre esquecidas`
  - `Feedback genérico: "precisa melhorar comunicação"`
  - `Dados espalhados entre planilhas, docs e e-mails`
- Com Rhitmo: items com métrica + resultado
  - `Draft completo em 30 segundos — você só revisa`
  - `Viés detectado e corrigido antes de salvar`
  - `Cada 1:1 registrada automaticamente com contexto`
  - `Feedback baseado em evidências reais, não memória`
  - `Tudo centralizado, organizado por IA`

**Layout:** Dois cards lado a lado, o esquerdo com `bg-muted border-destructive/20`, o direito com `bg-gradient-to-br from-primary/5 to-emerald-500/5 border-primary/30`. Cada item com ícone `XCircle`/`CheckCircle2` inline. Linha central com indicador visual "→" ou seta animada.

---

### 2. Comparativo — De tabela simples para "Feature Showdown"

**Design:** Inspirado nas comparison tables premium do Dribbble — header sticky com logo/nome de cada competidor, coluna Rhitmo com highlight vertical full-height (`bg-primary/5 border-primary/20`), ícones maiores com tooltips.

**Novo copy (PT):**
- Overline: `COMPARATIVO REAL`
- Titulo: `"A diferença não está no que prometem. Está no que entregam."`
- Rows reescritos com verbos de ação:
  - `Escreve review completa de ponta a ponta`
  - `Detecta viés de gênero e personalidade em tempo real`
  - `Mentor IA conversacional no fluxo de trabalho`
  - `Transcreve e analisa 1:1s automaticamente`
  - `Funciona em 5 min — sem demo call, sem implantação`
  - `Plano gratuito real — não trial de 14 dias`

**Layout:** Manter table no desktop, mas adicionar borda arredondada na coluna Rhitmo inteira, com header em `bg-primary text-primary-foreground` para destaque máximo. Mobile mantém accordion.

---

### 3. Resultados — De 3 cards simétricos para "Impact Metrics" com layout assimétrico

**Design:** Inspirado no padrão Dribbble de métricas hero-sized. Card principal (4h → 2min) ocupa largura dupla com tipografia gigante (`text-7xl`). Os dois cards secundários ficam empilhados ao lado.

**Novo copy (PT):**
- Overline: `IMPACTO MENSURÁVEL`
- Titulo: `"Não é promessa. São números."`
- Card 1 (hero): `4h → 2min` / `Tempo médio para escrever uma avaliação de desempenho completa. De uma tarde inteira para o tempo de um café.`
- Card 2: `38x` / `Mulheres recebem 38x mais feedback sobre personalidade do que homens. Rhitmo detecta e corrige antes que você publique.`
- Card 3: `60%` (novo) / `Redução no custo por líder comparado a plataformas tradicionais de performance management.`

**Layout:** Grid `grid-cols-1 md:grid-cols-3` com primeiro card `md:col-span-2 md:row-span-2` para criar assimetria Bento-style. Background com gradiente sutil. Cards com `border-l-4 border-primary`.

---

### 4. Publico-Alvo — De 3 cards iguais para "Persona Cards" com hierarquia visual

**Design:** Inspirado em cards de produto premium do Dribbble. Card principal (Líderes) em destaque com borda primary e tamanho maior. Os outros dois em tamanho regular.

**Novo copy (PT):**
- Overline: `FEITO PARA VOCÊ`
- Titulo: `"Quem usa Rhitmo — e por quê."`
- Card 1 (Líderes): `"Você lidera 3 a 10 pessoas. Não tem tempo de escrever reviews do zero. Precisa de um copiloto que registra tudo e entrega o draft pronto."` + badge `Caso de uso #1`
- Card 2 (PMEs): `"20-100 colaboradores, sem RH estruturado. Você quer profissionalizar gestão de performance sem contratar consultoria de R$50k."` + badge `Crescimento rápido`
- Card 3 (Enterprise): `"100+ colaboradores. RH como comprador. Precisa de IA nativa de verdade — não um checkbox de marketing."` + badge `Plano Enterprise` + link

**Layout:** Card do líder com `md:col-span-2` no grid, ou destaque com escala `scale-105` e shadow maior. Ícones maiores (`h-8 w-8`) dentro de containers circulares em vez de quadrados.

---

### Arquivos modificados

- `src/pages/Landing.tsx` — redesign das 4 seções + novo copy em PT e EN

### Nao muda
- Estrutura geral da pagina
- Outras seções (Hero, Pricing, FAQ, Footer)
- Componentes reutilizáveis
- Design System tokens

