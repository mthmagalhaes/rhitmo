---
name: rhitmo-code-health
description: Use para revisar arquitetura e saúde do código da Rhitmo (auditoria periódica, antes de grandes mudanças, ou quando pedirem "rever arquitetura"/"varredura de anti-patterns"). Detecta violações de convenção em frontend, edge functions e migrations e propõe correções priorizadas.
---

# Rhitmo Code Health

Varredura read-only primeiro; só corrige após aprovação (ou se o pedido for explícito).

## Varreduras
```bash
# 1. .catch() direto em builder/rpc do Supabase (proibido)
rg -n "\.(rpc|from)\([^)]*\)[\s\S]{0,200}?\.catch\(" --multiline src supabase/functions
# 2. process.env em Deno / import de client frontend em edge
rg -n "process\.env" supabase/functions
rg -n "integrations/supabase/client" supabase/functions
# 3. Fetch direto a provedores de IA (deve usar _shared/aiGateway.ts)
rg -n "api\.openai\.com|api\.anthropic\.com" supabase/functions
# 4. Prompt inline (deve vir de _shared/soul via composeSystemPrompt)
rg -ln "You are|Você é a Rhitmo" supabase/functions --glob '!_shared/soul/**'
# 5. console.log cru em edge (usar _shared/logger.ts)
rg -c "console\.log" supabase/functions | sort -t: -k2 -nr | head
# 6. CORS redeclarado
rg -n "const corsHeaders\s*=" supabase/functions
# 7. Edge sem getUser nem cronAuth
for d in supabase/functions/*/; do f="$d/index.ts"; [ -f "$f" ] && ! rg -q "getUser|cronAuth|x-cron-secret|stripe-signature|verifySlack|webhook" "$f" && echo "$f"; done
# 8. Rotas não lazy
rg -n "^import .* from \"@/pages/" src/App.tsx
# 9. Telemetria fora do choke point
rg -n "posthog" src --glob '!src/lib/productAnalytics.ts'
# 10. Entitlement de bot fora de botEntitlement.ts
rg -ln "recall.*bot" supabase/functions | xargs rg -L "botEntitlement"
```
Também: migrations recentes de RPC sem `_assert_rpc_runs`; tabelas novas sem GRANT/RLS (`supabase--linter`); arquivos > 800 linhas (`wc -l`).

## Regras de referência
`AGENTS.md` (raiz) e as skills `rhitmo-edge-function`, `rhitmo-rls-migration`, `rhitmo-soul-editor`. Se uma correção contrariar memória, sinalizar.

## Saída
Relatório priorizado:
- 🔴 Segurança/vazamento entre workspaces
- 🟠 Risco de crash/regressão
- 🟡 Convenção/manutenção
Cada item: arquivo:linha, por que importa, correção sugerida, esforço (P/M/G). Terminar com top 3 recomendado.
