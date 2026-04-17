

# Auditoria de UX, Produto e Business Analyst — `/admin`

Análise das 5 abas a partir do código + screenshots. Vou focar em **achados** (não vou enumerar tudo que existe), separados por persona/lente, e ao final priorizar.

---

## Lente 1 — UX Designer

### Problemas estruturais de navegação

1. **5 abas com sobreposição funcional confusa**. "Command Center", "Usuários", "Estrutura", "Acessos & Export", "Inteligência" — mas:
   - HR Admin é gerenciado em **2 lugares** (Acessos & Export tem form de invite; Estrutura tem campo `hr_admin_id` no novo workspace).
   - Owner é editável em **2 lugares** (Estrutura via "Editar workspace"; Usuários via dialog de edit que muda `client_account`).
   - Convites em massa: aparecem em **Estrutura** ("Importar em Massa" + "Convites" por workspace) mas o status fica só no **Command Center** (Lista de Espera). Quem cadastra ≠ quem aprova.
   - Reset de senha existe em **3 lugares** distintos (Usuários, AdminSupport.tsx — não está no menu mas o código existe).
   - Export de dados duplicado: aba Acessos tem 5 botões; existe `AdminExport.tsx` órfão (não está no menu).

2. **"Command Center" não cumpre a promessa do nome**. O título sugere visão acionável de comando; na prática é uma lista mista de KPIs + Lista de Espera (que é operação de comercial, não de comando). A "Atividade Recente" mostra "Nenhuma atividade recente" mesmo havendo dados — provavelmente RLS ou query quebrada para super-admin.

3. **Hierarquia visual fraca nos KPIs**. 6 cards iguais lado a lado (Workspaces, Usuários Auth, Feedbacks, Reviews, Assinaturas, Leads) — sem peso relativo. Um super-admin precisa olhar primeiro: **Leads novos**, **workspaces em risco**, **MRR/assinaturas**. Hoje tudo tem o mesmo peso visual.

4. **Tabela de Usuários é cognitivamente densa** (sceenshot 2): badge de papel "Líder (1)", chip "Sem workspace" amarelo, chip "FAP / Trial" empilhado, ID truncado, 3 ícones de ação minúsculos. Sem **ações em lote** (suspender 5 trial users → 1 a 1).

5. **Estrutura é uma árvore plana sem busca**. Com 2 workspaces e 7 times já está pesado visualmente; com 50 workspaces vira inutilizável. Falta filtro/busca dentro da árvore + collapse "tudo".

6. **Inteligência é dashboard de leitura, não acionável**. Mostra "2 workspaces críticos" mas não tem CTA "Enviar nudge", "Agendar call de health-check", "Marcar como churn-risk". É dashboard, não Command Center.

7. **Sem indicador "você está visualizando como X" durante impersonate** quando o admin sai do `/admin` (já existe um banner — mas nas screenshots de admin não há contexto de quem está logado, só "M Trabalho" no Chrome).

8. **Empty states fracos**. "HR Admins Ativos" só mostra "FAP — mateus@fapeduca.com.br" sem indicar que são poucos. Sem CTAs do tipo "veja workspaces sem HR Admin".

### Problemas de microinteração / UI

- Cards do Command Center que são clicáveis (Usuários Auth) **não têm affordance** clara — mesmo hover é sutil. O texto "Gerenciar →" é a única dica.
- "Convites" no Estrutura abre dialog que faz `dispatch-bulk-invites` em modo `dry_run` — sem skeleton enquanto carrega. Loading state pobre.
- Filtros de Usuários (papéis, status, workspaces, segmentos) não mostram contagem do filtro aplicado nem botão "Limpar filtros".
- Cor do badge "Pago" (verde) no Inteligência conflita com badge "Crítico" (vermelho) sem peso suficiente para destacar prioridade.

---

## Lente 2 — Product Sr.

### Falhas de modelo mental

1. **Não existe conceito de "Cliente" (Account) como entidade**. O campo `client_account` é texto livre dentro de `workspaces`. Resultado: "FAP" e "Faster" são "clientes", mas para o sistema são strings em workspaces isolados. **Impacto B2B**: quando um cliente assinar Pro com 3 workspaces (matriz + 2 filiais), você não tem como agrupá-los, faturar conjuntamente, ou ver health-score consolidado.

