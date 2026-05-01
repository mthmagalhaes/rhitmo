## Diagnóstico

O dropdown do `WorkspaceSwitcher` hoje dispara `BulkOnboardDialog` (ferramenta de onboarding em massa do RH Admin — CSV, múltiplos workspaces, validações pesadas). Para o **Líder** no fluxo do dia-a-dia, isso é overkill: ele só quer **adicionar 1 liderado**.

Já existe o componente certo: `NewMemberDialog` (`src/components/NewMemberDialog.tsx`) — formulário simples com nome, cargo, e-mail, time, opção de enviar convite DISC. É o mesmo que abre pelo botão "Novo Membro" no Dashboard (`Index.tsx`) e pelo "Novo liderado" do `MemberMasterList`.

## Mudanças

**`src/components/AppSidebar.tsx`**:
1. Trocar import: `BulkOnboardDialog` → `NewMemberDialog`
2. Pegar `workspaceId` do `useAccount()` (já disponível no contexto)
3. Remover a query `sidebar-workspace-names` (não é mais necessária — `NewMemberDialog` não pede `workspaceNames`)
4. Renderizar `<NewMemberDialog open={inviteOpen} onOpenChange={setInviteOpen} workspaceId={workspaceId} />` no lugar do `<BulkOnboardDialog>`
5. Guard: só renderiza se `workspaceId` estiver carregado

**`.lovable/memory/design/sidebar/workspace-switcher-actions.md`**: atualizar a descrição da ação "Convidar membros" para deixar claro que abre o fluxo de **adição individual** (`NewMemberDialog`), não o bulk. O bulk continua existindo para o RH Admin via `/admin` (`AdminStructure`) e dentro da aba "Convites" em `/lider/pessoas`.

## Impacto

- Líder no dia-a-dia: clica "Convidar membros" no dropdown da org → abre form simples de 1 liderado (consistente com "Novo Membro" do dashboard e "Novo liderado" da lista master).
- RH Admin: continua com bulk via painel `/admin` e via aba Convites em Pessoas. Não perde nada.
- Sem novos arquivos, sem mudança de schema. Só troca de componente no sidebar.