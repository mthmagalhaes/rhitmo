## Investigação prévia

- **RPC `get_team_timeline`**: existe, assinatura bate com `useTeamTimeline`, retorna 10 evidências em 6 membros para o workspace do Matheus. Hook usa `safeRpc` corretamente. **Não há bug funcional óbvio** — o feed deve estar carregando. Precisa de validação visual no preview para confirmar se o sintoma é "vazio", "trava", "erro" ou apenas "parece vazio porque os filtros chips/membros estão zerados".
- **Tabela** se chama `context_evidence` (não `ctx_evidence`).
- **Avaliações** (`/lider/avaliacoes`) é uma tela de seleção de liderado — a lista real de reviews vive em `PerformanceReviewList` dentro de `MemberDetails`. O agrupamento por status precisa ir lá.
- **MentorChat** (`src/components/MentorChat.tsx`) tem estado vazio (`messages.length === 0`) e textarea único — local natural para a Prompt Gallery acima do input quando não há mensagens.
- **Settings** (`/lider/configuracoes`) já usa `PageTabs` (Profile, Workspace, Billing, Integrações, Help) com cards verticais — viável virar grid 2-col.

## P0 — Diagnóstico do feed `/lider/contexto`

Não vou alterar a RPC sem evidência de falha. Plano:

1. Adicionar **logging defensivo** (apenas em dev) no `useTeamTimeline` para imprimir `error.message` no console quando a RPC falhar — hoje o erro é engolido pelo `useInfiniteQuery` e só aparece via `isError`.
2. Melhorar o **estado de erro** da página: hoje mostra mensagem genérica. Trocar por mensagem que inclua `error.message` truncado (visível só quando `import.meta.env.DEV`) para o usuário poder reportar o sintoma exato.
3. Garantir que o **estado vazio** distingue dois casos:
   - Sem evidências para o workspace (mostrar CTA "Crie uma nota no Diário").
   - Filtros aplicados sem resultado (mostrar "Limpar filtros").
4. Solicitar ao usuário que abra `/lider/contexto`, abra o DevTools e nos diga o sintoma se ainda persistir após esse hardening — sem sintoma concreto, qualquer alteração na RPC é especulativa.

## P1 — Fusão Pulse ↔ Contexto

Decisão: manter o redirect `/lider/pulse → /lider/contexto`, mas adicionar contexto explícito na primeira visita.

1. No header de `/lider/contexto`, **adicionar um banner dismissível** (uma vez por usuário, persistido em `localStorage`) com texto curto:
   > "Pulse vive aqui dentro: toda resposta vira evidência no Context Graph. Use o botão **Enviar Pulse** acima."
2. No `AppSidebar`, mudar o label da entrada do menu de **"Pulse"** para **"Pulse"** com tooltip "Disparar e acompanhar dentro do Contexto" (ou simplesmente remover o item separado e deixar só "Contexto" — confirmar no comentário do plano qual o usuário prefere; default = manter item com tooltip).
3. Adicionar um **`SourceFilterChip`** dedicado para `pulse_responses` na barra sticky se já não existir, para o líder filtrar só pulses.

## P1 — Prompt Gallery no Mentor Chat

Adicionar uma **galeria de 4–6 prompts** que aparece **apenas quando `messages.length === 0`** (nenhuma conversa ativa):

- "Resuma o último mês de [liderado]" (com seletor inline de liderado)
- "Sugira pauta para o próximo 1:1 com [liderado]"
- "Quais padrões de feedback aparecem na minha equipe nos últimos 30 dias?"
- "Quem está em risco de churn esta semana?"
- "Identifique contradições entre o que falei nas 1:1s e meu Mirror"
- "Liste ações pendentes ainda não resolvidas"

Implementação:
- Novo componente `src/components/mentor/PromptGallery.tsx` — grid 2-col de cards `rounded-2xl` (Bento style), ícone + título + descrição curta.
- Quando o usuário clicar, popula o `input` do MentorChat (e expande o `[member]` para um `Select` simples se o template precisar).
- Renderizado dentro do `MentorChat.tsx` no estado vazio, acima do input.

## P2 — Skeletons consistentes

Trocar `<Loader2 className="animate-spin">` por `<Skeleton>` nas telas-chave:

- `PerformanceReviewList` (linhas 78–84): 3 cards skeleton de altura `h-24`.
- `MembersGrid` (em `Pessoas.tsx` e `Avaliacoes.tsx`): 6 cards skeleton.
- `Contexto.tsx` já usa Skeleton — manter.

## P2 — Agrupamento por status em Avaliações

Refatorar `src/components/PerformanceReviewList.tsx`:

- Derivar 3 grupos: **Em rascunho** (`shared_with_member !== true && !acknowledged_at`), **Compartilhada** (`shared_with_member === true && !acknowledged_at`), **Confirmada** (`acknowledged_at !== null`).
- Renderizar cada grupo como um `<Collapsible>` (radix collapsible já no projeto) com header tipo `Em rascunho · 2`, default `open` para "Em rascunho" e "Compartilhada", `closed` para "Confirmada".
- Ordenação interna mantém `created_at desc`.
- Ajustar query para selecionar também `acknowledged_at`.

## P3 — Settings como grid de cards

Refatorar `src/pages/lider/Configuracoes.tsx`:

- Manter `PageTabs` na navegação top.
- Dentro de cada aba, transformar a lista vertical de cards em um `grid grid-cols-1 md:grid-cols-2 gap-4` (já é cards, só falta a coluna).
- Itens curtos (Workspace ID, Profile button) ficam em cards `min-h-[140px]`; itens densos (Billing, Integrações) ocupam `md:col-span-2`.

## Ordem de execução

1. P0 (logging + estados de erro/vazio em Contexto) — 10 min
2. P1 Pulse banner + tooltip — 10 min
3. P1 Prompt Gallery — 25 min
4. P2 Skeletons — 10 min
5. P2 Agrupamento Avaliações — 20 min
6. P3 Settings grid — 15 min

Sem migrações de banco, sem mudança de RPC. Apenas frontend. Risco baixo de regressão.

## Detalhes técnicos

- Banner dismissível: `localStorage.setItem('rhitmo:contexto-pulse-banner-dismissed', '1')`.
- Prompt Gallery: novo componente, sem mudança no hook do Mentor.
- Collapsible groups: usar `@/components/ui/collapsible` (já presente).
- Skeletons: usar `@/components/ui/skeleton` (já presente).
- Sem mudança em RLS, RPCs ou Edge Functions.