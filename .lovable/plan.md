# Calculadora evoluída + destaque na landing e no blog

## O que muda para o visitante
1. **Calculadora com duas visões** (botão "Minha equipe" / "Empresa inteira")
   - Minha equipe: liderados, salário do líder, ciclos por ano (como hoje).
   - Empresa inteira: total de pessoas, número de líderes, salário médio, ciclos por ano.
2. **Tempo quebrado em etapas, todas editáveis** (valores iniciais são suposições declaradas, não estatísticas):
   - Reconstruir o que aconteceu no período (padrão 45 min por pessoa avaliada) — a dor que a Rhitmo resolve.
   - Escrever a avaliação do líder (padrão 90 min por pessoa).
   - Conversa de devolutiva (padrão 45 min).
   - Opcional na visão empresa: autoavaliação (padrão 30 min por pessoa).
3. **Comparativo "Hoje" vs "Com rascunho pronto"**: só a etapa de reconstrução e escrita cai para um tempo de revisão que o próprio visitante ajusta (padrão 30 min). Sem percentual mágico; a diferença aparece em horas e reais com a conta à vista.
4. **Tabela "De onde vem cada número"** abaixo da calculadora, explicando cada etapa e deixando claro que são valores de referência editáveis.
5. Resumo copiável atualizado com as duas colunas; evento `cost_calculator_copied` passa a levar a visão escolhida (só números/visão, nada de texto).

## Destaque
- **Menu superior da landing** (computador e celular): item "Calculadora" entre Blog e Preços.
- **Landing**: card logo após a seção de números ("Quanto custa o ciclo de avaliação do seu time? Simule em 1 minuto"), evento `landing_calculator_cta_clicked`.
- **Blog (/blog)**: card fixo no topo da listagem, evento `blog_list_calculator_cta_clicked`. Card no fim dos artigos continua.

## Detalhes técnicos
- `src/pages/content/CalculadoraCusto.tsx`: nova função pura `estimateCycle({ mode, people, leaders, salary, cycles, steps, reviewMinutes })` retornando horas/custo hoje, com Rhitmo e diferença; mantém `HOURS_PER_MONTH=220` e exporta a antiga `estimateCycleCost` para não quebrar o teste existente.
- Testes `bun:test` novos: 8 pessoas × (45+90+45 min) × 2 ciclos = 48h; com revisão de 30 min substituindo reconstrução+escrita = 8×(30+45)×2 = 20h; custo com R$ 22.000 → R$ 4.800 hoje / R$ 2.000 com Rhitmo.
- `src/pages/Landing.tsx`: link no nav desktop (~l.1058) e Sheet mobile (~l.1111), card após `id="impacto"`.
- `src/pages/content/Blog.tsx`: card no topo.
- Eventos só via `src/lib/productAnalytics.ts`; tokens de design, `rounded-2xl`, português sem travessão.
- Validação com Playwright em 1280 e 492 (menu, cards, troca de visão, números).
