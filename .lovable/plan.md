## Diagnóstico — UX + Pricing

Atuei nas duas frentes e olhei o bloco no contexto da seção `/pricing` (Landing, linhas 731–752).

### O que está ruim hoje

```
┌──────────────────────────────────────────────┐
│ ENTERPRISE                                    │
│ Para times +50 ou requisitos de compliance.   │
│  • SSO (SAML, Google Workspace)               │
│  • DPA + processamento na UE/Brasil           │
│  • Admin dashboard com auditoria              │
│  • Onboarding assistido                       │
│ Falar com vendas →                            │  ← link sublinhado
└──────────────────────────────────────────────┘
```

**UX:**

- O CTA é um **link de texto pequeno** ("Falar com vendas →"), com peso visual menor que qualquer linha de feature do card principal. Conversão B2B exige um botão real.
- Container `bg-muted/30` cinza neutro — desaparece visualmente. O olho do leitor termina no botão "Começar grátis" do card principal e nunca chega aqui.
- Sem hierarquia: o título "ENTERPRISE" é caps minúsculo, sem ícone, sem cor de marca. Lê-se como uma seção legal/footer.
- Sem âncora de valor (outcome). Hoje só lista tech specs (SSO, DPA, audit). Não responde "por que vale a conversa?".
- Sem prova social / sinal de confiança (logos, "usado por X organizações", "resposta em 24h").
- Sem segunda via de contato (email direto / agendar call) — uma única ação obriga deep-link para `/enterprise`.

**Pricing strategist:**

- Self-serve termina em "+R$X por usuário". Enterprise não comunica o **salto de modelo** (anual, sob consulta, com SLA). Quem tem 80 pessoas não sabe se cabe no preço de lista ou se precisa falar.
- Falta **gatilho de qualificação** ("times de 50+", "requisitos de SOC2/LGPD", "RH centralizado"). Hoje só diz "+50 ou compliance" — ambíguo.
- Falta sinal de **preço de partida** ("a partir de R$ 750/mês" já existe nas strings `enterpriseFloor` mas não é mostrado aqui). Esconder âncora de preço aumenta abandono em B2B mid-market.
- Sem "social proof of complexity" — Enterprise vende segurança/processo, precisa parecer sério. Hoje parece um afterthought.

---

## Plano de redesign — Enterprise CTA

Refazer o bloco como uma **rail horizontal de destaque** abaixo do card principal, com peso visual real, botão sólido e dois caminhos de contato.

### Novo layout (desktop)

```
┌──────────────────────────────────────────────────────────────────────┐
│ ◐  PARA ORGANIZAÇÕES  ·  +50 pessoas                                 │
│                                                                       │
│ Rhitmo Enterprise                              ┌────────────────────┐│
│ Ciclo completo de performance,                 │  Falar com Vendas →││
│ blindagem jurídica e visibilidade do RH.       └────────────────────┘│
│                                                   │
│                                                                       │
│ ✓ SSO (SAML, Google)   ✓ DPA + dados na UE/BR                        │
│ ✓ HR Dashboard         ✓ Onboarding assistido                        │
│                                                                       │
│ A partir de R$ 750/mês · faturamento anual · resposta em até 24h     │
└──────────────────────────────────────────────────────────────────────┘
```

### Mudanças concretas

1. **Container com presença:** trocar `bg-muted/30` por `bg-foreground` (preto/ink) com texto claro — cria sandwich visual com o card branco acima. Border `rounded-[32px]`, sombra suave. Em dark mode, inverter para creme escuro.
2. **Header em duas camadas:**
  - Eyebrow chip: ícone `Building2` + "PARA ORGANIZAÇÕES · +50 PESSOAS" (caps, tracking-widest).
  - Título Lora 32–40pt: "Rhitmo Enterprise".
  - Subtítulo (1 linha): outcome real, não tech spec — usar o `enterpriseImpact` que já existe nas strings ("Ciclo completo de performance, blindagem jurídica e visibilidade do RH em tempo real.").
3. **CTA primário forte:** botão sólido `min-h-[52px] rounded-full` em accent (creme sobre ink, ou primary), com texto "Falar com Vendas" + ícone `ArrowRight`. Mesmo peso visual do "Começar grátis" do card principal — paridade de hierarquia entre os dois caminhos.
4. **CTA secundário / fallback:** abaixo do botão, link discreto "ou escreva para [my@rhitmo.co](mailto:matheus@rhitmo.co)" (mailto). Reduz fricção pra quem não quer formulário.
5. **Bullets em grid 2×2** (não lista vertical) — denso, varredura rápida, ícones `Check` em accent.
6. **Linha de confiança no rodapé** (texto pequeno, muted): "A partir de R$ 750/mês · faturamento anual · resposta em até 24h".
  - Mostrar âncora de preço resolve o "será que cabe?" e qualifica leads.
  - "Resposta em 24h" é uma micro-promessa de SLA que reduz hesitação.
7. **Mobile:** stack vertical, CTA full-width, bullets viram lista de 1 coluna. Mantém preto/ink para destaque.

### O que não mudar

- Manter o link `/enterprise` como destino (página dedicada já existe).
- Manter strings que já estão em PT/EN no objeto `t` (`enterpriseImpact`, `enterpriseFloor`, `enterpriseCTA`) — só passar a usá-las aqui.
- Não mexer no card principal de pricing.

### Arquivos a tocar

- `src/pages/Landing.tsx` — somente o bloco "Enterprise rail" (linhas 731–752).
- Reutilizar `Button`, ícones do `lucide-react`, tokens de design já existentes (`bg-foreground`, `text-background`, `border-border`).

### Como medir depois

- Comparar clicks em "Falar com Vendas" / mailto antes vs depois (event tracking simples via `analytics.track('enterprise_cta_click', { source })`).

Implementação é frontend puro, ~30 linhas de JSX trocadas. Sem backend.