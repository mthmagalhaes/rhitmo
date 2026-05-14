## Decisão

Aba **Liderados** em `/lider/pessoas` deixa de levar para `/member/:id`. Clicar num liderado abre um **drawer lateral** com o **perfil administrativo** (dados, time, convite, status). Histórico operacional vive nas páginas dedicadas (`/lider/diario`, `/lider/1on1s`, `/lider/avaliacoes`, `/lider/mentor`).

A página `/member/:id` (`MemberDetails.tsx`) **continua existindo** porque ~10 lugares ainda apontam pra ela com deep-links (`?thread=`, `?openMentor=true`, `?openNote=true`, `?tab=reviews&action=new`, BriefPage, MentorHistoryCard, ThreadsList, GlobalSearch, NetworkSignals, Inbox, etc.). Removê-la agora é fora de escopo e quebra fluxos. Ela vira **rota de compatibilidade** acessada só via deep-link, não mais via clique direto na lista de pessoas.

---

## Escopo (somente UI/UX)

### 1. Novo componente: `MemberAdminSheet`
`src/components/leader/MemberAdminSheet.tsx` — drawer lateral (`Sheet` direita, `sm:max-w-lg`) inspirado em `MemberProfileSheet` do HR, mas focado no léxico de líder.

Conteúdo (sem abas, scroll vertical único):
- **Header** — avatar + nome + cargo + email; chip de status (Ativo / Convite pendente / Arquivado).
- **Bloco Identidade** — Nome, Cargo, Email (campos editáveis inline ou botão "Editar" que abre `EditMemberDialog` existente).
- **Bloco Time** — time atual + botão "Mudar de time" (reusa `ChangeTeamDialog` se existir, senão select inline).
- **Bloco Vínculo** — estado da conta:
  - Não convidado → botão "Convidar para o Rhitmo" (abre `InviteMemberDialog`).
  - Convite enviado → "Reenviar convite" + "Copiar link".
  - Vinculado → mostra email vinculado + último acesso.
- **Bloco Ações** — `DropdownMenu` ou botões secundários: Arquivar / Reativar / Excluir.
- **Rodapé "Abrir em…"** — 4 atalhos discretos (link com seta) para os contextos operacionais:
  - "Diário de bordo →" → `/lider/diario?member=:id`
  - "1:1s →" → `/lider/1on1s?member=:id`
  - "Avaliações →" → `/lider/avaliacoes?member=:id`
  - "Rhitmo (chat) →" → `/lider/mentor?member=:id`

Sem timeline, sem feedbacks, sem MentorChat embutido. Sem `Tabs` operacionais.

### 2. `Pessoas.tsx` — aba Liderados
- Trocar `onClick={() => navigate('/member/${m.id}')}` (linha 483) por abrir o drawer com `selectedMemberId`.
- State local: `const [adminSheetMemberId, setAdminSheetMemberId] = useState<string | null>(null)`.
- Renderizar `<MemberAdminSheet open={!!adminSheetMemberId} memberId={adminSheetMemberId} onOpenChange={...} />` no fim da página.
- `MembersGrid` (default behavior `navigate`) — adicionar prop `onMemberClick` que `Pessoas.tsx` passa para abrir o drawer em vez de navegar. Outros consumidores de `MembersGrid` continuam com o comportamento `navigate` padrão.

### 3. `MemberDetails.tsx` — não tocar
Continua atendendo deep-links. Sem alteração visual nem de tabs nessa onda. Quando o usuário entrar via `/lider/diario` etc., já estão nas páginas master-detail corretas — o `MemberDetails` legado só é alcançado via links antigos (Brief, Inbox, threads).

### 4. Telemetria (opcional, leve)
Em `analytics.ts`: adicionar evento `member_admin_sheet_opened` disparado pelo drawer, pra medir uso vs. cliques antigos no `/member/:id`.

---

## Fora de escopo (ondas futuras)

- **Onda 3** — auditar todos os `navigate('/member/${id}')` espalhados (Brief, Inbox, MentorHistory, GlobalSearch, NetworkSignals) e migrar pra rotas operacionais corretas (`/lider/diario?member=`, `/lider/mentor?thread=`).
- **Onda 4** — quando todos os deep-links estiverem migrados, deletar `MemberDetails.tsx` e a rota `/member/:id` em `App.tsx`.
- Garantir que cada página master-detail (`Diario`, `OneOnOnes`, `Avaliacoes`, `Mentor`) aceita `?member=:id` no querystring para pré-selecionar o liderado (já tem em algumas, conferir antes da Onda 3).

---

## Arquivos editados

- **Novo:** `src/components/leader/MemberAdminSheet.tsx`
- **Editado:** `src/pages/lider/Pessoas.tsx` — abre drawer em vez de navegar.
- **Editado:** `src/components/leader/MembersGrid.tsx` — aceitar `onMemberClick` opcional sem quebrar consumidores existentes.
- **(Opcional) Editado:** `src/lib/analytics.ts` — evento `member_admin_sheet_opened`.

**Sem mudança de schema, RLS ou edge functions.**

---

## Validação esperada

- Em `/lider/pessoas` aba Liderados, clicar num card abre drawer lateral com dados administrativos (sem feedbacks, sem 1:1, sem chat).
- 4 atalhos no rodapé do drawer levam para as páginas operacionais com o liderado pré-selecionado.
- Deep-links existentes (`/member/:id?thread=...` do MentorHistoryCard, `/brief/...` → `/member/...`) continuam funcionando.
- Nenhum console error.