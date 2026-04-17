

## Diagnóstico

A finding aponta que **qualquer admin** (hoje só `matheus@rhitmo.co`) pode impersonar **qualquer user** sem auditoria, sem expiração e sem aprovação. O risco é real arquiteturalmente, mas o impacto prático é limitado por só existir 1 super-admin. Mesmo assim, dá pra blindar sem quebrar o fluxo atual de impersonate.

### O que NÃO podemos quebrar
- `useImpersonation.ts` — start/stop via INSERT/DELETE em `admin_impersonation`
- `effective_user_id()` — usado em ~25 policies de leitura
- `useAdmin.ts` — usa `auth.uid()` direto (correto)
- Hard reload depois de start/stop

## Solução: 3 camadas de defesa, zero breaking change

### Camada 1 — Auditoria + expiração no schema

Adicionar colunas em `admin_impersonation`:
- `expires_at timestamptz` (default `now() + interval '1 hour'`)
- `reason text` (opcional, livre — pra log)
- `ended_at timestamptz` (preenchido no stop)

Tabela nova `admin_impersonation_audit` (append-only) que registra cada start/stop com `admin_user_id`, `impersonated_user_id`, `action` (`start`/`stop`/`expired`), `created_at`, `reason`. Trigger AFTER INSERT/DELETE em `admin_impersonation` popula automaticamente. Nenhuma mudança de código TS necessária.

### Camada 2 — Hardening do `effective_user_id()`

Atualizar a função pra **ignorar registros expirados**:

```sql
CREATE OR REPLACE FUNCTION public.effective_user_id()
RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN COALESCE(
    (SELECT impersonated_user_id
     FROM admin_impersonation
     WHERE admin_user_id = auth.uid()
       AND (expires_at IS NULL OR expires_at > now())
       AND ended_at IS NULL
     ORDER BY created_at DESC LIMIT 1),
    auth.uid()
  );
END;
$$;
```

Compatibilidade: registros antigos sem `expires_at` ainda funcionam (`IS NULL` passa). Após migration, novos registros terão default `now() + 1h`.

### Camada 3 — Restringir quem pode ser impersonado

Atualizar a INSERT policy em `admin_impersonation`:
- ✅ Continua exigindo `is_admin()`
- ✅ Continua exigindo `admin_user_id = auth.uid()`
- ➕ NOVO: `NOT is_admin_user(impersonated_user_id)` — admin não pode impersonar outro admin (previne escalation lateral se houver mais super-admins no futuro)
- ➕ NOVO: `expires_at <= now() + interval '4 hours'` — limite máximo de duração

Função helper `is_admin_user(uuid)` (security definer, retorna bool) pra checar role do alvo sem RLS recursion.

### Camada 4 — Cleanup automático (opcional, leve)

Cron via `pg_cron` (já habilitado) chamando `DELETE FROM admin_impersonation WHERE expires_at < now()` a cada 15min. Garante que sessões esquecidas expirem.

## Impacto no código TS

**Zero**. O `useImpersonation.ts` continua fazendo INSERT simples — o default de `expires_at` e os triggers de auditoria são server-side. O `useEffectiveUser` e todas as policies continuam idênticos. O hard reload no stop continua funcionando.

Único ajuste opcional (não bloqueante): exibir countdown "expira em 47min" no `ImpersonationIndicator`. Pode ficar pra depois.

## Arquivos modificados

- 1 migration SQL:
  - ALTER `admin_impersonation` (3 colunas + default)
  - CREATE `admin_impersonation_audit` + RLS (só admin lê)
  - CREATE trigger de auditoria
  - CREATE função `is_admin_user(uuid)`
  - REPLACE policy INSERT em `admin_impersonation` (com novas checagens)
  - REPLACE função `effective_user_id()` (filtro de expiração)
  - CREATE cron job de cleanup
- Memory update: `mem://admin/impersonation-view-mode` documentando expiração de 1h e auditoria

## Validação pós-fix

1. Matheus consegue iniciar impersonate de Yasmin (não-admin) → ✅
2. Tentativa de impersonar outro admin (futuro) → erro RLS ✅
3. Após 1h sem renovar → `effective_user_id()` volta para `auth.uid()` ✅
4. Tabela `admin_impersonation_audit` registra start + stop ✅
5. Cron limpa registros expirados ✅
6. Marcar finding `effective_user_id_impersonation_escalation` como `mark_as_fixed`

## Escopo

Pequeno-médio. 1 migration SQL ~80 linhas. Zero código TS modificado. Risco: muito baixo — todas as mudanças são aditivas ou compatíveis com o estado atual (default `now() + 1h` cobre INSERTs existentes do hook sem alterar o hook).

