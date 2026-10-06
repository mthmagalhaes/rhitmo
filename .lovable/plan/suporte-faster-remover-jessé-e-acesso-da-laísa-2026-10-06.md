# Suporte Faster: remover Jessé e acesso da Laísa

Afetados: guto.biazzi@fstr.co (RH Admin), jesse.silva@fstr.co, laisa.moura@fstr.co. Workspace Faster.

## Diagnóstico (confirmado no banco)

### 1. "Falha ao remover: [object Object]" (Jessé)
- O Jessé tem 4 transcrições que estão ligadas a gravações do bot. Ao apagar o liderado, as transcrições são apagadas junto, mas a ligação com o bot (`recall_bots.meeting_transcript_id`) não tem regra de apagar, e o banco bloqueia a exclusão.
- O aviso mostra "[object Object]" porque a tela não lê a mensagem do erro do banco.
- Guto tem permissão (é RH Admin do workspace). O problema não é de permissão.

### 2. "Processando seu acesso..." infinito (Laísa)
- A Laísa confirmou o e-mail e entrou hoje, mas o cadastro dela continua sem vínculo.
- A trava `tm_guard_self_update` impede quem não é líder/RH de mudar o próprio vínculo. A vinculação automática no login roda "como a própria Laísa", então a trava rejeita. Reenviar o convite não resolve. Afeta **qualquer liderado novo** que entra pela primeira vez, não só ela.

## Correções

1. **Banco**
   - `recall_bots.meeting_transcript_id`: passar para `ON DELETE SET NULL` (o registro de custo do bot fica, só perde a ligação com a transcrição apagada).
   - `tm_guard_self_update`: liberar a única mudança legítima, ou seja, preencher `linked_user_id` quando ele está vazio, com o próprio usuário logado, e o e-mail do cadastro é o mesmo da conta. Todo o resto continua travado.
2. **Tela**: em `HRPessoas.tsx` e `MemberProfileSheet.tsx`, mostrar `error.message` do banco em vez de "[object Object]"; também checar o erro da exclusão de feedbacks.
3. **Dados**: depois da correção, vincular a Laísa (rodar a vinculação dela) e conferir que o Jessé pode ser removido pela tela.
4. **Ticket**: registrar no suporte (TKT) com causa e solução e fechar como resolvido.

## Validação
- Excluir o Jessé pela tela como Guto (ou conferir com uma exclusão simulada que não deixa erro de chave).
- A Laísa fica com o vínculo preenchido; ao recarregar, ela cai no painel de liderado.
- Procurar outros liderados com conta confirmada e sem vínculo, e vinculá-los também.

## Resposta sugerida para o Guto
> Oi Guto! Achei os dois:
> 1. **Jessé**: ele tinha reuniões gravadas pelo bot e o sistema travava a exclusão por causa disso. Já corrigi, pode tentar remover de novo.
> 2. **Laísa**: o convite estava certo. Era uma trava nossa que impedia o primeiro acesso de liderados novos. Corrigi e já liberei o acesso dela, é só ela recarregar a página (ou sair e entrar de novo).
> Valeu pelo aviso, e desculpa o transtorno!
