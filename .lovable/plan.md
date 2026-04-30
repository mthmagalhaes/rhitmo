# Sprint 10.2 — Self-Review Wizard Conversacional

Liderado preenche autoavaliação via chat passo-a-passo no portal "Meu Painel". Resultado é um INSERT em `performance_reviews` (`review_type='self'`, `author_user_id=auth.uid()`, `shared_with_member=true`), que dispara automaticamente o trigger `ctx_evidence_from_review` (Sprint 10.1) e propaga para o Context Graph do líder.

## Decisões de arquitetura

- **Sem AI/Edge Function** — Sprint 10.2 só faz concatenação Markdown das perguntas+respostas. Sumarização AI fica para Sprint 10.3.
- **Componente isolado**, NÃO reaproveita `MentorChat` (que tem lógica de RAG/threads/tools). Reutilizamos só os padrões visuais (bubbles, ScrollArea, Textarea com Enter-to-send) num componente novo enxuto: `SelfReviewWizard`.
- **Modal full-screen `Dialog`** (padrão do projeto, igual ao `selectedReview` dialog), não rota nova — evita mexer em `App.tsx` e mantém o liderado no contexto do dashboard.
- **Catálogo de perguntas estático** em `src/lib/selfReviewQuestions.ts` (mesmo padrão do `pulseTemplates.ts` da Sprint 9.2). Reutilizável por Slack/AI no futuro.
- **RLS já permite o INSERT**: a policy "Linked members can insert own self upwards reviews" exige `author_user_id = auth.uid() AND review_type IN ('self','upwards')`.

## Arquivos a criar

```text
src/lib/selfReviewQuestions.ts                     # array estático de perguntas
src/components/self-review/SelfReviewWizard.tsx    # modal com fluxo conversacional
src/components/self-review/StartSelfReviewCard.tsx # card de entrada na seção Avaliações Formais
```

## Arquivos a editar

```text
src/components/dashboard/DirectReportDashboard.tsx
  - Filtrar query 'shared-reviews' para excluir review_type='self'
    (selfs vão para uma sub-seção separada para não confundir com avaliações do líder)
  - Adicionar nova query 'my-self-reviews' (apenas review_type='self', author_user_id=user.id)
  - Renderizar <StartSelfReviewCard/> no topo da seção "Avaliações Formais"
  - Listar self-reviews abaixo num accordion/sub-card discreto
src/i18n/locales/pt-BR.json + en.json + es.json    # chaves selfReview.*
```

## Detalhes técnicos

### `selfReviewQuestions.ts`
```ts
export interface SelfReviewQuestion { id: string; question: string; placeholder?: string }
export const SELF_REVIEW_QUESTIONS: SelfReviewQuestion[] = [
  { id: 'q1', question: 'Quais foram as suas maiores entregas/conquistas neste ciclo?',
    placeholder: 'Pense em projetos, resultados, marcos…' },
  { id: 'q2', question: 'Onde você sente que poderia ter tido um desempenho melhor?',
    placeholder: 'Seja honesto consigo mesmo — isto é um espaço seguro.' },
  { id: 'q3', question: 'Quais recursos ou apoios você precisa do seu líder para o próximo ciclo?',
    placeholder: 'Treinamentos, mentoria, ferramentas, mudanças de processo…' },
];
```

### `SelfReviewWizard.tsx` — fluxo
- Estado: `currentStep` (0 → N), `responses: Record<string, string>`, `inputValue`, `submitting`.
- Render: Header com "Auto-avaliação" + barra de progresso (`step/total`), `ScrollArea` com bubbles (system → pergunta atual; user → respostas anteriores), Textarea + botão "Próxima" (Enter envia; Shift+Enter quebra linha).
- Após última resposta: substitui Textarea por banner "Tudo pronto! Revise e gere seu resumo" + Card mostrando preview Markdown via `<ReactMarkdown>` + botão **"Gerar e Enviar Auto-avaliação"**.
- Submit: monta string Markdown:
  ```md
  # Auto-avaliação

  ## {pergunta1}
  {resposta1}

  ## {pergunta2}
  {resposta2}
  …
  ```
  Insert:
  ```ts
  await supabase.from('performance_reviews').insert({
    member_id: linkedMember.id,
    review_type: 'self',
    author_user_id: user.id,
    title: `Auto-avaliação de ${linkedMember.name} - ${format(new Date(), 'dd MMM yyyy', { locale: ptBR })}`,
    content: markdown,
    shared_with_member: true,
    period_type: 'manual',
  });
  ```
- Em sucesso: toast + invalida `['my-self-reviews']` + fecha modal. Trigger `ctx_evidence_from_review` (Sprint 10.1) propaga automaticamente.

### `StartSelfReviewCard.tsx`
- Card destacado `rounded-2xl` com fundo gradiente suave (Sparkles + Lora), texto "Conte sua versão da história" + botão primário "Iniciar Auto-avaliação". Abre `<SelfReviewWizard/>`.
- Mostra contador "X auto-avaliações enviadas" se houver entries em `my-self-reviews`.

### Mudança em `DirectReportDashboard.tsx`
1. Linha 260: adicionar `.neq('review_type', 'self')` na query `shared-reviews` (não quebra reviews legados que têm `review_type='manager'` por default).
2. Adicionar novo `useQuery(['my-self-reviews', linkedMember.id])` filtrando `review_type='self'` e `author_user_id=user.id`.
3. Linha ~755: antes do header "Avaliações Formais", inserir `<StartSelfReviewCard ... />`.
4. Após o map de `sharedReviews`, adicionar sub-seção colapsada "Suas auto-avaliações" listando os selfs (reutilizando o mesmo Card visual, abre `selectedReview` Dialog que já existe — 100% compatível porque é só conteúdo Markdown).

## Riscos & mitigações

| Risco | Mitigação |
|---|---|
| Self review aparecer misturada com manager review na lista | Query principal usa `.neq('review_type', 'self')`; selfs ficam em sub-seção separada. |
| Liderado tentar editar/apagar review depois de enviar | Trigger `performance_reviews_restrict_self_upwards_update` (Sprint 10.1) bloqueia mudança de campos sensíveis. UI desta sprint é write-only. |
| Quebrar tela do líder | Líder vê review via `is_team_leader()` policy + ctx_evidence trigger emite tag `['review','self']` — não toca em código de líder. |
| `linkedMember.name` ausente | Fallback para `linkedMember.email` ou `'Você'` no título. |
| Nada salvo se modal fecha no meio | Aceito para esta sprint (rascunho local-only). Persistência de draft fica para 10.3+. |

## Fora de escopo

- Sumarização AI das respostas (Sprint 10.3 — chamará `ai-router` task `summarize_text`).
- Edição de auto-avaliação após envio.
- Persistência de rascunho entre sessões.
- Notificação Slack/email ao líder quando auto-avaliação é enviada (trigger ctx_evidence + Activity Feed já cobrem visibilidade).
- Upwards review (preencher avaliação sobre o líder) — Sprint 10.4.
- Peer review trigger pelo líder — Sprint 10.5.