2. **Lifecycle do Lead → Trial → Pago não está visível**. Hoje:
   - Lead entra em `waitlist_leads` → vira "Convidado" no Command Center
   - Vira `auth.users` + `workspace` → aparece em Usuários como "Trial"
   - Vira pagante → fica como "Pago" mas em outro card do Inteligência
   - **Você não consegue ver o funil**: 50 leads → 30 convidados → 12 ativaram → 3 pagaram. Isso é a métrica #1 de um SaaS B2B em estágio inicial.

3. **Falta "Customer Journey" por workspace**. Para um Product Sr. responsável de retenção:
   - Quando esse workspace foi criado?
   - Quando o líder fez o primeiro feedback? (TTV — Time to Value)
   - Quantos dias até o primeiro PDI/Review?
   - Está em qual estágio: onboarding / ativado / engajado / em risco / churned?
   - Existe `health_score` mas não a **trajetória** dele (foi de 80 pra 30 nos últimos 30 dias = sinal de churn iminente).

4. **Sem visão de billing real**. Inteligência mostra "Pulse: 0 / Pro: 0 / Business: 0". Falta:
   - MRR atual + tendência (4 semanas)
   - Workspaces em trial vencendo nos próximos 7 dias
   - Pagantes que reduziram uso (downgrade-risk)
   - Taxa de conversão Trial → Paid

5. **Onboarding em massa não tem follow-up**. "Importar em Massa" no Estrutura — ok, criou 20 usuários. E aí? Não há painel "Ativação Pós-Onboarding" mostrando: dos 20, quantos logaram, quantos completaram setup, quantos criaram primeiro feedback. Vide screenshot 2: **20 usuários, 8 são "Líder (1)" mas todos com chip "Sem workspace"** — exatamente o problema de ativação que você identificou nas conversas anteriores.

6. **Falta "Inteligência sobre o uso da IA"** (que é o produto core). Não há nenhum painel sobre:
   - Quantos briefs foram gerados (e por quem)
   - Quantos chats com Mentor / Meu Rhitmo
   - Distribuição de uso de Bias Detection
   - Custo de IA por workspace (matriz_economica diz que tem Gemini 2.5 Flash + Pro, custo varia)
   - **Com isso você não sabe qual workspace está "na margem negativa"**.

7. **Suporte não está integrado**. `AdminSupport.tsx` existe no código mas não está no menu. Se um cliente liga "esqueci senha", o admin precisa: ir em Usuários → buscar email → clicar ícone chave → confirmar dialog. Não tem botão "Login as user" rápido (impersonate existe mas o fluxo é via tabela de usuários, não via busca rápida).

### Falhas de produto/feature gap

- **Sem auditoria** (audit log). Quem suspendeu o workspace X em Y data? Quem promoveu Z a HR Admin?
- **Sem comunicação outbound**. Não dá pra disparar um email para "todos os trial vencendo em 7 dias" ou anúncio para "todos os Business".
- **Sem segmentação por uso real**. Filtro "segmento" tem beta/paid/trial mas é manual no `customer_segment`, não derivado do uso.
- **Convites em massa expostos só para admin**. Cliente Owner que tem 50 funcionários precisa pedir pro super-admin importar — fricção alta.

---

## Lente 3 — Business Analyst Sr.

### Métricas faltando (que decisões dependem)

| Métrica de negócio | Existe? | Onde deveria estar |
|---|---|---|
| MRR atual e por plano | ❌ | Inteligência |
| Funil Lead → Trial → Paid (taxa de conversão) | ❌ | Command Center + Inteligência |
| LTV / CAC por segmento | ❌ | Inteligência |
| Churn rate (mensal/trimestral) | ❌ | Inteligência |
| NPS / CSAT | ❌ | Não existe coleta |
| Activation rate (% leaders que fizeram 1º feedback em 7d) | ❌ | Onboarding |
| DAU / WAU / MAU por workspace | ❌ | Inteligência |
| Custo de IA por workspace (margem) | ❌ | Inteligência (cruzamento c/ `cost-analysis.md`) |
| Tempo médio até primeiro Review | ❌ | Customer Journey |
| Tickets de suporte por workspace | ❌ | Não existe |
| Reuniões transcritas (Recall) por semana / custo | ❌ | Inteligência |

### Métricas existem mas estão erradas/misleading

