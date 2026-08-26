# Rhitmo sem bot no plano base: estudo de posicionamento e preço

Estudo estratégico, sem mudança de código. Decisões já travadas: bot vira add-on pago, plano base mira R$ 29,90/assento/mês, e a prioridade de conectores inclui note takers, Slack e gravação nativa de Meet/Zoom.

## A tese

Hoje a Rhitmo compra minuto de máquina (Recall, US$ 0,72/hora efetivo) para produzir a matéria-prima que o cliente, na maioria dos casos, já produz sozinho. Isso trava o preço em cima e a margem embaixo ao mesmo tempo.

A virada: a Rhitmo para de ser "mais um bot na sala" e passa a ser a **camada de inteligência de liderança sobre o que a empresa já captura**. O bot continua existindo, mas como conveniência paga para quem não tem note taker, não como o motor do produto.

Frase de posicionamento: *conecte o que você já usa e transforme conversa em avaliação de desempenho justa.*

## Por que isso é mais forte que baixar preço com bot

| | Rhitmo com bot no plano | Rhitmo conector-first |
|---|---|---|
| Custo variável/assento | R$ 16–22 (4h de bot) | R$ 1–3 (só IA) |
| Preço sustentável | R$ 49,90 | R$ 29,90 com margem maior |
| Objeção do comprador | "já pago Granola, por que outro bot?" | "meu Granola agora vira review" |
| Bots duplicados na sala | problema recorrente | deixa de existir |
| Teto de escala | limitado pelo custo de captura | limitado só por venda |

O ganho não é desconto. É trocar um custo que cresce com o uso por um custo que praticamente não cresce.

## Unit economics do plano base (R$ 29,90/assento/mês)

- IA (resumo estruturado, lente pessoal, brief, review): R$ 1–3/assento/mês com Gemini Flash
- Cloud (banco, polling de conectores, storage de texto): centavos
- **Margem bruta: ~90%**, contra ~55–65% no modelo atual com 4h de bot embutidas

Add-on de bot sugerido: **R$ 39/mês por 5 horas**, ativável por assento. Custo ~R$ 20, margem ~50%. Quem não ativa, não paga e não custa.

Cenário de 100 assentos: R$ 2.990 de receita recorrente com ~R$ 300 de custo, mais o que vier de add-on. No modelo atual, os mesmos 100 assentos custariam ~R$ 1.800 só de captura.

## A arquitetura de receita em três camadas

1. **Base (R$ 29,90/assento)** — conectores, Anotações & Evidências, briefs de 1:1, avaliação formal, Mentor. Líder + 3 liderados grátis continua como porta de entrada.
2. **Captura (add-on R$ 39/5h)** — bot da Rhitmo para quem não tem note taker ou para reuniões específicas. Vendido como conveniência, não como diferencial.
3. **Empresa (a definir)** — visão BP/RH, analytics de saúde de time, governança, SSO. É aqui que o ticket sobe sem depender de custo variável.

## Os conectores como produto

Ordem recomendada, por esforço versus cobertura:

**Onda 1 — note takers de chave pessoal.** Fireflies e Otter usam o mesmo contrato BYOK que o Granola já usa hoje. Custo marginal baixo: extrair a interface de provedor e escrever um arquivo por serviço. Cobre a maior parte dos líderes que já pagam note taker.

**Onda 2 — Slack como fonte de evidência.** Diferente dos outros: não é transcrição, é sinal contínuo. Canais autorizados e resumo de atividade alimentam brief e avaliação com o que aconteceu entre as 1:1s. É o conector mais defensável, porque ninguém mais cruza conversa de reunião com sinal de rede.

**Onda 3 — Meet e Zoom nativos.** Puxar a transcrição que a própria plataforma já gera, sem bot na sala. Tecnicamente o mais trabalhoso (OAuth por usuário, permissões de gravação, disponibilidade só em planos pagos do Google/Zoom), mas é o que zera de vez a necessidade do bot para a maioria das empresas médias.

**Onda 4 — Fathom e Read.ai.** Fortes em vendas e CS. Entram quando houver demanda nomeada por cliente, não antes.

Regra de produto para todas as ondas: o conector não é uma linha de configuração, é uma promessa. Cada um precisa de estado visível (conectado, última sincronização, erro acionável), fila de notas sem liderado atribuído e chip de origem no Anotações & Evidências.

## Riscos a nomear

**Dependência de API de terceiro.** APIs de note taker são jovens e mudam. Mitigação: Magic Paste continua como plano B universal e o add-on de bot continua como rede de segurança.

**Qualidade desigual de entrada.** Um resumo do Granola não é uma transcrição literal. A avaliação formal precisa saber a diferença e citar a fonte com data, senão a evidência perde força. Mitigação: marcar nível de fidelidade por origem e deixar isso explícito na citação.

**Percepção de downgrade na base atual.** Quem paga R$ 49,90 hoje com 4h incluídas vai ver "R$ 29,90 sem bot" e sentir perda. Mitigação: grandfathering explícito por 12 meses e comunicação de que o preço caiu, não o produto.

**Canibalização do add-on.** Se o conector funcionar bem, a receita de bot cai. Isso é sucesso, não problema — a margem sobe no mesmo movimento.

## Recomendação

Avançar com a virada em três passos, sem big bang:

1. Publicar o plano de R$ 29,90 sem bot ao lado do atual, com o bot como add-on. Medir quantos novos escolhem cada um.
2. Entregar Fireflies e Otter (Onda 1) e observar taxa de conexão. Se mais de 40% dos novos líderes conectam um note taker próprio, a tese está confirmada.
3. Só então investir em Slack como evidência e Meet/Zoom nativos, que são o fosso de longo prazo.

A pergunta que decide tudo no passo 2 não é "quanto cobrar", é **quantos líderes já têm um note taker que a Rhitmo consegue ler**. É isso que precisa ser medido antes de qualquer outra decisão de preço.

## Nota de escopo

Este documento é estudo estratégico. Nenhuma alteração de código, preço em produção, plano do Stripe ou texto de landing está incluída aqui. A execução entra em um plano separado quando você decidir.
