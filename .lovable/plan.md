

## Substituir página Billing por gerenciamento de assinatura

### Arquivo alterado: `src/pages/Billing.tsx`

Reescrever completamente. A página consulta `workspaces.plan_tier` via query existente (`useQuery` com `supabase.from('workspaces').select('id, plan_tier').maybeSingle()`) e renderiza 3 estados:

**Estado 1 — Pulse (sem assinatura):**
- Header: "Seu plano" + subtítulo indicando Pulse gratuito
- Grid 3 colunas com os 3 planos (mesmo conteúdo da landing)
- Pulse com badge "Plano atual" no lugar do CTA
- Pro: botão "Fazer upgrade para Pro" → `handleUpgrade('pro')` → toast "Em breve"
- Business: botão "Falar com a equipe" → mailto:matheus@rhitmo.co

**Estado 2 — Pro ou Business (assinatura ativa):**
- Card principal com nome do plano, badge colorido (Pro roxo, Business azul), status "Ativo" verde, próxima cobrança (placeholder "--"), valor (R$69 ou R$89), botão "Gerenciar assinatura" → toast "Em breve"
- Seção "O que está incluso" com lista de features do plano
- Link "Cancelar assinatura" discreto → mesmo handler

**Estado 3 — Trial (não existe tabela subscriptions ainda, reservado para futuro):**
- Estrutura preparada mas não ativável por ora (sem campo trial no DB)

**Lógica:**
- `plan_tier === 'pulse'` → Estado 1
- `plan_tier === 'pro'` ou `'business'` → Estado 2
- Fallback para 'pulse' se workspace não encontrado

**Imports:** `Check`, `Lock`, `Clock`, `CreditCard`, `ExternalLink` de lucide-react; `Badge`, `Button`, `Card`; `useQuery` + `supabase`; `useAuth`, `useToast`.

### Sidebar (AppSidebar.tsx)

Verificado: não existe badge "Beta" na sidebar. Nenhuma alteração necessária.

### Design
- `p-6 md:p-8`, cards `rounded-2xl shadow-sm`, tokens semânticos
- Mesma linguagem visual da landing pricing section

