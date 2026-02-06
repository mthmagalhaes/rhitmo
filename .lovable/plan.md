

## Plano: Resetar Onboarding do Usuario de Teste

### Registro Identificado

| Campo | Valor |
|-------|-------|
| **Member ID** | `d7da97b1-4427-4e8b-8c6c-0b4c14c6bd66` |
| **Nome** | Matheus |
| **Email** | mth.magalhaes@gmail.com |
| **Workspace** | Faster Ops |
| **Team** | Business Ops |
| **skills_data atual** | `{}` (objeto vazio) |

### Acao SQL Necessaria

```sql
UPDATE public.team_members
SET skills_data = NULL
WHERE id = 'd7da97b1-4427-4e8b-8c6c-0b4c14c6bd66';
```

### Efeito no Codigo

O hook `useLinkedMember` calcula `needsOnboarding` assim:

```typescript
const needsOnboarding = linkedMember && 
  !linkedMember.skills_data?.onboarding_completed;
```

Apos o reset:
- `skills_data` sera `NULL`
- `skills_data?.onboarding_completed` sera `undefined` (falsy)
- `needsOnboarding` retornara `true`
- Usuario sera redirecionado para `/onboarding` no proximo acesso

### Resultado Esperado

Ao fazer login como `mth.magalhaes@gmail.com`:
1. Sistema detecta `needsOnboarding = true`
2. Redireciona para `/onboarding`
3. Usuario passa pelo wizard de Job Crafting
4. No passo final, a IA analisa o perfil
5. `skills_data` e preenchido com dados + `ai_analysis`
6. Usuario ve o `DirectReportDashboard` com `CareerCompassCard`

