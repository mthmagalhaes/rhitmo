## Auditoria — Resultado

A maior parte do checklist já foi resolvida na **Sprint 10.5 (Feedback Ecosystem UX Polish)**. Verifiquei file-by-file e o sistema está robusto:

| Verificação | Status |
|---|---|
| `disabled={submitting}` + spinner em todos os submits | ✅ Pulse, Peer, Self, Upwards |
| Modal fecha + toast + invalidate em sucesso | ✅ Todas as queries certas |
| Bloqueio de fechar overlay durante submit | ✅ `!submitting && onClose()` em todos |
| Cancelar mid-flow sem erro de console | ✅ Wizards com confirm toast; modais simples com botão Cancelar |
| Empty states (`/lider/contexto`, alerts, dashboard) | ✅ Alerts retornam `null`; Contexto tem empty card; Upwards card só renderiza com líder vinculado |
| Reset on open (estado residual) | ✅ Send Pulse + ambos Wizards |
| Rollback em multi-insert (Peer Review) | ✅ Deleta review-pai órfã se convites falham |

## Lacunas pequenas que vou corrigir

### 1. Discard confirmation nos modais de resposta (Pulse + Peer)
Hoje `AnswerPulseModal` e `AnswerPeerReviewModal` descartam silenciosamente respostas digitadas se o usuário clica em "Cancelar" ou fora do modal. Os Wizards (Self/Upwards) já têm confirm via `toast(..., { action: { label: 'Sair', onClick } })`. Vou aplicar o mesmo padrão para consistência: se houver pelo menos uma resposta com texto, perguntar antes de fechar.

### 2. Empty state inline no `SendPulseModal`
Quando o líder não tem liderados, a mensagem "Você ainda não tem liderados diretos" fica escondida **dentro** do dropdown — só aparece se o usuário clicar no Select. Vou aplicar o mesmo padrão do `RequestPeerReviewModal`: card inline visível imediatamente, escondendo o resto do form. Mais discoverable.

### 3. Cleanup
Cabeçalho duplicado em `SendPulseModal.tsx` (linhas 1–4 repetem o mesmo comentário).

## Arquivos a editar
- `src/components/pulse/AnswerPulseModal.tsx`
- `src/components/peer-review/AnswerPeerReviewModal.tsx`
- `src/components/pulse/SendPulseModal.tsx`

## Não vou tocar
- Banco / RLS / triggers (intactos por design).
- Wizards Self/Upwards (já têm o padrão de discard).
- Alerts e Cards de entrada (já bem feitos).
- `/lider/contexto` (empty state já elegante).

## Resumo final
Vou entregar um pequeno PR de polimento em 3 arquivos + um resumo `.lovable/memory/features/performance/feedback-ux-polish.md` atualizado para registrar essa segunda passagem (Sprint 10.6 — sanity check pre-Slack).