# Líder e liderado ao mesmo tempo

## O que a investigação mostrou

Confirmado: hoje o produto **não** suporta a mesma pessoa ser líder e liderada.

O caso do Matheus (`matheus.magalhaes@fstr.co`, workspace **Faster**) prova isso:

- Ele é `leader_user_id` de 4 times: CreativeOps, Expansão, Business Ops, Customer Success.
- Ele **também** tem um registro de liderado real no time C-Level, com `linked_user_id` apontando para a conta dele, `invite_status = accepted`, sob o líder Vitor (`vitor@fstr.co`).

Mesmo assim, o Rhitmo nunca mostra o lado "liderado" dele. A função `get_account_context` só preenche `linked_member` quando o usuário **não** é owner nem líder:

```text
IF NOT (v_is_owner OR v_is_leader) THEN
   ... busca o registro de liderado ...
END IF
```

Consequência prática: para o Matheus, `linked_member` volta `NULL`, `isLinkedMember` é falso, e ele não enxerga as 1:1s que o Vitor registra com ele, nem a autoavaliação, nem o Meu Rhitmo dele. O vínculo existe no banco, mas fica invisível.

O switch de modo que já existe (`useActiveMode`) só conhece dois modos: `leader` e `company` (Owner/HR). Não existe modo "liderado".

Observação lateral, sem bug: `team_members.user_id` guarda quem **criou** o registro, não quem é a pessoa. Quem representa a pessoa é `linked_user_id`. Os registros da Faster com `user_id` do Guto são só autoria de criação em lote.

## O que fazer

### 1. Deixar o vínculo sempre visível

Alterar `get_account_context` para sempre resolver o registro de liderado (`linked_user_id = usuário`, não revogado), independentemente de a pessoa ser líder ou owner. O JSON de retorno passa a ter o `linked_member` preenchido nesses casos.

Risco controlado: hoje vários pontos do app tratam "tem linked_member" como "é liderado, mande pra `/liderado/*`". Por isso o passo 2 é obrigatório junto com o passo 1, na mesma entrega.

### 2. Terceiro modo: "Minha visão como liderado"

- `ActiveMode` ganha o valor `member`, além de `leader` e `company`.
- `resolvePersona` deixa de inferir persona só por "tem vínculo": passa a decidir por modo ativo quando a pessoa tem mais de um chapéu.
  - Só vínculo, sem time liderado, sem Owner/HR → `direct_report` (comportamento atual, intacto).
  - Líder/Owner **com** vínculo → modos disponíveis incluem `member`; a persona segue o modo escolhido, com padrão em `leader`.
- O seletor no menu da organização (`WorkspaceSwitcher`) passa a listar a terceira opção quando aplicável.

### 3. Não empurrar líder para o wizard de onboarding

`DirectReportGuard` hoje manda para o onboarding sempre que existe vínculo com `skills_data` incompleto. Passa a fazer isso apenas quando a persona resolvida é `direct_report` — um líder que também é liderado não pode ser sequestrado pelo wizard ao entrar em `/lider/*`.

### 4. Ajustar os consumidores que assumem exclusividade

Trocar as checagens diretas de `isLinkedMember` por persona resolvida em: `RoleRouteGuard`, `AppSidebar`, `AppLayout`, `Index.tsx`, `ActivityBadge`, `ActivitySheet` e `NotificationsTab`. Assim o mesmo usuário vê a caixa de atividades e as preferências de notificação corretas conforme o modo em que está.

### 5. Validação

- Matheus em `/lider/*`: continua líder, sem wizard, com os 4 times.
- Matheus troca para "Minha visão como liderado": vê `/liderado/inicio` com a ficha do C-Level e as 1:1s com o Vitor.
- Liderado puro (ex.: Laís): nada muda, sem terceiro modo no seletor.
- Owner/HR sem vínculo (ex.: Vitor): continua com `leader` + `company` apenas.
- Isolamento: o modo é só de navegação — nenhuma política de acesso do banco muda, então o líder continua sem ver o diário privado do Vitor sobre ele, exceto o que foi compartilhado.

## Detalhes técnicos

- Migração: `CREATE OR REPLACE FUNCTION public.get_account_context` (SECURITY DEFINER, `plpgsql`), removendo a condicional que suprime `linked_member` para líderes/owners. Nenhuma tabela, coluna ou política muda.
- Frontend: `src/contexts/AccountContext.tsx`, `src/lib/navigation.ts` (`ActiveMode`, `resolvePersona`, `getHomeRoute`), `src/hooks/useActiveMode.ts`, `src/components/RoleRouteGuard.tsx`, `src/components/DirectReportGuard.tsx`, `src/components/AppSidebar.tsx`, `src/components/AppLayout.tsx`, `src/components/sidebar/WorkspaceSwitcher.tsx`, `src/pages/Index.tsx`, `src/components/ActivityBadge.tsx`, `src/components/ActivitySheet.tsx`, `src/components/settings/NotificationsTab.tsx`.
- Sem impacto no v2: `/v2/*` não usa persona de liderado.
