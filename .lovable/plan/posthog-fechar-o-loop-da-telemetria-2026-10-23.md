# PostHog: fechar o loop da telemetria

## O que já é registrado hoje
- Cadastro (início, concluído, falhou), primeiro liderado convidado, convites, tour guiado, limites de plano.
- Visitas de página, mensagem enviada à Rhitmo, Espelho rodado, sugestão do Espelho aplicada, AI Magic usado.

## O que vamos adicionar
1. **Avaliação formal (funil completo)**
   - Avaliação criada (com o modo: Institucional ou Rascunho livre).
   - Etapas concluídas: Cultura, Sinais & Rede, Rascunho Geral pronto.
   - Avaliação compartilhada com o liderado (o fim do funil principal).
   - Avaliação confirmada pelo liderado.
2. **Pergunte à Rhitmo**: resposta interrompida no "Parar".
3. **Anotações**: nova anotação criada, indicando só a origem (texto, print, PDF, Magic Paste).
4. **Conectores**: conector ligado e desligado (só o nome do serviço).
5. **Ativação**: primeiro uso de cada marco (primeira anotação, primeira avaliação compartilhada) para ver quem realmente engajou.

## Funis prontos para montar no PostHog
- Cadastro → primeiro convite → primeira anotação → primeira avaliação compartilhada.
- Avaliação criada → Cultura → Sinais → Rascunho → Espelho → compartilhada (mostra onde o líder desiste).
- Te entrego o passo a passo de como montar cada funil e um painel "Saúde do produto" no PostHog.

## Privacidade (não muda)
- Nada de texto de anotação, avaliação, transcrição ou conversa. Só nome do evento, papel, empresa e liderado por identificador.
- Ajuste: alguns eventos antigos levam o e-mail no registro interno; ele continua fora do PostHog.
- Nada é enviado durante a impersonação do super admin.

## O que você precisa fazer depois
- Usar o app normalmente por alguns minutos e conferir no PostHog (Activity) se os eventos chegaram.
- Montar os funis com o passo a passo.

## Detalhes técnicos
- Todos os eventos via `capture()` de `src/lib/productAnalytics.ts`; nomes em snake_case: `review_created {mode}`, `review_step_completed {step}`, `review_shared {mode}`, `review_acknowledged`, `mentor_stream_stopped`, `note_created {source}`, `connector_connected/disconnected {provider}`.
- Pontos: `CreateFormalReviewDialog` (criação), `FormalReviewSheet.advanceStep` e `handleShareClick` (sucesso), confirmação em `DirectReportReviewView`, `MentorChat.stopStreaming`, salvar em `NewNoteDialog`, ações dos cartões de conector em `/lider/conectores`.
- Bloquear `capture`/`identify` quando houver impersonação (flag setada no AccountContext/useImpersonation).
- Marcos "primeiro uso" via `$set_once` nas propriedades da pessoa.
- Fluxo da avaliação e regras atuais intocados; typecheck após as mudanças.
