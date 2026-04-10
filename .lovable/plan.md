

## Plano: Corrigir layout das seções "Quem usa Rhitmo" e "Pricing"

### Problemas identificados

**Seção "Quem usa Rhitmo" (Persona Cards):**
- O card "Líderes individuais" usa `md:scale-105` + `border-2 border-primary`, fazendo ele parecer maior que os outros dois
- Os cards PME e Enterprise não têm CTA/botão, criando alturas desiguais
- Falta consistência visual entre os três cards

**Seção "Pricing":**
- 4 cards em `lg:grid-cols-4` ficam comprimidos, textos quebram em linhas curtas
- O card Pro usa `md:-translate-y-2` criando desalinhamento vertical
- Botões em posições diferentes porque o conteúdo acima varia em altura
- Cards Enterprise e Business ficam estreitos com features longas quebrando mal

### Solução proposta

**Persona Cards: Cards uniformes com altura equalizada**
- Remover `md:scale-105` do card de líder (destaque fica apenas na borda roxa)
- Adicionar `flex flex-col` + `h-full` em todos os cards para equalizar altura
- Adicionar CTA secundário nos cards PME ("Começar grátis") e manter link Enterprise
- Usar `min-h-[...] flex flex-col justify-between` para alinhar conteúdo e CTAs na base

**Pricing: Layout 2+2 em telas médias, 4 colunas só em telas grandes**
- Trocar grid para `md:grid-cols-2 xl:grid-cols-4` para dar mais espaço aos cards em telas médias
- Remover `md:-translate-y-2` do card Pro (destaque via borda roxa e badge é suficiente)
- Usar `flex flex-col` + `flex-1` na área de features para empurrar botões para a mesma linha base
- Estruturar cada card como: header fixo > preço > botão > features (com `mt-auto` no botão)
- Reduzir `max-w-7xl` para `max-w-6xl` para evitar cards excessivamente estreitos em 4 colunas

### Mudanças no arquivo

**`src/pages/Landing.tsx`**

1. **Persona Cards (linhas 1067-1103):** Refatorar o grid para cards uniformes com `flex flex-col h-full`, remover `scale-105`, adicionar CTA no card PME, alinhar conteúdo verticalmente

2. **Pricing Cards (linhas 1148-1290):** Refatorar para `md:grid-cols-2 xl:grid-cols-4`, remover translate-y do Pro, usar flexbox vertical com `mt-auto` para alinhar botões, garantir que textos não quebrem mal

### O que NÃO muda
- Conteúdo textual (copy) de nenhuma seção
- Cores, badges, ícones existentes
- Estrutura de traduções PT/EN
- Outras seções da landing page

