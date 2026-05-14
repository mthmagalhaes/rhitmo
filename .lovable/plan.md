## Onda 2 · Pessoas — Eficiência (bulk + filtros)

Foco: tornar a página operável em escala. Multi-select, ações em lote, filtros de saúde, range picker no Analytics e reenvio em massa de convites. Tudo só na camada de frontend, exceto **uma migração pequena** pra suportar arquivamento não-destrutivo.

---

### 1. Liderados — multi-select + filtros + bulk

**Toolbar (acima da tabela):**
- Chips de health com contador: `Todos (N) · 🟢 Frescos (n) · 🟡 Mornos (n) · 🔴 Frios (n)` — clicáveis, alternam filtro.
- Toggle `Mostrar arquivados` (off por padrão).
- Botão `Exportar CSV` (respeita filtros + busca + sort).

**Tabela:**
- Nova 1ª coluna `checkbox` (select-all no header, por linha no body).
- Quando ≥1 selecionado, toolbar troca para **barra de ações em lote** (sticky no topo da tabela):
  - `Mover para time…` (Select com lista de times + "Sem time")
  - `Arquivar` (soft delete via `archived_at`)
  - `Desarquivar` (só aparece quando filtro = arquivados)
  - `Exportar selecionados`
  - `Cancelar seleção`

**Estado arquivado:**
- Linhas arquivadas com opacidade reduzida + badge `Arquivado`.
- Liderados arquivados não aparecem em Home, 1:1s, Contexto, Mentor — somente na lista de Pessoas com toggle ligado.

---

### 2. Convites — bulk resend + filtro de status

- Checkbox por linha + select-all.
- Barra bulk: `Reenviar selecionados` · `Cancelar selecionados` · `Copiar links`.
- Filtro de status no toolbar: `Pendentes · Cancelados · Aceitos (últimos 7d)`.
- Sub-seção colapsada **"Aceitaram recentemente"** (últimos 7 dias) abaixo da tabela principal — fechamento de loop.
- Subir limite de `.limit(20)` → `.limit(200)` + contador real ("23 convites pendentes").

---

### 3. Analytics — range picker + filtro de time + governança fina

- **Range picker** no topo: `7d · 30d · 90d · Trimestre · Custom` (default 30d).
- **Filtro por time** (Select) sincronizado via querystring `?team=`.
- **Drilldown**: clique em "Cobertura de feedback" navega pra aba Liderados com `?tab=membros&health=cold`.
- **Botão Export CSV** dos KPIs do range atual.
- Manter aba escondida pra não-HR/Owner (já feito na Onda 1).

---

### 4. Times — pequenos ajustes (sem reescrita)

- Coluna ordenável (Nome / Liderados / Criado em).
- Search por nome do time quando ≥6 times.
- Tooltip no badge "Sem líder" sugerindo trocar líder.

> Wave 1 já entregou o essencial (rename/delete/trocar líder). Onda 2 só polish.

---

### 5. Schema — única migração necessária

```sql
ALTER TABLE public.team_members
  ADD COLUMN archived_at timestamptz NULL,
  ADD COLUMN archived_by uuid NULL REFERENCES auth.users(id);

CREATE INDEX idx_team_members_archived_at
  ON public.team_members (leader_user_id)
  WHERE archived_at IS NULL;
```

**Atualizar RLS / queries existentes pra filtrar `archived_at IS NULL` por padrão** em:
- `useLeaderMembers`, `useTeamPulse`, `useLeaderInbox`, `usePendingPulseSurveys`
- `Home /lider/inicio` (TeamPulseBento, Próximas 1:1s)
- `/lider/1on1s`, `/lider/contexto`, `/lider/diario`, `/lider/objetivos`
- Mentor RAG (chat-mentor edge function — incluir filtro)

> Não criar coluna nova em `profiles` nem mexer em `auth.users`.

---

### 6. Detalhes técnicos

- **Multi-select state**: `Set<string>` de IDs em React state local (não persiste em URL — limpa ao trocar filtro).
- **CSV export**: utilitário novo `src/lib/csvExport.ts` (sem libs externas; gera Blob + download).
- **Querystring sync** (parcial nesta onda): `?tab=`, `?team=`, `?health=`, `?status=` (convites). Sort/sortDir ficam pra Onda 3.
- **Analytics drilldown**: passa filtros via `navigate('/lider/pessoas?tab=membros&health=cold')`.
- **Telemetria nova** em `src/lib/analytics.ts`:
  - `members_bulk_archived`, `members_bulk_moved`, `members_exported_csv`
  - `invites_bulk_resent`, `invites_bulk_cancelled`
  - `analytics_range_changed`, `analytics_drilldown_clicked`

---

### 7. Fora do escopo (vai pra Onda 3)

- Atalhos de teclado (`g l/c/t/a`, `n`)
- Densidade compacta/confortável
- Querystring de sort persistente
- Hover preview de liderado

---

### Perguntas antes de implementar

1. **Arquivar = soft delete novo (`archived_at`)** — confirma essa abordagem? (alternativa: usar status existente, mas não temos um adequado hoje).
2. **Export CSV**: incluir colunas sensíveis (e-mail, último sinal exato)? Default proposto: Nome, Cargo, Time, Email, Último sinal (data), Status saúde.
3. **Range picker do Analytics**: o `AnalyticsContent` atual aceita props de range ou precisa refatorar? (vou inspecionar antes de codar; flag aqui caso vire trabalho maior do que a onda).
4. Implementar **tudo numa PR só** ou dividir em (a) Liderados+migração, (b) Convites, (c) Analytics?
