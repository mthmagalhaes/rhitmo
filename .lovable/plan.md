# Diagnóstico — fluxo do Líder a partir de `/auth/start`

## 1. O que acontece hoje quando alguém clica "Começar como Líder"

```text
Landing (/) ─► [Começar grátis] ─► /auth/start (PersonaSelector)
                                      │
                                      ▼ choose('leader')
                       localStorage.setItem('signup_persona','leader')
                       navigate('/auth?mode=signup&persona=leader')
                                      │
                                      ▼
                                AuthPage → <Auth> em modo signup
                                      │
                                      ▼ signup email/senha OU Google
                       Supabase cria user → email de verificação
                                      │
                                      ▼ user clica no link / volta logado
                       AuthPage useEffect:
                          - planParam !== 'pro' → NÃO dispara checkout
                          - checa hr_admin_ids → não é HR
                          - redireciona para useHomeRoute() → /lider/inicio
                                      │
                                      ▼
                       AccountContext cria workspace automático (trigger)
                       LeaderTour dispara onboarding tour
                       NewMemberDialog convida liderados (até o limite)
```

Pontos importantes:

- **Não há checkout no caminho do líder curioso.** Só quem chega com `?plan=pro` (vindos da página `/enterprise` ou de um link específico) entra no fluxo de auto-checkout. O líder normal entra direto no produto grátis.
- **Não há tela "escolha de plano" depois do signup.** O upgrade só acontece quando ele bate no limite (4º liderado, etc.) via `usePlanLimits` / gates.
- **Não passa pelo `/onboarding` clássico** — esse wizard é do liderado (preenche `skills_data` / `job_crafting_profile`). O líder cai direto no `/lider/inicio` com o tour.

## 2. Desalinhamento entre PersonaSelector e Pricing

A landing já está no **Pricing v3 (08/05/2026)**: plano único, "Primeiros 3 usuários grátis", R$ 39,90–49,90/liderado a partir do 4º, com **Mentor AI ilimitado**, **1:1s/Pulse/PDI/360°**, **transcrição ilimitada**, **Slack bidirecional** e **detecção de viés**.

Mas o `PersonaSelector` ainda usa a narrativa do **Plano Pulse antigo**:


| Onde            | Copy atual                       | Conflito com pricing v3                                 |
| --------------- | -------------------------------- | ------------------------------------------------------- |
| Badge           | "Plano Pulse grátis"             | Pricing não fala mais em "Pulse" — é plano único        |
| Descrição líder | "até 2 liderados"                | Pricing diz "primeiros 3 usuários grátis"               |
| Descrição líder | "Mentor AI com 20 conversas/mês" | Pricing promete "Mentor AI ilimitado"                   |
| Descrição líder | "1 avaliação com IA"             | Pricing promete ciclo completo (1:1s, Pulse, PDI, 360°) |
| Descrição líder | "Tudo grátis pra sempre"         | Pricing diz "sem compromisso", upgrade no 4º usuário    |


Resultado: quem vem da landing lê "3 usuários grátis + tudo ilimitado" e na próxima tela vê "2 liderados + 20 conversas + 1 avaliação". Parece downgrade/bait.

> Há também a memória `mem://monetization/plan-limits-and-guardrails-v2` que diz "Pulse limited to 2 members". Vale confirmar se essa regra ainda vale em runtime (`usePlanLimits`), ou se já foi atualizada para 3 — porque é ela que vai gerar o gate real quando o líder convidar liderados.

## 3. Plano de ajuste

### Escopo desta sprint (frontend, baixo risco)

**3.1 — Reescrever copy do card "Líder" no `PersonaSelector**` (`src/pages/PersonaSelector.tsx`, PT/EN/ES):

- Badge: "Comece grátis" (remover menção a "Pulse", já que o pricing usa plano único).
- Título: manter "Sou Líder de time".
- Descrição PT: "Crie seu workspace agora. Os 3 primeiros usuários são grátis, com Mentor AI ilimitado, 1:1s, Pulse, PDI, 360° e transcrição de reuniões. Pague só a partir do 4º liderado."
- Descrição EN/ES equivalentes.
- CTA: "Começar como Líder" (mantém).

**3.2 — Card RH/People Admin**: revisar para deixar claro que é fluxo top-down (cria empresa, convida 1 líder, vê amostra Enterprise) e que **não é o caminho recomendado para quem só quer testar a ferramenta**. Hoje já está razoável; pequeno ajuste de tom.

**3.3 — Adicionar "trust line" sob os cards** com 1 linha: "Sem cartão. Cancele quando quiser." — espelha o pricing e baixa fricção.

**3.4 — (Opcional) Link "Ver planos completos"** no rodapé do PersonaSelector apontando para `/#pricing`, para o líder confirmar antes de criar a conta. Garante coerência narrativa entre as duas telas.

### Fora de escopo (apenas sinalizar, decidir depois)

- **Auditar `usePlanLimits**` para confirmar se o limite real é 3 (alinhado ao pricing v3) ou ainda 2 (como na memória antiga). Se estiver em 2, abrir tarefa para subir para 3 + atualizar `mem://monetization/plan-limits-and-guardrails-v2`.
- **Decidir se queremos uma tela "Plano selecionado"** entre signup e `/lider/inicio` (mostrando "Você está no plano gratuito — primeiros 3 usuários"), ou se mantemos a entrada silenciosa direto no produto. Hoje é silenciosa.
- **Decidir se RH Admin também deve ter um teaser de pricing Enterprise** ou apenas o link "Falar com vendas".

## 4. Pergunta antes de implementar

Antes de mexer nas copies, confirma uma coisa: o limite real do plano grátis hoje no app é **2 ou 3 liderados**? Resposta: O limite são 3 liderados.   
Isso muda a frase exata que vou colocar no PersonaSelector — e se for 2, a landing está prometendo algo que o produto ainda não entrega, e é melhor ajustar os dois lados juntos.