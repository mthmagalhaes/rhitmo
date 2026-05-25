# Skill: rhitmo-support

Habilidade que transforma o agente em "Support da Rhitmo": ao receber um print/descrição + sua hipótese, ela faz triagem, investiga (logs + código + memórias) e propõe uma solução, registrando tudo num ticket auditável.

## Triggers
Frases típicas: "support", "rhitmo support", "ticket", "fulano tá com um bug", "usuário reclamou", "investigar problema do…".

## O que a skill faz (workflow)

1. **Coleta inicial** — extrai do input: usuário afetado (email/nome), rota/feature, comportamento esperado vs. observado, sua hipótese. Se faltar usuário ou rota, pergunta **só isso** antes de seguir.
2. **Triagem (categoriza)** — `bug` | `dúvida_uso` | `regressão` | `dado_inconsistente` | `feature_request`. Define severidade `low|medium|high|critical` (critical = bloqueio total, perda de dado, vazamento entre workspaces).
3. **Cria ticket em estado `investigating`** já no início (RPC `support_ticket_open`) — assim mesmo se a investigação for interrompida, fica rastro.
4. **Investigação paralela** (sempre roda os 4, salvo se irrelevante):
   - **Logs**: `supabase--edge_function_logs` na função suspeita + `supabase--analytics_query` (postgres_logs/auth_logs/edge_logs) janela últimas 24h filtrando pelo `user_id` quando possível.
   - **Schema/RLS**: `supabase--read_query` nas tabelas envolvidas + revisão de policies (especial atenção a `effective_user_id`, `is_team_leader`, `is_hr_admin_of_workspace`).
   - **Código**: `rg` por rota/componente/edge function citados.
   - **Memórias**: checa `mem://index.md` por decisões prévias relacionadas (ex: Safe Supabase Wrappers, Role Resolution Priority, RLS Recursion Prevention) — evita propor algo que já foi rejeitado.
5. **Diagnóstico estruturado** — responde em PT-BR no formato:
   ```
   🎫 #TKT-XXXX · [severidade] · [categoria]
   📍 Sintoma: ...
   🔎 Causa raiz: ... (com refs a arquivos/linhas/policies)
   💊 Solução proposta: ... (passos concretos, batched)
   ⚠️ Riscos / regressões: ...
   🧪 Como validar: ...
   ```
6. **Atualiza ticket** (`support_ticket_update`) com `root_cause`, `resolution_proposal`, arquivos tocados, função(ões) impactada(s), refs de memória consultadas.
7. **Aguarda decisão**: skill **não implementa sozinha** — apresenta diagnóstico, pergunta "aplicar agora?". Quando o fix for aprovado e implementado, marca ticket `resolved` com `resolution_summary` + link do commit/migration.

## Guardrails (não-negociáveis)
- **Read-only por padrão**: investigação nunca usa `supabase--insert` / `supabase--migration`. Só cria/atualiza ticket (operação isolada e reversível) e propõe SQL/código — execução pede confirmação.
- **PII**: ticket guarda `affected_user_email` mas nunca cola transcrições/feedbacks/notas privadas no campo `description`. Referencia por id.
- **Workspace isolation**: ao consultar dados, sempre filtra pelo `workspace_id` do usuário afetado — evita expor dados cruzados durante triagem.
- **Memória primeiro**: antes de propor mudança em RLS, edge function, ou fluxo Slack/Recall, leia a memória relacionada listada em `mem://index.md`. Se a solução contradiz uma memória, sinaliza explicitamente "isto contraria mem://…, confirmar antes".
- **Sem invenção**: se logs/código não confirmam a hipótese, ticket vira `needs_more_info` com perguntas concretas — não chuta.

## Estrutura do ticket (nova tabela)
Migration cria `support_tickets`:
- `id uuid` + `ticket_number text` (gerado: `TKT-{yymm}-{seq}`)
- `opened_by uuid` (auth.uid do operador da skill — você, Matheus)
- `affected_user_email`, `affected_user_id?`, `workspace_id?`
- `category text`, `severity text`, `status text` (`investigating|needs_more_info|diagnosed|resolved|wont_fix|duplicate`)
- `title text`, `symptom text`, `hypothesis text`, `root_cause text?`, `resolution_proposal text?`, `resolution_summary text?`
- `route text?`, `edge_functions text[]`, `files_touched text[]`, `memory_refs text[]`
- `tags text[]`, `metadata jsonb` (logs trechos, query results resumidos)
- `created_at`, `updated_at`, `resolved_at?`

RLS: apenas `is_admin()` (super admin) lê/escreve. Owners/HR não veem — é ferramenta interna.

Helpers (security definer):
- `support_ticket_open(payload jsonb) returns text` → retorna `ticket_number`.
- `support_ticket_update(ticket_number text, patch jsonb) returns void`.

## Estrutura de arquivos do skill

```
.agents/skills/rhitmo-support/
├── SKILL.md                    # workflow + triggers + guardrails (este plano resumido)
├── references/
│   ├── investigation-playbook.md   # queries SQL prontas (logs por user_id, RLS check, etc.)
│   ├── severity-matrix.md          # critérios objetivos low→critical
│   └── known-pitfalls.md           # armadilhas recorrentes (RLS recursion, .catch em builder, etc.)
└── scripts/
    └── open-ticket.sh          # wrapper opcional via psql pra abrir ticket fora da skill
```

## Etapas de implementação (modo build)

1. Migration `support_tickets` + 2 RPCs security definer + RLS super-admin-only.
2. Criar `.agents/skills/rhitmo-support/SKILL.md` + 3 references + script.
3. `skills--apply_draft` em `.agents/skills/rhitmo-support`.
4. Smoke test: acionar a skill com um caso fake ("usuário X não consegue abrir convite") e validar que ticket é criado, diagnóstico segue o formato, e nada é mutado fora da tabela `support_tickets`.

## Out of scope (deliberado)
- UI pra visualizar tickets (fica pra depois — por enquanto consulta via `supabase--read_query`).
- Notificação automática quando ticket resolvido (sem Slack/email — você acompanha pelo chat).
- Auto-fix: skill **propõe**, você aprova, build mode aplica.
