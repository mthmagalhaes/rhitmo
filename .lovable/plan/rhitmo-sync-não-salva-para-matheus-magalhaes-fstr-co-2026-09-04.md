# Rhitmo Sync não salva para matheus.magalhaes@fstr.co

## O que já foi verificado no banco (agora)

- Existe **um único** cadastro dele como liderado: time "C-Level" (líder: outro usuário), sem arquivamento, vínculo de login correto.
- As regras de acesso da tabela de pessoas permitem que o próprio liderado atualize a sua linha, e as permissões da API estão concedidas.
- Os gatilhos que rodam nessa atualização (aviso ao líder, proteção de campos privilegiados, duplicidade) não bloqueiam essa gravação em teoria: os que travam só disparam quando muda time, cargo ou vínculo — o que não é o caso.
- O caminho funciona para outras pessoas: há 10 avisos de mudança de Sync gerados, o último em 11/08.
- O cadastro dele nunca foi atualizado desde 02/06.

Ou seja: **a causa ainda não está confirmada**. Os registros do banco desse período não estão disponíveis para consulta e a tela hoje engole a mensagem real do erro, mostrando só "Erro ao salvar. Tente novamente." Sem a mensagem original é chute.

## Plano

### 1. Mostrar o erro de verdade (primeiro passo, obrigatório)
Na janela "Atualizar Sync" do painel do liderado, parar de descartar o erro: exibir o código e a mensagem devolvida pelo banco no aviso vermelho e registrar tudo no console (código, mensagem, detalhe, dica, id do cadastro, id do usuário).

Com isso, na próxima tentativa dele temos a causa exata em uma linha.

### 2. Corrigir conforme o que a mensagem apontar
Três hipóteses já mapeadas, cada uma com correção pronta:

| Mensagem | Causa | Correção |
|---|---|---|
| "violates row-level security" / 403 | a sessão dele resolve para outra identidade no momento da gravação | ajustar a regra de acesso para aceitar também o vínculo do próprio usuário sem depender da identidade derivada |
| "not-null" / erro ao avisar o líder | o aviso automático ao líder falha e derruba a gravação inteira | tornar o aviso tolerante a falha, para nunca impedir o liderado de salvar |
| 401 / "JWT expired" | sessão vencida na hora do envio | renovar a sessão antes de gravar e repetir uma vez |

### 3. Blindagem que vale em qualquer cenário
Independente da causa, a gravação do Sync não deve depender de um efeito colateral (o aviso ao líder). Vou proteger esse trecho para que uma falha no aviso não cancele a gravação dos dados do liderado.

### 4. Validação
- Ele reabre a janela, salva e me manda o que aparece (ou o console).
- Depois do fix, conferimos no banco que o cadastro dele tem data de atualização de hoje e que o líder recebeu o aviso de mudança.

## Notas técnicas

- Tela: `src/components/dashboard/DirectReportDashboard.tsx`, função `handleSaveSync` (update em `team_members` filtrando por `id`).
- Regras: política `tm_update` usa `rls_check_member_access(team_id) OR linked_user_id = effective_user_id()`; gatilhos `tm_guard_self_update` (SECURITY DEFINER) e `notify_leader_sync_change` (AFTER UPDATE, insere em `rhitmo_sync_notifications`, que tem RLS ativa e **nenhuma policy de INSERT** — hoje passa por ser SECURITY DEFINER com owner `postgres` e RLS não forçada, mas é frágil).
- Ticket de suporte será aberto com `support_ticket_open` e atualizado para `diagnosed` / `resolved` conforme o fluxo.
- Nenhuma migração destrutiva; qualquer ajuste de política é aditivo.
