

# Revisão de qualidade — fluxo de novos usuários

Sem novas features, sem refator estético. Só os problemas reais que afetam o líder novo no primeiro cadastro.

## Mudanças (6 arquivos)

### 1. `src/components/NewMemberDialog.tsx` (linha 391)
`plano Flow` → `plano Pro`

### 2. `src/components/NewReviewDialog.tsx` (linhas 320 e 398)
`Faça upgrade para Flow.` → `Faça upgrade para Pro.` (2 ocorrências)

### 3. `src/pages/MemberDetails.tsx`
- Linha 430: `navigate('/')` → `navigate('/dashboard')` (Membro não encontrado mandava para landing pública)
- Linha 550: `Disponível no plano Flow ou superior` → `Disponível no plano Pro`

### 4. `src/i18n/locales/pt-BR.json`, `en.json`, `es.json` (linha 539, chave `syncLocked`)
- PT: `🔒 Disponível no plano Pro.`
- EN: `🔒 Available on the Pro plan.`
- ES: `🔒 Disponible en el plan Pro.`

### 5. `src/pages/Index.tsx`
- **Badge do plano (linha 502-509)**: usar `usePlanLimits().limits.isBetaUser` para mostrar badge "Beta" (estilo destacado roxo) quando `is_beta_user=true`. Renderizar `business` como "Pro" no rótulo.
- **handleOpenMentor (linha 431-433)**: quando `teamMembers.length === 0`, mostrar toast "Adicione o primeiro membro para conversar com o Mentor sobre ele" + abrir `setMemberDialogOpen(true)`. Remove o botão morto.
- **Empty state sem workspace (linha 669-670)**: trocar copy genérica "Sem conteúdo disponível" por loader (caso raro mas trivial).

### 6. `src/pages/NotFound.tsx` (reescrever)
Padronizar com brand Rhitmo:
- `RhitmoLogo` no topo
- Copy em PT: "Página não encontrada" / "Não encontramos o endereço que você tentou acessar"
- Dois CTAs: "Voltar ao Dashboard" (`/dashboard`, primário) e "Ir para a Home" (`/`, outline)
- Standalone (sem AppLayout — catch-all pode ser hit sem auth)

## O que NÃO vou mudar

- `usePlanLimits.ts` — lógica correta (Pulse default, beta opt-in via DB).
- `AccountContext`, `AuthContext`, `AuthEventProvider` — sólidos, sem race conditions.
- `WorkspaceOnboarding` — funciona, leader-welcome com idempotency OK.
- Guards (`DirectReportGuard`, `HRAdminGuard`) — corretos.
- Reset password / Auth — fluxo end-to-end OK.
- Sidebar, navegação, rotas — todas resolvem.
- Mobile — sem overflow detectado, classes responsivas presentes.

## Critério de aceite

- [ ] Buscar `Flow` em `src/` retorna **0** ocorrências em copy user-facing
- [ ] Badge no dashboard mostra "Beta" se `is_beta_user=true`, "Pro" para tier business legado, "Pulse" caso contrário
- [ ] Clicar "Abrir Mentor" sem membros abre o diálogo de novo membro com toast explicativo
- [ ] `/rota-inexistente` mostra 404 com branding Rhitmo, em PT, com botão "Voltar ao Dashboard"
- [ ] `Membro não encontrado` em `/member/:id` vai para `/dashboard`, não `/`

