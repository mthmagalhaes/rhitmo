# Teste grátis sem atrito, sem vazamento de custo e com conversão ativa

Três frentes, nesta ordem. Cada uma pode ir ao ar sozinha.

## 1. Atrito no cadastro (e-mail vs. Google)

O que já existe: botão do Google, aviso de "e-mail ainda não confirmado" com reenvio no login. O que falta é o momento logo depois do cadastro por e-mail: hoje aparece só uma notificação rápida que some, e o lead fica sem saber o que fazer.

- **Google como caminho principal:** no cadastro, "Continuar com Google" vira o botão grande do topo; e-mail e senha ficam abaixo de um divisor "ou com e-mail".
- **Tela "Confira seu e-mail"** no lugar da notificação: mostra o e-mail digitado, botões "Abrir Gmail" e "Abrir Outlook", "Reenviar link" (com espera de 60s) e "Usei o e-mail errado".
- **Volta sem novo login:** o link do e-mail leva direto para o início já autenticado (hoje aponta para uma rota antiga).
- **Para você no painel admin:** marcar quem se cadastrou e ainda não confirmou o e-mail há mais de 1 hora, para um toque manual.

## 2. Blindagem de custo do bot de reunião

O que já existe: bot automático só em 1:1 (reuniões de time só quando o líder liga), e limite de 6h no teste quando o líder clica em "Enviar agora".

Encontrei um furo: **o bot automático da agenda não confere o limite de horas nem se o teste já acabou.** Ele é enviado direto, então um lead com teste vencido ou com 6h gastas continua consumindo bot.

- **Fechar o furo:** o envio automático passa pela mesma regra do envio manual (teste ativo ou add-on, e horas restantes). Sem direito, a reunião aparece com "Sem horas de bot" em vez de mandar o bot.
- **Bot sai sozinho:** sair quando todos saírem da sala (após 2 min) e teto de 90 min por reunião. Hoje só existem regras para sala de espera e sala vazia no começo.
- **Aviso aos 80%:** ao chegar em ~4,8h, aviso no app sugerindo conectar o Granola (custo zero para a Rhitmo) ou assinar o add-on.
- **Granola em destaque no teste:** no card de próximas 1:1s e na tela de Conectores, um destaque "Já usa Granola? Conecte e transcreva sem gastar horas de bot".

## 3. Conversão do teste: e-mails por marco

Enviados por `notify.rhitmo.co`, um por pessoa, cada um disparado pelo que aconteceu com aquele líder. Nada de lista ou campanha.

| E-mail | Quando | Conteúdo |
|---|---|---|
| Boas-vindas (já existe) | Cadastro | Mantido, com link "prepare sua primeira 1:1 em 2 min" |
| Primeira evidência | 1ª anotação ou transcrição registrada | O que a Rhitmo já extraiu e o próximo passo |
| Faltam 4 dias | Dia 10 do teste | Resumo do que o time acumulou (anotações, 1:1s, pautas) + botão para assinar |
| Último dia | Dia 13 do teste | Histórico fica preservado ao assinar + botão para assinar |

- Só vai para quem está em teste e ainda não assinou. Quem assinou não recebe os dois últimos.
- Cada e-mail sai no máximo uma vez por líder.
- O rodapé de descadastro é automático e não pode ser removido.

## Detalhes técnicos

**Frente 1**
- `src/components/Auth.tsx`: reordenar OAuth como CTA primário; após `signUp` com sucesso, renderizar estado `awaitingConfirmation` (componente novo `CheckEmailPanel`) reaproveitando a lógica de `resend` + cooldown já existente; `emailRedirectTo` passa a `${origin}/auth` (AuthPage já roteia por persona).
- Admin: coluna/filtro "não confirmado > 1h" via RPC security definer restrita a super admin lendo `auth.users.email_confirmed_at`.

**Frente 2**
- Extrair a checagem de direito/horas de `schedule-recall-bot` para `_shared/botEntitlement.ts` e chamá-la em `fetch-calendar-events` antes do POST à Recall; se negar, gravar `upcoming_meetings.bot_blocked_reason` (migração pequena) e exibir no `UpcomingMeetingsCard`.
- `automatic_leave` nos dois caminhos: adicionar `everyone_left_timeout` (120s) e teto de duração (`recording_permission`/limite de duração da Recall, conferir parâmetro exato na doc antes).
- Aviso 80%: nudge in-app (`leader_nudges`) disparado pelo `recall-webhook` ao fechar um bot quando o acumulado passar de 80% do teto; idempotente por janela.

**Frente 3**
- `email_domain--` já configurado; adicionar templates `trial-first-evidence`, `trial-ending-4d`, `trial-last-day` no registry (estilo dos existentes, corpo `#ffffff`).
- Tabela `trial_email_log (workspace_id, user_id, template, sent_at, unique(user_id, template))` com GRANT só para `service_role` e RLS ligada.
- Edge function `trial-drip-cron` (cron diário 12 UTC, `x-cron-secret`): seleciona workspaces `billing_model` novo, `trial_ends_at` em +4d / +1d, sem assinatura ativa; envia para o líder dono via `sendAppEmail` com `idempotencyKey = template:user_id`.
- "Primeira evidência": gatilho no mesmo cron a cada execução (checa primeira linha em feedbacks/transcrições após o cadastro) para não acoplar envio a triggers de banco.
- Deploy: `trial-drip-cron`, `preview-transactional-email`, `fetch-calendar-events`, `schedule-recall-bot`, `recall-webhook`.

## Fora deste plano
Alerta "lead quente" no Slack/WhatsApp e modo de dados de exemplo para RH ficam para depois.
