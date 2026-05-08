markdown ## Pricing Section Redesign — Windmill-inspired  ### Contexto  Alterar apenas a seção `#pricing` em `src/pages/Landing.tsx`, dentro do `PricingSection`, e os textos relacionados no dicionário `translations` em PT e EN.  Não alterar backend, Stripe, RLS, lógica de cobrança, `paid_seats` ou `update-subscription`.  O objetivo é redesenhar visualmente o pricing da Rhitmo para ficar mais próximo da página da Windmill: simples, centralizado, premium, calmo e fácil de entender.  ---  ## Mudanças  ### 1. Visualmente: seguir a Windmill de forma mais fiel  A seção deve parecer:  - simples - calma - premium - acolhedora - muito clara - com bastante espaço em branco  Evitar:  - pricing grid complexo - dois cards lado a lado - visual enterprise agressivo - glassmorphism - gradientes fortes - excesso de elementos  A referência é um card único, centralizado, com aparência suave e amigável.  ---  ### 2. Estrutura da seção  Usar esta ordem:  1. Eyebrow pequeno 2. Headline centralizada 3. Subheadline curta 4. Toggle mensal/anual 5. Um único card principal centralizado 6. Enterprise rail secundário abaixo  O pricing deve parecer “um produto simples de comprar”, não uma tabela comparativa de planos.  ---  ### 3. Header da seção  Manter o eyebrow `PLANO`, mas deixar a seção mais escaneável.  Headline:  text

Comece grátis. Pague só pelo time que cresce.

 Subheadline:  ### PT text

Um plano só. Líder + 3 liderados grátis para sempre. A partir do 4º liderado, R$ 49,90/mês cada.

 ### EN text

One plan only. Leader + 3 direct reports free forever. Starting from the 4th report, R$49.90/month each.

 ---  ### 4. Toggle mensal/anual  Manter o toggle existente, mas deixá-lo visualmente mais próximo da Windmill:  - menor destaque visual - mais clean - spacing mais confortável - container suave/off-white - pill selection elegante  Manter badge: text

-16%

 Estados:  ### Mensal text

Mensal

 ### Anual text

Anual

-16%

 ---  ### 5. Card principal único  Não usar dois cards lado a lado.  Usar um único card centralizado, com:  - `max-w-5xl` - `rounded-[40px]` - `border border-border/40` - `shadow-sm` - fundo branco/off-white - padding generoso - muito espaço vertical  Estrutura visual inspirada diretamente na Windmill.  Exemplo de direção: tsx

bg-white

border border-border/40

shadow-sm

rounded-[40px]

 ---  ### 6. Preço com hierarquia forte  O preço deve ser o elemento dominante do card, igual ao estilo Windmill.  ---  ## Estado mensal  Preço: text

R$ 49,90

/liderado / mês

 Subtexto: text

Cobrado mensalmente. Cancele quando quiser. A partir do 4º liderado.

 ---  ## Estado anual  Preço: text

R$ 39,90

/liderado / mês

 Subtexto: text

Cobrado anualmente (R$ 478,80/liderado/ano). 16% off. A partir do 4º liderado.

 ---  ## Regras visuais  - número muito grande `text-6xl` ou maior) - peso forte - line-height apertado - label `/liderado / mês` menor - label em `text-muted-foreground` - muito contraste no valor principal  A estética precisa ficar muito próxima da Windmill.  ---  ### 7. CTA e trust line  CTA:  - full-width - preto ou foreground forte - texto branco - `rounded-full` - simples e sólido - sem efeitos exagerados  Exemplo: tsx

rounded-full

bg-black

text-white

 CTA sugerido: text

Começar grátis

 ---  ### Trust line  A frase abaixo do botão deve ficar imediatamente abaixo do CTA:  ### PT text

Sem cartão. Sem demo call. 5 min para o primeiro insight.

 ### EN text

No credit card. No demo call. First insight in 5 minutes.

 Usar: tsx

text-sm

font-medium

text-foreground

 Remover repetição dessa frase em `pricingTrustLine`, se existir.  ---  ### 8. Features em lista vertical  Não usar grid 2 colunas.  Usar lista vertical como na Windmill:  - check pequeno verde - título em `font-medium` - descrição curta abaixo - spacing confortável - uma coluna no desktop e no mobile  Estrutura: tsx

<dl className="space-y-5">

  <div className="flex gap-3">

    <Check className="mt-1 h-4 w-4 text-green-600" />

    

    <div>

      <dt className="font-medium text-foreground">

        Mentor AI ilimitado

      </dt>

      <dd className="mt-1 text-sm text-muted-foreground">

        Seu Chief of Staff conversacional, 24/7, com memória do time.

      </dd>

    </div>

  </div>

</dl>

 ---  ## Features finais  1. **Mentor AI ilimitado**   Seu Chief of Staff conversacional, 24/7, com memória do time.  2. **1:1s, Pulse, PDI e 360°**   O ciclo completo de gestão de pessoas em um lugar.  3. **Transcrição de reunião ilimitada**   Bot entra nas reuniões, transcreve e vira evidência automaticamente.  4. **Slack bidirecional**   Rhitmo puxa contexto e devolve briefs por DM, sem trocar de aba.  5. **Detecção de viés em tempo real**   Avaliações 38× menos enviesadas, direto no editor.  6. **Network signals**   Leitura da rede do time para detectar risco antes da saída.  ---  ### 9. Enterprise rail  Trocar o link solitário “Falar com vendas” por um mini-card secundário abaixo do card principal.  Visual:  - mesmo radius do card principal - `bg-muted/30` - borda sutil - sombra mínima ou nenhuma - largura alinhada ao card principal - hierarquia claramente secundária  Copy PT: text

ENTERPRISE

Para times +50 ou requisitos de compliance.

• SSO (SAML, Google Workspace)

• DPA + processamento na UE/Brasil

• Admin dashboard com auditoria

• Onboarding assistido

Falar com vendas →

 Copy EN: text

ENTERPRISE

For teams of 50+ or advanced compliance needs.

• SSO (SAML, Google Workspace)

• DPA + EU/Brazil data processing

• Admin dashboard with audit logs

• Assisted onboarding

Talk to sales →

 O link continua apontando para: text

/enterprise

 ---  ## Fora do escopo  Não alterar:  - Tabela comparativa vs concorrentes - Seção de métricas antes do pricing - Lógica de billing - Stripe - `paid_seats` - `update-subscription` - Backend - RLS - Página `/enterprise` - Qualquer lógica de cobrança ou permissões  ---  ## Arquivos afetados  - `src/pages/Landing.tsx`  Alterações esperadas:  - Reescrita visual do `PricingSection` - Ajuste de `translations.pt` - Ajuste de `translations.en` - Ajuste/remover uso de `pricingTrustLine`, se estiver repetindo a trust line  Sem novos arquivos.  Sem novos imports, salvo se já houver ícone/check disponível no projeto.  ---  ## Perguntas rápidas  1. Confirmar CTA principal:    - `Começar grátis`    - ou `Criar workspace`  2. Confirmar se o botão deve continuar apontando para o fluxo atual de signup.  3. Confirmar se o badge `-16%` permanece exatamente como está hoje.  4. Confirmar se devemos manter a frase:   text

   Cancele quando quiser.

      no plano mensal.

:::