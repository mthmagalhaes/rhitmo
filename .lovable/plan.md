

## Adicionar STRIPE_WEBHOOK_SECRET

Usar a ferramenta `add_secret` para solicitar ao usuário o valor do `STRIPE_WEBHOOK_SECRET` (o `whsec_...` copiado do Stripe Dashboard). Essa é a única etapa pendente para completar a integração de billing.

### Implementação
1. Chamar `add_secret` com nome `STRIPE_WEBHOOK_SECRET` para o usuário colar o valor
2. Nenhuma alteração de código necessária — as Edge Functions já referenciam `Deno.env.get("STRIPE_WEBHOOK_SECRET")`

