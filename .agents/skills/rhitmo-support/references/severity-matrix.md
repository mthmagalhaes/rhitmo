# Severity Matrix

Critérios objetivos. Em dúvida, **sobe** a severidade.

| Nível | Definição | Exemplos |
|---|---|---|
| **critical** | Perda de dado, vazamento entre workspaces, login totalmente quebrado, cobrança/Stripe quebrada, RLS exposto. **Pare tudo.** | HR Admin vê dado de outro workspace; transcript de 1:1 leaked; webhook Stripe falhando 24h. |
| **high** | Feature core bloqueada para um usuário ou workspace inteiro; sem workaround. | Líder não consegue criar feedback; Slack DM não responde; convite expira em 100% dos casos. |
| **medium** | Feature degradada, workaround existe, afeta poucos usuários. | Reenviar convite funciona mas botão pisca; recap gera mas sem citações. |
| **low** | Cosmético, copy errado, UX confuso sem perda funcional. | Badge "Convite pendente" em verde; tooltip cortado no mobile. |

## Sinais que forçam `critical`
- Qualquer query retornando linhas de `workspace_id` diferente do esperado.
- `feedbacks`/`meeting_transcripts`/`context_evidence` visíveis a quem não devia.
- Auth retornando sessão de outro user.
- Service role chamado sem ownership check (ver `mem://security/edge-function-ownership-pattern`).

## Sinais que forçam `high`
- Erro 500 reproduzível na rota afetada.
- Edge function com `>10%` de erro nas últimas 24h.
- RLS bloqueando UPDATE/INSERT legítimo de papel correto.
