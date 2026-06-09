🎫 (ticket não aberto — RPC `support_ticket_open` exige super_admin; abrir manualmente pelo painel /admin se quiser rastro)
👤 Afetado: renato.tsukahara@fstr.co (user_id `1e25110a-fcf4-43eb-939b-524313d8cfeb`, workspace da Yas)
📍 Rota: `/forgot-password` → `supabase.auth.resetPasswordForEmail`

## 📌 Sintoma
Renato clicou em "Enviar Link de Recuperação" e recebeu `Erro: email rate limit exceeded` (toast vermelho). Print do Guto.

## 🔎 Causa raiz
Erro vem do **GoTrue (Supabase Auth)**, não do nosso pgmq/`auth-email-hook`. O GoTrue tem um rate limit próprio (`rate_limit.email_sent`) que dispara **antes** de chamar o hook, contando todos os emails de auth (signup + recovery + invite + magiclink + email_change) numa janela móvel.

Evidências:
- `auth.users` mostra `recovery_sent_at = NULL` e `email_confirmed_at = 2026-06-09 18:48:30` (Renato foi recém-confirmado hoje, provavelmente por convite/admin-invite-user). Ou seja, na mesma hora em que o Guto disparou o recovery o Supabase já tinha consumido cota do `email_sent` com o `confirmation` do invite.
- `recovery_sent_at` ficou NULL → a chamada nem chegou a registrar o token de recovery, confirmando bloqueio no GoTrue antes do hook.
- `supabase/config.toml` **não tem** bloco `[auth.rate_limit]`, então valem os defaults do GoTrue (historicamente baixos: ~2-4 emails/hora por projeto em provisionamento padrão).
- Renato resolveu sozinho: `last_sign_in_at = 18:59:19` — ou seja, ele logou direto (provavelmente pelo link do invite) ~50 min depois. **Sem impacto residual no usuário hoje.**

Não tem nada de errado no nosso fluxo de email (Lovable Emails / pgmq / template `recovery.tsx`): o erro é um 429 do GoTrue, que nem passa pela nossa fila.

## 💊 Solução proposta
**Curto prazo (já resolvido para o Renato — ele logou):**
- Sem ação imediata necessária no usuário.

**Médio prazo (para não repetir):**
1. Adicionar `[auth.rate_limit]` em `supabase/config.toml` subindo `email_sent` para algo realista (ex.: 60/hora). Justificativa: como roteamos via `auth-email-hook` → pgmq → Mailgun, o gargalo real é a fila/Mailgun, não o GoTrue.
2. Melhorar a UX do `/forgot-password`: traduzir o `email rate limit exceeded` para PT-BR com mensagem acionável ("Limite temporário de envios. Tente novamente em alguns minutos ou peça ao seu líder para reenviar o convite").
3. Adicionar log estruturado no `ForgotPassword.tsx` (`console.warn` com `error.code`) para conseguirmos correlacionar com `auth_logs` depois.

## ⚠️ Riscos / regressões
- Subir `rate_limit.email_sent` no `config.toml` **regenera o config no próximo deploy** — confirmar que o painel Supabase aceita o valor (alguns planos têm teto). Risco: nenhum no app; risco indireto: se a fila pgmq estiver com problema, mais tentativas de envio podem inflar DLQ — mitigado porque `process-email-queue` já tem retry/TTL configurado.
- Mudar texto do erro não tem risco.

## 🧪 Validação
1. Após bump do limite: pedir 5 recoveries seguidos para um email teste e confirmar `recovery_sent_at` populado em `auth.users` + linha em `email_send_log` com `template_name = 'recovery'`.
2. Conferir que `auth_logs` para `/recover` não retorna mais `status = 429`.
3. Validar mensagem traduzida na tela.

## Detalhes técnicos
- Arquivo a editar: `supabase/config.toml` (adicionar bloco `[auth.rate_limit]` com `email_sent = 60`).
- Arquivo da UX: localizar página de forgot-password (provavelmente `src/pages/ForgotPassword.tsx` ou `src/components/auth/ForgotPassword*`) e mapear `error.message` / `error.code` para mensagem PT-BR.
- Nenhum migration, nenhuma edge function, nenhum RLS.
- Memórias relacionadas: `mem://auth/forgot-password-flow`, `mem://infrastructure/email-messaging-system`, `mem://security/production-auth-policy`.

→ Aplicar agora? (sim aplicar bump+UX / só UX / só bump / mais info)

Used the rhitmo-support skill.
