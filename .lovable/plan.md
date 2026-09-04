# Rhitmo 2.0 — o "Windmill brasileiro", a partir de onde estamos

Li as nove páginas da Windmill (home, science, pricing, customers, integrations, agents e os três posts). Abaixo: o que dá para copiar da tese deles, o que já temos, e a ordem de execução.

## 1. Projeto novo? Não

A resposta continua a mesma, e agora com mais força: o ativo da Rhitmo é exatamente o que a Windmill chama de **graph** — pessoas, evidências, padrões e percepções acumuladas. Isso vive no banco atual (evidências citáveis, transcrições, avaliações, embeddings, Slack, calendário, Stripe, crons). Projeto novo significa banco novo: você jogaria fora o único ativo que não se recompra.

O que dá vontade de "começar do zero" é a interface, e isso já está resolvido pelas rotas `/v2/*` com o shell próprio (`V2Layout`) atrás da flag `ui_version`.

## 2. O que a Windmill ensina (leitura das páginas)

**A tese central:** "AI já é inteligente o bastante para decisões de gente. O que falta é contexto." Eles vendem uma **camada de contexto em quatro andares**:

1. **Pessoas** — quem trabalha aqui e quem trabalha com quem (org chart + rede real)
2. **Evidências** — o que de fato aconteceu, puxado das ferramentas de trabalho
3. **Padrões** — o que é "bom" naquele papel (rubrica, metas, valores)
4. **Percepções** — o que humanos informados acham (1:1s, notas, feedback)

Sem os quatro, o retrato é incompleto. **Rhitmo hoje tem 2 e 4 fortes, 3 parcial (competências) e 1 fraco (rede quase inexistente).**

**Preço:** 10 primeiros usuários grátis para sempre, depois US$ 10/usuário/mês, tudo incluído. Nosso R$ 10/assento é equivalente relativo, mas o gancho deles é melhor: grátis de verdade até 10 pessoas, sem pedir cartão.

**Produto:** cinco superfícies — Avaliações, 1:1s, Feedback Contínuo, Calibrações, Pulse. Nós temos as três primeiras; Calibrações e Pulse estão gated no nosso roadmap.

**Distribuição:** o agente ("Windy") mora no Slack e puxa feedback sozinho; e servidor MCP para funcionar dentro de Claude/Cursor/ChatGPT. Nós temos o Slack; MCP não temos.

**Prova:** números de caso concretos (83% menos horas, 93% de satisfação, 8 dias de ciclo, check-in de <4 min) e depoimentos curtos em mural. Nossa landing não tem nenhum número real de cliente.

**Post "Calibrations"**: o valor não é a reunião, é o **pré-read** que a IA gera 48h antes — notas que não batem com o texto, gestor que deu 4 para todo mundo, avaliação com evidência fina, score de acionabilidade de 1 a 5. Depois, sandbox com 9-box, tabela e distribuição.

**Post "Org chart is a lie"**: ONA passivo — hubs, brokers, periféricos; detectar quem está saindo da rede antes de pedir demissão. Confirma nossa decisão de ONA por observação, sem formulário.

**Post do seed**: US$ 12M, posicionamento "apostar em pessoas", clientes AI-forward.

## 3. A leitura honesta: onde a Rhitmo se diferencia

Copiar a Windmill inteira é perder — eles são tech-first, integram GitHub/Linear/Cursor, e nosso ICP é genérico e brasileiro. Os três eixos onde ganhamos:

- **Português e realidade brasileira** (tom, LGPD, ciclo de avaliação, PDI, ferramenta de RH local).
- **A conversa é o dado principal**, não o commit. Aqui o trabalho aparece em reunião, não em ticket. Nosso investimento em transcrição/note taker é o equivalente certo do "GitHub" deles.
- **Espelho para o líder**, não painel para o RH. A Windmill vende para o RH rodar ciclo; a Rhitmo treina o líder no dia a dia.

## 4. Ordem de execução proposta

**Bloco A — Fechar o que está pela metade (semana 1-2)**
- Conector Otter (único gap declarado da Fase 1).
- Grátis de verdade: alinhar o plano gratuito ao gancho da Windmill (primeiros N assentos sem cartão) e refletir na landing.
- Landing com números reais assim que houver dois depoimentos da Faster.

**Bloco B — Camada 1 do graph: a rede (semana 3-5)**
Hoje é o andar mais fraco e é o que destrava Calibrações, ONA e sugestão de pares. Reaproveita `team_network_edges` / `network_signals`, alimentado por Slack Ambient + notas dos conectores + calendário. Entrega visível: página `/v2/rede` com hubs, pontes e quem está se isolando.

**Bloco C — Pré-read de calibração (semana 6-8)**
O maior valor por esforço de todo o roadmap, porque reusa `performance_reviews`, `ctx_evidence` e o motor de viés que já existem. Entrega: relatório gerado antes do comitê com nota que não bate com o texto, gestor fora da curva, evidência fina e score de acionabilidade. Sem sandbox colaborativo, sem 9-box em tempo real — isso fica para depois de validado.

**Bloco D — Auto Draft em todos os tipos de avaliação**
Já parcialmente pronto via `generate-formal-review`; falta parametrizar por tipo e expor o botão.

**Bloco E — MCP e agente**
Só depois de B e C, e só se houver pedido real.

Pulse continua atrás dos dois critérios. Nada do bloco B/C entra antes do bloco A fechado.

## 5. Detalhes técnicos

- Nada disso exige tabela nova além de definição de calibração (sessão, participantes, itens do pré-read) quando o bloco C começar; rede e avaliações já têm schema.
- Toda tabela nova sai com `GRANT` + RLS por `leader_user_id`/workspace, e funções em `plpgsql` `SECURITY DEFINER`, conforme o padrão do projeto.
- Edge functions previstas: nova `notetakers/otter.ts` (bloco A), nova `compute-network-graph` ou extensão de `compute-meeting-signals` (bloco B), nova `generate-calibration-preread` reusando o motor de viés (bloco C).
- Frontend: tudo dentro de `src/pages/v2/*` no shell existente, com `max-w-5xl`, Lora/Inter e cantos `rounded-2xl`/`3xl`.
- Prompts sempre em `supabase/functions/_shared/soul/*.md`, nunca inline.

## 6. Decisões que preciso de você

1. Confirmar o gancho de preço: mantemos R$ 10/assento desde o primeiro, ou copiamos "primeiros 10 grátis para sempre"?
2. Bloco B (rede) antes do bloco C (calibração), ou o contrário? Minha recomendação é rede primeiro, porque calibração fica mais forte com ela.
3. O bloco A deve incluir a reescrita de posicionamento da landing na linha da "camada de contexto em quatro andares", ou fica para depois?
