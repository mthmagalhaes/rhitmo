

## Plano: Correcao de Seguranca RLS e Policies

### Resumo Executivo

Apos analise completa do banco de dados, identificamos que a **maioria das vulnerabilidades ja foram corrigidas** em migracoes anteriores. No entanto, existem alguns ajustes finais necessarios e precisamos corrigir os alertas do scanner de seguranca.

---

### Estado Atual (Descobertas)

| Item | Status | Detalhes |
|------|--------|----------|
| RLS em `team_members` | OK | Habilitado com 4 policies restritivas |
| Funcao `effective_user_id()` | OK | Existe e funciona (suporta Admin Impersonation) |
| Grants para `anon` | OK | Revogados em todas as tabelas sensiveis |
| Policies de workspace | OK | Owners so veem dados dos seus workspaces |
| RPC `get_member_for_sync` | ATENCAO | Expoe nome e cargo para publico (RhitmoSync) |

---

### Acoes Necessarias

#### Acao 1: Marcar Alertas Resolvidos no Scanner

O scanner detectou `effective_user_id_missing` como erro critico, mas a funcao **ja existe** no banco de dados:

```sql
-- Funcao existente (confirmada via query)
SELECT COALESCE(
  (SELECT impersonated_user_id 
   FROM public.admin_impersonation 
   WHERE admin_user_id = auth.uid()),
  auth.uid()
)
```

**Acao**: Atualizar o finding no scanner para marcar como resolvido/ignorado com justificativa tecnica.

---

#### Acao 2: Documentar Arquitetura RLS no Codigo

Criar arquivo de documentacao explicando a estrategia de seguranca para referencia futura.

---

#### Acao 3: Avaliar Exposicao do RhitmoSync (Opcional/Futuro)

A funcao `get_member_for_sync` expoe:
- `id` (UUID)
- `name` (nome do membro)
- `role` (cargo)
- `work_style_data` (null antes de preencher)

**Risco**: Baixo - Requer conhecer o UUID exato do membro (nao enumeravel). Nao expoe email, telefone ou dados pessoais criticos.

**Recomendacao Futura**: Implementar tokens assinados (JWT) nos links do RhitmoSync em vez de UUIDs puros para adicionar uma camada extra de validacao.

---

### Alteracoes no Banco de Dados

Nenhuma alteracao SQL necessaria. As migracoes existentes ja implementaram:

1. **20251202032832**: Criou estrutura de roles e policies base
2. **20260107015409**: Removeu policies "Admin Full Access" que permitiam cross-tenant
3. **20260128025008**: Revogou grants do role `anon` em todas as tabelas sensiveis
4. **Multiple migrations**: Policies usam `effective_user_id()` para suportar impersonation

---

### Alteracoes no Codigo

| Arquivo | Alteracao |
|---------|-----------|
| Nenhum arquivo de codigo | Apenas atualizacao do scanner de seguranca |
| (Opcional) `docs/SECURITY.md` | Criar documentacao da arquitetura RLS |

---

### Diagrama da Arquitetura RLS Atual

```text
┌─────────────────────────────────────────────────────────────────┐
│                      CAMADA DE ACESSO                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Usuarios Anonimos (anon)                                       │
│  ├── REVOGADO acesso a todas as tabelas sensiveis               │
│  └── PERMITIDO apenas:                                          │
│      ├── waitlist_leads (INSERT)                                │
│      └── RPC: get_member_for_sync, submit_rhitmo_sync_v2        │
│                                                                 │
│  Usuarios Autenticados (authenticated)                          │
│  ├── Ver dados APENAS do seu workspace                          │
│  ├── effective_user_id() resolve impersonation                  │
│  └── Policies verificam:                                        │
│      ├── workspace.owner_id = effective_user_id()               │
│      └── workspace.is_active = true                             │
│                                                                 │
│  Super Admins (super_admin role)                                │
│  ├── Acesso ao /admin dashboard                                 │
│  └── Podem impersonar usuarios via admin_impersonation          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### Secao Tecnica

#### Policies Atuais em team_members

```sql
-- SELECT: Owners veem membros dos seus workspaces
USING (EXISTS (
  SELECT 1 FROM teams t
  JOIN workspaces w ON w.id = t.workspace_id
  WHERE t.id = team_members.team_id
  AND w.owner_id = effective_user_id()
  AND w.is_active = true
))

-- INSERT/UPDATE/DELETE: Mesma logica de ownership
```

#### Funcao effective_user_id()

```sql
-- Suporta Admin Impersonation Mode
SELECT COALESCE(
  (SELECT impersonated_user_id 
   FROM public.admin_impersonation 
   WHERE admin_user_id = auth.uid()),
  auth.uid()  -- Fallback para usuario normal
)
```

Esta funcao permite que admins vejam dados como se fossem outro usuario, util para suporte ao cliente.

#### RhitmoSync: Por que expor nome/cargo e aceito

O fluxo do RhitmoSync:
1. Lider envia link `rhitmo.app/sync/{member_id}` ao liderado
2. Liderado (anonimo) acessa e ve seu nome/cargo para confirmar identidade
3. Liderado preenche dados comportamentais

**Mitigacoes existentes**:
- UUID nao e enumeravel (36 caracteres aleatorios)
- `submit_rhitmo_sync` so funciona uma vez por membro (check `work_style_data IS NULL`)
- Nao expoe email, telefone ou dados pessoais sensiveis

---

### Proximos Passos

1. **Atualizar scanner**: Marcar finding `effective_user_id_missing` como resolvido
2. **Testar acesso**: Verificar que usuario normal nao ve dados de outros workspaces
3. **Futuro (opcional)**: Implementar tokens JWT para links do RhitmoSync

