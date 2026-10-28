# Rhitmo sem teste grátis: assinatura mensal ou anual, cancele quando quiser

## O que muda para o visitante
- Novo líder: cria a conta, escolhe **Mensal** (R$ 10/assento, líder R$ 29,90 com 6h de bot) ou **Anual** (R$ 96/assento, líder R$ 287,04), paga no Stripe e entra. Preços e add-ons de bot e horas extras ficam como estão.
- Todo botão "Começar teste grátis" passa a ser **"Assinar agora"** (secundário: "Ver planos"). Mensagem de confiança: "Cancele quando quiser · Sem fidelidade no mensal".
- Os materiais abertos (calculadora, gerador com IA, modelo e guias) continuam sem custo e sem cadastro. Eles atraem visitas e não geram custo de bot.

## O que não pode quebrar (proteção)
- Quem já está em teste segue até a data de fim. Nada muda para essas pessoas.
- Legados e condições especiais, como Faster até 31/12/2027, beta e unlocked, continuam como hoje.
- Assinantes ativos não são afetados.
- Liderados convidados não pagam e não passam pelo checkout.
- A regra de uso do bot continua só em `botEntitlement.ts`, já que contas novas não terão mais acesso por teste.

## Fase 1: Varredura de botões e menções a grátis (inventário completo)
Lugares onde aparece "grátis" ou teste, com a ação de cada um:

| Local | Texto atual | Ação |
|---|---|---|
| `Landing.tsx` (PT/EN/ES: getStarted, tabela comparativa, pricingSubtitle, pricingAnchor, pricingTrustLine, FAQ de transcrição, card de preços l.827-861, l.1157) | "Começar teste grátis", "14 dias sem cartão" | Trocar por assinatura. Na tabela comparativa, a linha de teste vira "Cancele quando quiser". |
| `Landing.tsx` l.755/763 (cards de transcrição) | "o teste de 14 dias" como forma de ter bot | Remover essa opção |
| `Landing.tsx` l.1436, l.1564 | "Calculadora grátis", "Recursos grátis" | Manter, porque é material aberto |
| `ContentLayout.tsx` (menu desktop/mobile, `TrialCta` "Testar 14 dias grátis, sem cartão", `TRIAL_URL`) | teste | Mudar para `SignupCta` / `SIGNUP_URL` e "Assinar agora". O nome antigo fica como alias para nada quebrar. |
| Usam `TrialCta`: Blog, BlogPost, Guia, Integracoes, Integracao, Recursos, ModeloAvaliacao, CalculadoraCusto, GeradorAvaliacao | herdam o texto | Revisar os títulos próprios de cada página |
| `PersonaSelector.tsx` (`/auth/start`, PT/EN/ES) | "14 dias grátis", "Sem cartão de crédito" | Novo selo "Mensal ou anual" e texto sobre assinatura |
| `src/content/blog.ts`, `integracoes.ts` | verificar CTAs no texto | Remover qualquer chamada para teste |
| `TermsOfService.tsx` l.52, l.88 | "Pulse (Gratuito)", "14 dias de teste" | Atualizar as cláusulas de plano, cancelamento e reembolso |
| `PrivacyPolicy.tsx` | verificar | Ajustar só se citar o teste |
| i18n `pt-BR/en/es.json` | chaves com trial/free | Revisar uma por uma |
| `index.html`, metatags, JSON-LD (Offer/price), `sitemap` | verificar "grátis" | Ajustar a oferta |
| App: `TrialBanner`, `v2/Billing.tsx`, `Billing.tsx`, `BotHoursCard`, `UpcomingMeetingsCard`, `v2/Conectores`, `Index.tsx` ("· Trial"), `usePlanLimits`, `useLeaderBotAddon` | textos de teste | Manter para quem já está em teste. Contas novas não veem. |
| Admin (`AdminWorkspaces`, `NewCompanyWizard`, `CompanyCard`, tabelas) | status de teste | Manter, e o admin continua podendo dar teste manualmente |
| E-mails (`trial-drip-cron`, templates) | marcos de teste | Só disparam para quem já está em teste |
| Deck/materiais comerciais fora do site | n/a | Listar para o Matheus atualizar |

Antes de terminar, uma busca automática por `grát|gratu|free|trial|sem cartão|14 dias` deve confirmar que sobrou só o que foi aprovado.

## Fase 2: Cadastro e pagamento
1. `/auth/start` → cadastro → criação do workspace → **tela "Escolha seu plano"** (mensal/anual, número de assentos, bot do líder opcional) → `create-checkout-session` (já existe) → Stripe → volta para `/lider/inicio`.
2. **Bloqueio de acesso:** um workspace v3 sem assinatura ativa, sem teste vigente e fora de legado ou condição especial é levado à tela de planos, usando o `useBillingGate` já existente. Configurações, Billing e sair continuam acessíveis.
3. Pagamento cancelado no Stripe: a pessoa volta para a tela de planos com aviso, sem ficar travada.
4. Cancelamento continua pelo Portal do Stripe, com acesso até o fim do período pago.

## Fase 3: Ajustes no sistema
- Migration: workspaces novos deixam de receber 14 dias de teste automaticamente (`trial_ends_at` sem padrão). Os registros já existentes não são alterados.
- `create-checkout-session`: confirmar que nenhum período de teste é enviado ao Stripe.
- `stripe-webhook`: assinatura ativa libera o acesso; tratar `past_due` e cancelamento.
- `stripeV2.ts`: atualizar o comentário do modelo.
- `trial-drip-cron`: continua igual, e só atinge quem já tem teste.
- PostHog: eventos `plan_selected`, `checkout_started`, `checkout_completed`, `checkout_canceled`, com o funil Visita → Assinar → Checkout → Pago. Só IDs e plano.

## Fase 4: Verificação
- Testes automáticos (`bun:test`): conta nova sem assinatura fica bloqueada; teste vigente, legado/condição especial e assinante entram; preço mensal e anual por assento e add-on batem com os valores atuais.
- Playwright, computador e celular (492px): landing, as 14 páginas públicas, `/auth/start`, cadastro, tela de planos e ida ao checkout de teste do Stripe. Logado como líder legado (Faster), confirmar que nada mudou.
- Rodar `/rhitmo-e2e-smoke` e a busca final por "grátis".

## Memória e regras do projeto
- Atualizar a memória de preços: entrada paga, sem teste; legado e teste vigente preservados.
- Em `AGENTS.md`: o acesso de workspaces v3 depende de assinatura ativa, verificada em um único lugar.

## Decisões em aberto (confirmar antes de executar)
1. Ferramentas abertas continuam com o selo "grátis"? Proposta: sim.
2. Na tela de planos, o anual vem selecionado por padrão? Proposta: sim, mostrando a economia.
3. Política de reembolso nos Termos, por exemplo 7 dias no primeiro pagamento? Precisa da sua definição, e não vou inventar.
