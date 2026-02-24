

## Correções no CalendarWidget — Plano

### Correção 1: Badge de dia/data em todos os cards

**Arquivo:** `src/components/CalendarWidget.tsx`

Substituir a lógica condicional de badges (linhas 111-134) por uma função `getDayBadge` que retorna um badge para **todos** os cards:
- Hoje → `bg-amber-100 text-amber-700`
- Amanhã → `bg-blue-100 text-blue-700`
- Outros dias → abreviação do dia (Qui, Sex, etc.) com `bg-slate-100 text-slate-600`

O badge será renderizado incondicionalmente no header de cada card, ao lado do horário.

---

### Correção 2: Múltiplos liderados na mesma reunião

**3 partes:**

#### 2a. Migração: alterar unique constraint

```sql
ALTER TABLE public.upcoming_meetings
DROP CONSTRAINT upcoming_meetings_user_id_google_event_id_key;

ALTER TABLE public.upcoming_meetings
ADD CONSTRAINT upcoming_meetings_user_event_member_key 
UNIQUE (user_id, google_event_id, member_id);
```

#### 2b. Edge Function: remover `break`

**Arquivo:** `supabase/functions/fetch-calendar-events/index.ts`

- Remover o `break` na linha 222 para que o loop continue iterando todos os attendees
- Alterar `onConflict` de `"user_id,google_event_id"` para `"user_id,google_event_id,member_id"`

#### 2c. CalendarWidget: cards separados

Nenhuma mudança adicional necessária — cada meeting já gera um card separado. Com a remoção do `break`, a Edge Function retornará múltiplos entries para o mesmo evento quando houver múltiplos liderados, e cada um será renderizado como card individual.

---

### Arquivos alterados

| Arquivo | Ação |
|---------|------|
| Migration (nova) | DROP/ADD unique constraint |
| `supabase/functions/fetch-calendar-events/index.ts` | Remover `break`, atualizar `onConflict` |
| `src/components/CalendarWidget.tsx` | Nova função `getDayBadge`, badge em todos os cards |

### O que NÃO muda
- Nenhuma outra Edge Function
- Nenhuma outra tabela
- Nenhum outro componente
- `useCalendarIntegration` hook

