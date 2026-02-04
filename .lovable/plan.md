

## Plano: Correção de Crash no MemberDetails (Ícone Indefinido)

### Diagnóstico

O erro `TypeError: Cannot read properties of undefined (reading 'icon')` ocorre quando:

1. O campo `work_style_data` contém valores que não existem no `styleConfig`
2. Dados da V2 do Rhitmo Sync têm campos diferentes (ex: `chronotype` ao invés de `energy`)
3. Dados corrompidos ou incompletos no banco

**Locais afetados** (linhas 311-378):

| Linha | Acesso sem verificação |
|-------|------------------------|
| 312 | `styleConfig.processing[...].icon` |
| 327 | `styleConfig.feedback[...].icon` |
| 342 | `styleConfig.autonomy[...].icon` |
| 357 | `styleConfig.energy[...].icon` |
| 372 | `styleConfig.motivation[...].icon` |

---

### Solução

Adicionar **cláusula de guarda** em cada acesso ao `styleConfig`. Se a configuração não existir, não renderizar o badge.

---

### Implementação

#### Padrão Atual (Vulnerável)

```typescript
{(() => {
  const config = styleConfig.processing[(member.work_style_data as unknown as WorkStyleData).processing];
  const Icon = config.icon; // ❌ CRASH se config for undefined
  return (
    <Badge variant="secondary" className={`${config.color} gap-2 py-2 px-3`}>
      <Icon className="h-4 w-4" />
      {config.label}
    </Badge>
  );
})()}
```

#### Padrão Corrigido (Seguro)

```typescript
{(() => {
  const key = (member.work_style_data as unknown as WorkStyleData).processing;
  const config = key ? styleConfig.processing[key as keyof typeof styleConfig.processing] : null;
  if (!config) return null; // ✅ Cláusula de guarda
  const Icon = config.icon;
  return (
    <Badge variant="secondary" className={`${config.color} gap-2 py-2 px-3`}>
      <Icon className="h-4 w-4" />
      {config.label}
    </Badge>
  );
})()}
```

---

### Alterações por Bloco

| Bloco | Campo | Linha Início |
|-------|-------|--------------|
| 1 | processing | 311 |
| 2 | feedback | 326 |
| 3 | autonomy | 341 |
| 4 | energy | 356 |
| 5 | motivation | 371 |

---

### Lógica de Segurança

```text
Usuário acessa /member/:id
         │
         ▼
member.work_style_data existe?
         │
    ┌────┴────┐
    │ NÃO    │ SIM
    │        ▼
    │   Para cada campo (processing, feedback, etc):
    │        │
    │        ▼
    │   key = work_style_data[campo]
    │        │
    │        ▼
    │   config = styleConfig[campo][key]
    │        │
    │   ┌────┴────┐
    │   │ NULL   │ EXISTE
    │   │        │
    │   ▼        ▼
    │  return   Renderiza Badge
    │  null     com Icon e Label
    │        │
    └────────┴─────────────────────┘
```

---

### Resumo das Alterações

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/MemberDetails.tsx` | Adicionar cláusula de guarda (`if (!config) return null`) em 5 blocos de renderização de badges (linhas 311-380) |

---

### Seção Técnica

**Por que o erro ocorre?**

O `styleConfig` (de `WorkStyleCard.tsx`) tem esta estrutura:

```typescript
export const styleConfig = {
  processing: {
    direct: { label: '...', icon: Zap, color: '...' },
    contextual: { label: '...', icon: BookOpen, color: '...' }
  },
  feedback: {
    immediate: { ... },
    scheduled: { ... }
  },
  // etc
};
```

Se `work_style_data.processing` for `"morning"` (valor inválido para essa categoria), o acesso `styleConfig.processing["morning"]` retorna `undefined`, e `undefined.icon` causa o crash.

**Cenários protegidos após a correção:**

| Cenário | Antes | Depois |
|---------|-------|--------|
| Valor inválido | ❌ Crash | ✅ Não renderiza badge |
| Campo undefined | ❌ Crash | ✅ Não renderiza badge |
| Dados V2 com campos novos | ❌ Crash | ✅ Ignora campos desconhecidos |
| Dados V1 completos | ✅ Funciona | ✅ Funciona |

