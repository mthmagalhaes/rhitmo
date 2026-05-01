
# Sanity Check — Pulse & 360º (Sprint 10.5 — UX Polish)

Atuei como UX engineer e fiz um diff completo da "fiação" do frontend dos módulos Pulse, Self-Review, Peer Review e Upwards Review. Encontrei 8 pontos a corrigir, todos do lado do **frontend** (DB intocado).

## O que está ÓTIMO (sem mexer)
- `SelfReviewWizard`, `UpwardsReviewWizard`, `RequestPeerReviewModal`, `AnswerPeerReviewModal`: `disabled={submitting}` correto nos botões de submit.
- `/lider/contexto`: empty state com ícone + copy ("Sem evidências..."), loading com 5 skeletons, error state dedicado. ✓
- `PendingPulseAlert` / `PendingPeerReviewsAlert`: retornam `null` quando vazio (não quebram layout). ✓
- Toasts de sucesso/erro presentes em todos os submits.
- Invalidações de `pending-pulse-surveys`, `pending-peer-reviews`, `my-self-reviews`, `my-upwards-reviews` corretas.

---

## Furos encontrados e correções

### 1. `/lider/pulse` e `/liderado/pulse` são páginas "fantasma" duplicadas
- `/lider/pulse` → `EmptyState` "Em breve" enquanto o Pulse JÁ funciona via `/lider/contexto`.
- `/liderado/pulse` → wrapper que renderiza `<Index/>` (= dashboard inteiro). Confuso.
- **Fix**: transformar `/lider/pulse` num hub funcional listando Pulses enviados (status pending/completed) para o líder ver respostas e re-enviar. Para `/liderado/pulse`, manter wrapper mas com `activeTab='visao-geral'` (onde o `PendingPulseAlert` aparece) e adicionar banner explicativo se não houver pulses.

> **Decisão pragmática**: como reescrever `/lider/pulse` é fora de escopo desta auditoria, vou **redirecionar** ambas as rotas para os locais reais (`/lider/contexto` e `/liderado` respectivamente) com `<Navigate replace />`. Remove a confusão sem reescrever feature.

### 2. `AnswerPulseModal` permite fechar enquanto envia
- `onOpenChange={(o) => !o && onClose()}` ignora `submitting`.
- **Fix**: adicionar guarda `!submitting` (igual aos modais de peer/self/upwards).

### 3. `SendPulseModal` não reseta estado ao fechar e fecha durante submit
- Sem guarda `!submitting` no overlay close.
- Estado (`memberId`, `pulseType`) só é resetado no submit bem-sucedido — se usuário cancelar, na próxima abertura aparece com seleções antigas.
- **Fix**: bloquear `onOpenChange` durante `submitting`; resetar form no `useEffect` quando `open` vira true.

### 4. `AnswerPeerReviewModal` não invalida `team-timeline`
- Sprint 10.1 criou trigger `ctx_evidence` para peer review respondida → cai no feed de `/lider/contexto`. Sem invalidação, líder precisa F5.
- **Fix**: adicionar `invalidateQueries({ queryKey: ['team-timeline'] })` após sucesso.

### 5. Auto-scroll quebrado nos Wizards (Self + Upwards)
- Código atual: `scrollRef = useRef<HTMLDivElement>(null)` passado como `ref={scrollRef as never}` para `<ScrollArea>` (shadcn/Radix). Esse ref vira o **root** do componente Radix, não o viewport interno. `scrollTop = scrollHeight` não rola nada — usuário tem que rolar manualmente quando aparece nova mensagem.
- **Fix**: trocar `<ScrollArea>` por um `<div>` simples com `overflow-y-auto`, mantendo `ref` no próprio div. Mais leve e o auto-scroll passa a funcionar.

### 6. Wizards Self/Upwards: sem botão "Cancelar" mid-flow
- Durante perguntas (antes do `reviewMode`), só dá pra sair clicando no X do Dialog. Em mobile o X é pequeno.
- **Fix**: adicionar botão fantasma "Sair" ao lado do textarea (mid-flow), com `confirm` leve via `toast` se já houver respostas.

### 7. `RequestPeerReviewModal`: empty states escondidos
- Quando `targets` retorna vazio, mensagem só aparece DENTRO do `<SelectContent>` aberto. Usuário pode pensar que está carregando.
- **Fix**: mostrar bloco de empty state inline (acima do Select) quando `targets.length === 0 && !loadingTargets`, escondendo o select.

### 8. `useLeaderInfo`: lookup de nome do líder sem escopo de workspace
- `team_members` filtrado só por `linked_user_id` + `.limit(1)` — em multi-workspace pode trazer nome de outro tenant.
- **Fix**: aceitar `workspaceId` opcional (vindo de `useAccount`) e adicionar `.eq('workspace_id', workspaceId)` quando disponível. Fail-soft mantido.

---

## Ações também aplicadas (pequenas)

- **`/liderado/avaliacoes`** (aba "Para revisar"): hoje renderiza `<Index/>` inteiro. Vou trocar por instrução clara apontando o usuário ao Dashboard ("Visão geral") para evitar duplicação visual da dashboard inteira dentro de uma tab.
- **DirectReportDashboard — header da seção "Avaliações Formais"**: reordenar para que reviews do líder apareçam ANTES dos cards de iniciar self/upwards (consumir antes de produzir é mais natural).

---

## Arquivos editados

| Arquivo | Mudança |
|---|---|
| `src/pages/lider/Pulse.tsx` | Redirect para `/lider/contexto` |
| `src/pages/liderado/Pulse.tsx` | Redirect para `/liderado` (dashboard) |
| `src/pages/liderado/Avaliacoes.tsx` | Tab "Para revisar" vira EmptyStateHero apontando para o dashboard |
| `src/components/pulse/AnswerPulseModal.tsx` | Guarda `!submitting` no close |
| `src/components/pulse/SendPulseModal.tsx` | Guarda `!submitting` + reset de estado on open |
| `src/components/peer-review/AnswerPeerReviewModal.tsx` | Invalida `team-timeline` |
| `src/components/peer-review/RequestPeerReviewModal.tsx` | Empty state inline para "sem liderados" |
| `src/components/self-review/SelfReviewWizard.tsx` | Substitui ScrollArea + adiciona botão Sair mid-flow |
| `src/components/upwards-review/UpwardsReviewWizard.tsx` | Idem acima |
| `src/hooks/useLeaderInfo.ts` | Filtra por `workspace_id` quando disponível |
| `src/components/dashboard/DirectReportDashboard.tsx` | Reordena seção "Avaliações Formais" |

## O que NÃO vou tocar
- Banco de dados / RLS / triggers (intactos por diretriz).
- Tipos do Supabase (auto-gerados).
- Lógica de `useEffectiveUser`, `AccountContext`, `useAuth`.
- Sidebar / navegação principal (já remove `/lider/pulse` da relevância via redirect).

Após aprovar, aplico tudo e gero o resumo final das melhorias.
