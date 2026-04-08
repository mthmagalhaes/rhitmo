

## Fase 2 — Comunicação: Rewrite da Landing Page

Todas as mudanças são no arquivo `src/pages/Landing.tsx`. Nenhuma mudança de backend.

---

### 1. Hero: Subhead agressivo + Badge AI-Native

**Substituir** `heroSubtitle` (pt/en) por texto com números concretos:
- PT: "O que levava 4 horas agora leva 2 minutos. Rhitmo é o único parceiro AI-nativo de liderança que transforma suas conversas em reviews prontas."
- EN: "What took 4 hours now takes 2 minutes. Rhitmo is the only AI-native leadership partner that turns your conversations into ready-made reviews."

**Adicionar badge** abaixo dos CTAs no hero:
- `✨ AI-Native desde o dia 1 — Não é um add-on`
- Componente inline com ícone Sparkles, bg gradient roxo/rosa, rounded-full

---

### 2. Nova seção: "Antes vs. Depois" (logo após hero, antes do vídeo)

- 2 colunas desktop, stack mobile
- **Sem Rhitmo** (fundo cinza, ícone X vermelho): 5 itens negativos com números (4h, 70%, viés)
- **Com Rhitmo** (fundo gradient roxo suave, ícone Check verde): 5 itens positivos (30seg, tempo real, automático)

---

### 3. Nova seção: "Rhitmo vs. Outros" (após vídeo)

- Tabela comparativa: Planilhas / Qulture.Rocks / Lattice / **Rhitmo**
- 6 linhas: IA escreve review, Detecção viés, Mentor IA, Transcrição, Self-serve, Grátis até 3
- Desktop: tabela HTML responsiva
- Mobile: cards colapsáveis (Accordion)
- Legenda: ✅ Completo / ~ Parcial / ❌ Não possui

---

### 4. Nova seção: "Números Concretos" (após comparison)

- Grid 3 colunas (stack mobile)
- Card 1: "4h → 2min" + "Tempo para escrever review" (ícone Clock)
- Card 2: "38x" + "Mais feedback negativo para mulheres" (ícone AlertCircle)
- Card 3: "R$49/mês" + "vs. R$108/mês em outras plataformas" (ícone DollarSign)
- Números grandes (text-5xl), fundo gradient suave

---

### 5. Nova seção: "O que só Rhitmo faz" (após números)

- Grid 3 colunas com ícones grandes
- Coluna 1: Zap — "IA que escreve (não sugere)"
- Coluna 2: Shield — "Detecção de viés em tempo real"
- Coluna 3: Mic — "Transcrição automática"
- CTA ao final: "Ver Rhitmo em Ação" → scroll para vídeo

---

### 6. Tom de voz: limpar textos genéricos

**Atualizar translations pt/en:**
- `leadersP1` e `leadersP2`: remover "cultura de alta performance", "complexidade", substituir por frases com números
- `reportsP1` e `reportsP2`: manter essência mas adicionar dados concretos
- `hrP1` e `hrP2`: substituir "microgerenciar o processo" por comparações numéricas
- `videoSubtitle`: "Transforme a gestão do seu time" → "Veja como uma review de 4 horas vira 2 minutos"

---

### 7. Footer: links comparativos

- Adicionar seção no footer com 3 links placeholder:
  - "Rhitmo vs. Qulture.Rocks"
  - "Rhitmo vs. Feedz"
  - "Rhitmo vs. Lattice"
- Links apontam para `#` por enquanto (páginas comparativas criadas na Fase 3)

---

### Ordem das seções (resultado final)

```text
Header (com Enterprise link — já existe)
Hero (subhead atualizado + badge AI-Native)
Antes vs. Depois (NOVA)
Vídeo Demo (existente, subtitle atualizado)
Rhitmo vs. Outros (NOVA — comparison table)
Números Concretos (NOVA)
O que só Rhitmo faz (NOVA — 3 USPs)
Para Líderes (existente, textos atualizados)
Para Pessoas Lideradas (existente, textos atualizados)
Para RH (existente, textos atualizados)
Pricing (existente, intacto)
Footer (atualizado com links comparativos)
```

### Imports adicionais
- `Clock`, `AlertCircle`, `DollarSign`, `Shield`, `Mic`, `XCircle`, `CheckCircle2` de lucide-react
- `Accordion` components de shadcn para mobile comparison table

### Arquivo alterado
| Arquivo | Ação |
|---------|------|
| `src/pages/Landing.tsx` | Translations atualizadas + 4 novas seções + badge hero + footer links |

### O que NÃO muda
- Pricing cards (Pulse/Pro/Business/Enterprise): intactos
- Checkout flow: intacto
- Imagens existentes: mantidas
- Rotas: nenhuma nova

