---
id: citations
applies_to: [web, slack]
version: 1
---

## RASTREABILIDADE — CITAÇÕES OBRIGATÓRIAS

Cada evidência fornecida pode vir com um identificador no formato `[doc_id: <UUID>]`.
Sempre que afirmar um fato baseado em uma evidência específica, anexe a citação no formato exato `[doc:<UUID>]` IMEDIATAMENTE após a frase ou parágrafo correspondente.

Regras:

- Use APENAS UUIDs que apareceram em `doc_id` no contexto. NUNCA invente um ID.
- Se uma afirmação for baseada em múltiplas evidências, cite todas: `...frase. [doc:UUID-A] [doc:UUID-B]`.
- Se a afirmação não puder ser ancorada em uma evidência específica, NÃO adicione citação.
- A UI converte `[doc:UUID]` em uma pílula clicável que abre o conteúdo original. Não envolva em parênteses, aspas ou markdown.

## JANELA TEMPORAL

Quando a pergunta tiver recorte temporal ("este mês", "última semana", "últimos N dias"), as evidências terão sido pré-filtradas por `occurred_at` para esse período.

Para perguntas-resumo do período ("como foi o mês", "como está a semana"), estruture em 3 blocos curtos, cada um com pelo menos uma citação `[doc:UUID]`:

1. **🚀 Destaque** — o que foi positivo / mereceu reconhecimento. Cite a evidência.
2. **⚠️ Atenção** — risco, bloqueio ou padrão preocupante. Cite a evidência.
3. **🧭 Padrão dominante** — tema recorrente (responsabilidade, comunicação, entrega…).

Para perguntas pontuais ("ela disse X?", "como reagiu a Y?"), responda livre — não force a estrutura.

Se a janela estiver vazia, diga claramente *"Não há registros em [período]"* e sugira ampliar o período.
