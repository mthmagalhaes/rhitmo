

# Redesenhar página de Pricing — copy benefit-first + hierarquia visual

## Objetivo

Reescrever copy e refinar a apresentação visual da seção `#pricing` em `src/pages/Landing.tsx` para falar com líderes (não com usuários técnicos). **Sem mexer em preços, ciclos de billing, Stripe IDs ou qualquer lógica.** Aplicar em ambos os idiomas (`pt` e `en`).

## O que muda

### 1. Copy das listas (blocos `pt` e `en` em `translations`)

**Pulse — foco em "começar sem risco"** (substituir `pulseFeatures` e remover `pulseLocked`):
- "Até 2 liderados diretos" / "Up to 2 direct reports"
- "Diário de bordo ilimitado" / "Unlimited journal"
- "1 avaliação com IA por mês" / "1 AI review per month"
- "Mentor AI — até 20 conversas por mês" / "Mentor AI — up to 20 conversations per month"
- "Notas e registros ilimitados" / "Unlimited notes and records"

> Decisão: **remover a lista `pulseLocked`** (cadeados). Já não combina com a estratégia "começar sem risco" e adiciona ruído visual. O contraste com Pro é feito pela copy ("até 2" vs "ilimitados").

**Pro — foco em "ciclo completo de performance"** (substituir `proFeatures`):
- "Liderados ilimitados"
- "Diário de bordo + resumo mensal automático" *(NOVO)*
- "Acompanhamento trimestral guiado por IA" *(NOVO)*
- "Avaliações formais ilimitadas com evidências citadas"
- "Transcrição automática de reuniões — 30h/mês"
- "Pre-meeting briefs com contexto histórico"
- "Detecção de viés em tempo real"
- "Mentor AI ilimitado"
- "Time acessa feedbacks e metas em tempo real"
- "Analytics completo · Times ilimitados"

Para suportar o badge "Novo" inline, mudar `proFeatures` de `string[]` para `Array<{ label: string; isNew?: boolean }>`. Os dois itens marcados como NOVO recebem `isNew: true`. Versão EN espelhada.

**Enterprise — foco em "visibilidade e governança para o RH"** (substituir `enterpriseFeatures`):
- "Tudo do Pro, para toda a organização"
- "HR Dashboard com radar de risco e heatmap"
- "Calibração entre gestores automatizada"
- "Dossiê de blindagem jurídica (trilha de auditoria)"
- "Integração com sistemas de RH (HRIS)"
- "SSO (Single Sign-On)"
- "Gerente de sucesso dedicado e SLA garantido"

### 2. Strings novas de hierarquia

Adicionar em `pt` e `en`:
- `pricingAnchor`: "Comece grátis. Escale quando fizer sentido." / "Start free. Scale when it makes sense."
- `pricingTrustLine`: "Sem cartão de crédito para começar · Cancele quando quiser · Preço de lançamento garantido enquanto sua assinatura estiver ativa" / equivalente EN
- `proSocialProof`: "Usado por líderes de times de tecnologia, saúde e serviços no Brasil" / "Used by leaders in tech, healthcare, and services teams in Brazil"
- `enterpriseFloor`: "A partir de 50 colaboradores · mínimo R$ 750/mês" / "Starting at 50 employees · minimum R$ 750/month"
- `newBadge`: "Novo" / "New"

### 3. Markup (linhas ~590-748 em `Landing.tsx`)

**Header da seção (após linha 603, antes do tooltip):**
Adicionar subtítulo âncora `pricingAnchor` em `font-serif text-xl text-foreground/80` para criar hierarquia entre o título e a descrição existente.

**Trust line (após o cycle selector, ~linha 640):**
Adicionar `<p className="text-center text-xs text-muted-foreground mb-10 max-w-2xl mx-auto">{t.pricingTrustLine}</p>`. Remover o `mb-12` do bloco do selector e usar `mb-6` para abrir espaço.

**Card Pulse:**
- Remover renderização de `pulseLocked` (linhas 665-670) e o import `Lock` se não for usado em outro lugar (verificar antes de remover import).
- Lista passa a ter só os 5 itens de `pulseFeatures`.

**Card Pro:**
- Iterar sobre objetos `{ label, isNew }`. Quando `isNew`, renderizar badge inline ao lado do texto:
  ```
  <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-primary/15 text-primary uppercase tracking-wide">
    {t.newBadge}
  </span>
  ```
- Abaixo do botão `proCTA` (após linha 702), adicionar:
  ```
  <p className="text-xs text-muted-foreground text-center -mt-4 mb-6">{t.proSocialProof}</p>
  ```
  (ajustar margens para não duplicar o `mb-6` atual)

**Card Enterprise:**
- Adicionar a linha `enterpriseFloor` logo abaixo do `enterpriseNote` (linha 731), em `text-xs text-foreground/70 font-medium mt-1`.

**Disclaimer final (linha 747):**
Manter o `launchDisclaimer` como está — ele é redundante com a trust line, mas serve como reforço no fim. Decisão: **remover o disclaimer final** já que a trust line acima dos cards cobre a mesma mensagem com mais força.

### 4. Tipos

Atualizar a tipagem inline de `proFeatures` (atualmente `string[]`) para `Array<string | { label: string; isNew?: boolean }>` e ajustar o `.map` para tratar ambos os formatos (compatível com EN se mantiver string simples, mas vou converter EN também para o mesmo formato para consistência).

## Não muda

- Preços, valores em `pricing.total` / `pricing.perMonth`, ciclo de billing, Stripe IDs, navegação dos CTAs, lógica de `useNavigate`.
- Tooltip "Por que sem plano mensal?", selector de ciclo (Quarterly/Semiannual/Annual), badge "Mais popular".
- Rotas: Pulse → `/auth?mode=signup`, Pro → `/auth?mode=signup&plan=pro&cycle=...`, Enterprise → `/enterprise`.
- Outras seções da landing.

## Critério de aceite

- Em PT e EN, a seção `#pricing` mostra:
  - Subtítulo âncora "Comece grátis. Escale quando fizer sentido." abaixo do título.
  - Trust line com "Sem cartão · Cancele quando quiser · Preço de lançamento garantido" abaixo do toggle de período.
  - Pulse: lista limpa começando por "Até 2 liderados diretos", sem cadeados.
  - Pro: 10 itens benefit-first, com badge "Novo" inline em "Resumo mensal automático" e "Acompanhamento trimestral guiado por IA"; linha de social proof abaixo do CTA.
  - Enterprise: lista reescrita + linha "A partir de 50 colaboradores · mínimo R$ 750/mês" abaixo do `enterpriseNote`.
- Nenhuma menção visível a "Recall.ai", "upload manual", "portal do liderado" ou parênteses técnicos.
- Ciclo de billing, valores em R$ e fluxo de checkout permanecem idênticos.
- Sem regressão em outras seções da landing.

