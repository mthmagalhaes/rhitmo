# Diagnóstico — caso Bianca / Faster

Bianca tem **duas linhas** em `team_members` no time "Excelência criativa" do Faster:

| id | linked_user_id | invite_status | origem provável |
|---|---|---|---|
| `afe577ba…` ("Bianca Brand Hayakawa") | ✅ a15b87ec… | `accepted` | criada/linkada depois (fluxo correto) |
| `4a52cc20…` ("Bianca Brand") | ❌ NULL | `none` | linha órfã do primeiro bulk-onboard (antes do fix) |

O link `rhitmo.co/sync/4a52cc20…` da 1ª screenshot aponta justamente para a linha órfã — daí o "Falta ativar conta".

A 2ª screenshot (`/lider/inicio` com sidebar "Faster · MINHA EQUIPE", "Voltar ao Painel RH", "Bom dia, Bianca", 0 liderados) é **resíduo do estado anterior** ao fix do `get_account_context`. Rodando o RPC agora:

```
role = 'user'
workspace_id = null
is_workspace_owner = false
is_team_leader = false
linked_member = { id: afe577ba…, name: Bianca Brand Hayakawa }
```

Ou seja: o backend já entrega Bianca como **liderada** corretamente. `RoleRouteGuard` deve redirecioná-la de `/lider/*` para `/liderado/inicio` no próximo refresh. O sidebar "MINHA EQUIPE" e "Voltar ao Painel RH" só aparecem se `is_workspace_owner=true` OU `isHRAdmin=true` — nenhum dos dois é o caso dela hoje.

A única coisa que ainda quebra é o link de sync antigo que ela recebeu por e-mail (apontando para a linha órfã).

# Plano

## 1. Limpar a linha órfã da Bianca
Deletar `team_members.id = 4a52cc20-cc01-4f93-8d74-4541095379f8`. Bianca permanece corretamente vinculada via `afe577ba…` (status `accepted`, `linked_user_id` setado).

Efeito:
- `/sync/4a52cc20…` passa a mostrar "convite inválido" (esperado — o convite real é o accepted).
- Bianca loga normalmente em `bianca.brand@fstr.co` → cai em `/liderado/inicio` como liderada.

## 2. Auditar Faster inteiro
Já rodei a query — Bianca é o **único** caso de duplicata `(email, team_id)` no workspace Faster. Os outros membros do Guto estão limpos.

## 3. Validar que Bianca enxerga a tela certa
Depois da limpeza, pedir pra Bianca:
1. Fazer logout
2. Logar de novo com `bianca.brand@fstr.co`
3. Deve cair em `/liderado/inicio` (sidebar de liderado, não "MINHA EQUIPE")

## 4. Sobre "me mandar os e-mails por time"
Não é necessário neste momento. O Guto já fez o cadastro corretamente — o problema é apenas a **1 linha órfã** legada criada antes do fix `bulk-onboard` desta sessão. Os próximos bulk-onboards que ele rodar já vão criar com `invite_status='accepted'` direto, sem gerar órfãs.

Se aparecer outro liderado do Faster reclamando da mesma tela ("Bom dia, Fulano" com sidebar de líder), basta reabrir e rodar a mesma auditoria — mas pelos dados atuais isso não deve acontecer.

# Detalhes técnicos

- DELETE single row em `team_members` (RLS via service_role na migration).
- Não mexer em `afe577ba…` nem em `user_roles` de Bianca.
- Não recriar workspace nem teams.
