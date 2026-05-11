---
name: Slack Conversational-First Behavior
description: Rhitmo no Slack age como Chief of Staff conversacional — menus e welcomes não são enviados automaticamente; respostas vêm da LLM
type: feature
---

# Slack Conversational-First (anti-flood)

## Princípio
A Rhitmo no Slack é Chief of Staff: responde em linguagem natural via LLM, sem
floodar o DM com menus, listas de comandos ou cards repetidos de "Conectar Conta".
Botões e menus são exceção, acionados apenas por intenção explícita do usuário.

## Regras (slack-bot/index.ts)
- **`app_home_opened`** → NÃO posta nada. Apenas log. Abrir/reabrir a aba Mensagens nunca dispara DM.
- **DM autenticada sem conversa ativa** → auto-cria `general_chat` (Sprint 18) e responde via Lovable AI Gateway. Se por qualquer motivo cair no fallback, o bot fica em silêncio (não posta menu).
- **DM não-autenticada** → 1 mensagem curta com botão "Conectar Conta" (1×/7d via `slack_app_home_throttle.last_dm_menu_sent_at`). Sem header, sem listas de comandos, sem context footer.
- **`/rhitmo`** → resposta curta e conversacional ("Sou a *Rhitmo*… é só me pedir em linguagem natural"). Nada de seções "Comandos rápidos" ou "No Rhitmo Web". Botões mínimos por persona (Nota/Kudos para líder, Meu PDI para liderado, Dashboard HR para hr_admin).
- **`prep_1on1_brief` (botão "Gerar Pauta")** → responde apenas com a pauta/brief em ephemeral. Não dispara menu nem onboarding.

## Por quê
Comportamento anterior empilhava: menu grande do app_home + menu da DM + 3× "Conecte sua conta" toda vez que o líder clicava em "Gerar Pauta" de uma 1:1.
A documentação da app store / aba Sobre do Slack já cobre "o que a Rhitmo faz" — não precisamos repetir isso na DM.
