## Aba Pessoas — duas mudanças

### 1) Aba "Liderados" — adicionar Rhitmo Sync na ficha

**Onde:** `src/components/leader/MemberAdminSheet.tsx` (drawer que abre ao clicar num liderado).

**O que adicionar:** uma nova seção "Rhitmo Sync" entre **Vínculo** e **Abrir em…**, exibindo:

- Status (Preenchido em DD/MM/AAAA · Pendente).
- Quando preenchido: cards leves com Cronotipo, Estilo de Feedback, Estilo de Reconhecimento, Motivadores, Manual de Instruções (mesmo conteúdo do HR `MemberProfileSheet`, com componente `InfoCard` reaproveitado).
- Quando vazio: mensagem "Aguardando preenchimento" + botão **Enviar pesquisa**.
- Quando preenchido: botão secundário **Reenviar pesquisa para atualizar** (renova: dispara mesmo email `sync-invite` via `send-transactional-email`, igual `MemberDetails.handleResendInvite`) + botão **Copiar link** (`/sync/:memberId`).

**Como buscar os dados:** `MemberAdminSheet` ainda não tem os campos de Sync. Adicionar `useQuery` interno chamando `supabase.from('team_members').select('work_style_data, chronotype, feedback_style, recognition_style, motivators, user_manual, sync_completed_at').eq('id', member.id)` quando o sheet abre. Sem RPC nova.

**Reset/atualizar contexto:** ao reenviar a pesquisa, o liderado preenche em `/sync/:memberId` e isso já atualiza `team_members.work_style_data` etc. O motor de contexto (mentor chat, avaliações) lê esses campos diretamente — não precisa "rebuild" extra. Texto do botão deixa isso explícito: "Reenviar pesquisa — o novo perfil substitui o atual em todo o Rhitmo (chat, briefs, avaliações)."

### 2) Aba "Convites" — restringir bulk a HR Admin

**Onde:** `src/pages/lider/Pessoas.tsx` (componente `InvitesTab` + integração com `BulkOnboardDialog`).

**Mudança:**

- Botão "Convidar liderados" (header da aba + EmptyState) só aparece se `isHRAdmin || isWorkspaceOwner`.
- Para líder normal: botões mudam para **"Adicionar liderado"** (singular), abrindo o `NewMemberDialog` (mesmo dialog usado no header da página e no Workspace switcher).
- `BulkOnboardDialog` continua montado mas só dispara para HR Admin / Owner.
- `EmptyStateHero` ganha texto adaptado: HR vê "Adicione em massa colando lista de e-mails"; líder vê "Adicione liderados um a um para começar".

**Memória relevante (Workspace Switcher Actions):** já estabelece que `BulkOnboardDialog` é só admin (/admin) e aba Convites — vamos alinhar a aba Convites a esse mesmo padrão para líderes não-admin.

### Não vou mexer

- Página legada `/member/:id` (`MemberDetails.tsx`) — já tem Rhitmo Sync; fica como está. A entrada principal hoje é o sheet, mas a página segue acessível por links diretos.
- `HR MemberProfileSheet` — já tem Rhitmo Sync, sem mudança.
- Schema de banco — nenhuma migração.

Posso seguir?