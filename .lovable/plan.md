

## Plano: Profissionalizar a Landing Page com Design System V2

### Diagnóstico

A landing page tem bom conteúdo e estrutura, mas apresenta inconsistências visuais que reduzem o nível percebido de profissionalismo:

1. **Tipografia não editorial** — Headlines usam `font-extrabold` genérico em vez do `font-serif` (Lora) definido no Design System V2 para títulos e saudações
2. **Sem overlines** — O Design System V2 usa labels em "overline" (uppercase, tracking-wide, text-xs) para cabeçalhos de seção; a landing não usa nenhum
3. **Wave dividers não utilizados** — O componente `WaveDivider` existe mas nunca é usado entre seções; as transições são abruptas
4. **Hero com overlay pesado** — O mix-blend-multiply roxo sobre a imagem parece amador; precisa ser mais sutil
5. **Seções sem respiro** — Padding uniforme `py-20`/`py-24` sem variação de ritmo visual
6. **Cards sem sombras do Design System** — Usa `shadow-sm` genérico em vez dos tokens definidos (`--shadow-md`, `--shadow-lg`)
7. **Footer básico** — Sem identidade visual, sem wave, sem logo

### Mudanças

**1. Tipografia editorial em todas as headlines**
- Todas as `h2` de seção: `font-serif text-3xl lg:text-4xl font-bold tracking-tight`
- Hero `h1`: `font-serif text-4xl lg:text-5xl xl:text-6xl font-bold tracking-tight`
- Adicionar overlines antes de cada título de seção: `<p className="uppercase text-xs font-semibold tracking-widest text-primary">` com texto contextual

**2. Wave dividers entre seções-chave**
- Adicionar `<WaveDivider />` após Hero, antes de Pricing e antes do Footer
- Cria ritmo visual e reforça identidade da marca

**3. Hero refinado**
- Remover overlay `mix-blend-multiply` pesado da imagem
- Substituir por borda suave + sombra editorial (`shadow-2xl` do DS)
- Manter glow sutil mas reduzir intensidade (opacity-30 em vez de 60)

**4. Sombras e cards do Design System**
- Cards de números: `shadow-[var(--shadow-md)]` com hover para `shadow-[var(--shadow-lg)]`
- Pricing cards: mesma progressão de sombras
- Cards "Para quem": sombra editorial + transição suave

**5. Seções com ritmo visual melhorado**
- Alternar entre `py-20` e `py-28` para criar breathing room
- Seção de números: fundo com gradiente mais editorial
- Seção "O que não fazemos": estilo blockquote editorial com borda lateral

**6. Footer profissional**
- Adicionar wave divider acima
- Incluir logo Rhitmo centralizado
- Reorganizar links em layout mais limpo
- Adicionar cor de fundo sutil (`bg-muted/30`)

**7. Micro-refinamentos**
- Botões do hero: `rounded-xl` (Design System) em vez do padrão
- Badge AI-Native: adicionar animação pulse sutil no ícone Sparkles
- Comparison table: header com `bg-primary/5` para destaque da coluna Rhitmo
- FAQ: estilo mais editorial com separadores suaves

### Arquivo modificado
- `src/pages/Landing.tsx` — todas as mudanças visuais acima

### Não muda
- Conteúdo/traduções (pt/en)
- Estrutura de seções
- Componentes reutilizáveis (`RhythmWave`, `WaveDivider`, `RhitmoLogo`)
- Design System tokens em `index.css`