- **"Saúde Média"**: hoje considera só workspaces ativos. Se eu suspendo um workspace ruim, a média sobe. **Vanity metric.** Deveria mostrar "saúde média ponderada por receita" ou "saúde média por segmento (paid vs trial)".
- **"Em Risco"**: critério (`healthScore < 30`) é estático. Não considera trajetória nem peso financeiro (1 cliente Business em risco vale 10x 1 Pulse).
- **"Feedbacks/Semana"**: gráfico mostra só 4 semanas, sem comparativo período anterior nem zoom. Sem segmentação por workspace.
- **Workspace Health calcula `lastFeedbackDate` em N+1 query** (`for ws of workspaces { for table in [feedbacks, reviews, lastFb] {...} }`). Com 50 workspaces = 150 queries serialadas. **Vai engasgar em 6 meses.**

### Decisões que o admin atual NÃO permite

1. "Quero ligar pros 5 trials que mais usaram a IA semana passada" → sem dados.
2. "Quero ver se o cliente FAP dá margem positiva" → sem dados.
3. "Quero entender por que ninguém fez feedback este mês na FAP" → tem que ir no workspace via impersonate.
4. "Quero exportar o relatório de leads convertidos do Q1" → CSV só exporta tabelas inteiras, sem filtro de período.

---

## Recomendações priorizadas (ordem de impacto)

### 🔴 P0 — Risco de não decidir certo
1. **Funil Lead → Trial → Activated → Paid**, com taxa de conversão entre etapas, no topo do Command Center.
2. **MRR + tendência 4 semanas + trial vencendo em 7d**, no topo do Inteligência.
3. **Ativação pós-onboarding**: para cada lote de bulk-onboard, mostrar % que logou, % que criou 1º feedback, em até 7d. Resolve diretamente o caso "20 usuários FAP sem workspace".

### 🟠 P1 — Reduzir confusão e retrabalho
4. **Consolidar gestão de papéis em UM lugar** (na aba Estrutura ou aba Usuários — não nas duas). HR Admin invite, Owner change, Leader assignment: tudo num só fluxo, hierárquico.
5. **Search global** no topo do admin (⌘K): "fap", "matheus@", workspace UUID — pula direto pra entidade. Substitui o `AdminSupport.tsx` órfão.
6. **Suspend / Resume / Login as → como ações de linha** na tabela de Usuários, com confirmação e ações em lote (checkbox).
7. **Audit log** simples: tabela `admin_audit_log` (quem, quando, ação, target) + drawer "histórico" no detalhe de cada workspace/user.

### 🟡 P2 — Inteligência acionável
8. **Workspace 360°**: clicar no nome do workspace abre drawer com timeline (criação → 1º feedback → 1º review → último login) + health trajectory (linha 30d) + custo IA + ações (suspend, mensagem ao owner, schedule call).
9. **Custo de IA por workspace** (cruzando logs Edge Functions ↔ workspace_id) — base para decisão de margem.
10. **Segmento "Account" como entidade** (tabela `accounts` agrupando N workspaces). Permite ver "FAP" como cliente único.

### 🟢 P3 — Polish
11. KPIs com hierarquia visual (1 hero card MRR, 3 médios, 4 pequenos).
12. Empty states com CTA + skeleton uniforme.
13. Filtros de tabela com chips visíveis e botão "Limpar".
14. Performance: substituir loop N+1 do Inteligência por uma RPC `admin_workspace_health_batch()`.

---

## Pergunta antes de implementar

Esse diagnóstico cobre 14 melhorias em 4 níveis. **Não dá pra fazer tudo de uma vez** sem virar refactor de 2 semanas. Quer que eu:

- **(A)** Comece pelo P0 (funil + MRR + ativação pós-onboarding) — ~1 sprint focado em **dados de decisão**.
- **(B)** Comece pelo P1 (consolidar papéis + search global + audit log + ações em lote) — ~1 sprint focado em **eficiência operacional**.
- **(C)** Te apresente um **plano detalhado só do P0**, com queries específicas, layout do funil, RPC nova, antes de qualquer commit.
- **(D)** Combinar A + B (mais pesado, ~2 sprints).

Sugestão minha: **(C)** primeiro. Você valida o desenho do funil + métricas, depois eu executo. P1 entra como sprint seguinte.

