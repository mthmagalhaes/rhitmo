

## Pre-Meeting Brief — Plano de Implementação

### Resumo

Nova página `/brief/:meetingId` que gera um briefing pré-reunião usando IA, com pauta sugerida, pendências e contexto do liderado. Inclui uma Edge Function para gerar o brief, uma migração para cache, e um deep link no MemberDetails.

---

### Parte 1 — Migração: brief_cache

Adiciona duas colunas à tabela `upcoming_meetings`:

```sql
ALTER TABLE public.upcoming_meetings
ADD COLUMN IF NOT EXISTS brief_cache JSONB,
ADD COLUMN IF NOT EXISTS brief_generated_at TIMESTAMPTZ;
```

Também precisa de uma policy UPDATE para que o service role (via Edge Function) possa atualizar o cache. Como a Edge Function usa `SUPABASE_SERVICE_ROLE_KEY`, o RLS é bypassed — nenhuma policy adicional necessária.

---

### Parte 2 — Edge Function: generate-brief

**Arquivo:** `supabase/functions/generate-brief/index.ts`

**Config:** `verify_jwt = false` (validação manual via Authorization header)

**Fluxo:**
1. Autentica usuário via `getClaims` no token
2. Busca `upcoming_meetings` por ID, verifica `user_id = auth.uid()`
3. Busca `team_members` pelo `member_id` da reunião
4. Busca action_items pendentes dos últimos 10 feedbacks do membro (via service role)
5. Busca últimas 5 notas para contexto (content + title + occurred_at)
6. Chama Lovable AI (`LOVABLE_API_KEY`) com tool calling para extrair JSON estruturado:
   - `suggested_agenda[]` (max 3)
   - `pending_items[]` (max 5)
   - `context_summary` (2-3 frases)
   - `coaching_reminder` (1 dica)
7. Usa `RHITMO_IDENTITY` + `GUARDRAILS_PROMPT` como system prompt
8. Salva resultado em `brief_cache` + `brief_generated_at` via service role
9. Retorna o brief

**Modelo:** `google/gemini-3-flash-preview` (padrão recomendado, via Lovable AI gateway)

---

### Parte 3 — Página: BriefPage.tsx

**Arquivo:** `src/pages/BriefPage.tsx` (novo)

**Layout:** Dentro de `AppLayout` + `DirectReportGuard`

**Comportamento ao montar:**
1. Busca `upcoming_meetings` por `meetingId` (via Supabase client)
2. Se `brief_cache` existe e `brief_generated_at` < 30min: usa cache
3. Senão: invoca `generate-brief` e mostra loading

**UI (Design System Creme/Bento):**

- **Header:** Botão voltar, título "Brief — {member_name}", subtítulo com horário, badge Hoje/Amanhã, botão Google Meet
- **Loading:** Card com Skeleton + Loader2 animado + "Preparando seu brief..."
- **Grid de conteúdo:**
  - Pauta Sugerida (📋) — card branco `rounded-2xl`, lista numerada com topic + rationale
  - Pendências (⏳) — card `bg-amber-50` com border amber, ou "Nenhuma pendência ✓"
  - Contexto Atual (🧠) — card `bg-violet-50` full-width, com coaching_reminder em badge
- **Footer:** Botão "Iniciar Anotação" → `/member/{id}?openNote=true`, Botão "Abrir perfil" → `/member/{id}`

---

### Parte 4 — Deep link: openNote no MemberDetails

**Arquivo:** `src/pages/MemberDetails.tsx`

Adiciona `useEffect` que verifica `?openNote=true` na URL e abre o dialog de nova nota automaticamente, limpando o param depois.

---

### Parte 5 — Rota em App.tsx

Adiciona rota protegida:
```tsx
<Route path="/brief/:meetingId" element={
  <DirectReportGuard>
    <AppLayout><BriefPage /></AppLayout>
  </DirectReportGuard>
} />
```

---

### Parte 6 — Link no CalendarWidget

Atualiza o `onClick` dos cards de reunião no `CalendarWidget` para navegar para `/brief/{meetingId}` em vez de `/member/{memberId}`, quando o meeting tem `id`.

---

### Arquivos Alterados

| Arquivo | Ação |
|---------|------|
| Migration (nova) | ADD brief_cache, brief_generated_at em upcoming_meetings |
| supabase/functions/generate-brief/index.ts | Novo |
| supabase/config.toml | Add entry para generate-brief |
| src/pages/BriefPage.tsx | Novo |
| src/pages/MemberDetails.tsx | Edit (deep link openNote) |
| src/App.tsx | Edit (nova rota /brief/:meetingId) |
| src/components/CalendarWidget.tsx | Edit (link para /brief/) |

### O que NÃO muda

- Edge Functions existentes
- Tabelas existentes (exceto 2 colunas em upcoming_meetings)
- RLS existente
- useCalendarIntegration hook
- Qualquer componente não listado

