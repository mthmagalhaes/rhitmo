

## Plano: Remover todos os travessões (—) do copy da Landing Page

Substituir cada ocorrência de " — " por alternativas naturais (pontos, vírgulas, ou reestruturação da frase) em ambos os idiomas (PT e EN).

### Mudanças no arquivo `src/pages/Landing.tsx`

**PT (linhas 49-240):**

| Linha | De | Para |
|---|---|---|
| 56 | `4h por review — reescrevendo do zero toda vez` | `4h por review, reescrevendo do zero toda vez` |
| 63 | `Draft completo em 30 segundos — você só revisa` | `Draft completo em 30 segundos. Você só revisa.` |
| 85 | `Funciona em 5 min — sem demo call, sem implantação` | `Funciona em 5 min, sem demo call, sem implantação` |
| 86 | `Plano gratuito real — não trial de 14 dias` | `Plano gratuito real, não trial de 14 dias` |
| 115 | `...sejam lembradas — baseado em fatos...` | `...sejam lembradas. Baseado em fatos, não na memória recente do gestor.` |
| 120 | `...devolvidas por ciclo de avaliação — sem perder qualidade.` | `...devolvidas por ciclo de avaliação, sem perder qualidade.` |
| 218 | `...IA nativa de verdade — não um checkbox de marketing.` | `...IA nativa de verdade, não um checkbox de marketing.` |

**EN (linhas 257-443):**

| Linha | De | Para |
|---|---|---|
| 257 | `AI-Native since day 1 — Not an add-on` | `AI-Native since day 1. Not an add-on.` |
| 264 | `4 hours per review — rewriting from scratch every time` | `4 hours per review, rewriting from scratch every time` |
| 271 | `Full draft in 30 seconds — you just review` | `Full draft in 30 seconds. You just review.` |
| 292 | `Works in 5 min — no demo call, no deployment` | `Works in 5 min, no demo call, no deployment` |
| 293 | `Real free plan — not a 14-day trial` | `Real free plan, not a 14-day trial` |
| 310 | `...It's not post-review analysis — it's prevention.` | `...It's not post-review analysis. It's prevention.` |
| 320 | `...remembered — based on facts...` | `...remembered. Based on facts, not your manager's recent memory.` |
| 324 | `...returned per review cycle — without losing quality.` | `...returned per review cycle, without losing quality.` |
| 405 | `Who uses Rhitmo — and why.` | `Who uses Rhitmo and why.` |
| 413 | `...truly native AI — not a marketing checkbox.` | `...truly native AI, not a marketing checkbox.` |

### Critério de substituição
- Separação de duas frases independentes → ponto final
- Complemento explicativo → vírgula
- Nenhum travessão residual no arquivo

