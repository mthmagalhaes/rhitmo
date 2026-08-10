# Visão BP nível 3: a ficha do liderado como o líder vê (sem conteúdo privado)

O Guto pediu algo mais específico do que a lista de ritmo já entregue: conseguir **enxergar a experiência do líder** — quais liderados existem, quais informações/evidências ficam disponíveis, status das 1:1s e das avaliações — para apoiar quem tiver dificuldade. Sem acesso ao conteúdo privado das conversas.

Hoje `/hr/ritmo` tem dois níveis: lista de líderes (cobertura 30 dias) e tabela de liderados daquele líder. Falta o terceiro nível: abrir um liderado e ver a ficha no mesmo formato da tela do líder, só que com metadados.

## O que muda

### 1. Ficha do liderado (novo nível em `/hr/ritmo`)
Clicar num liderado abre um painel no layout da tela do líder, com:

- **Cabeçalho**: nome, cargo, líder responsável, status do convite, tempo de casa.
- **Ritmo de 1:1s**: data do último registro, frequência nos últimos 90 dias, mini gráfico de barras por mês (só contagem).
- **Evidências disponíveis**: contagem por origem (bot, upload, nota manual, Slack, pulse). Mostra **quantas** e **quando**, nunca título ou trecho.
- **Avaliações**: linha do tempo dos ciclos com tipo, período e status (rascunho / compartilhada / reconhecida) e data de compartilhamento. Sem abrir o texto.
- **Faixa de privacidade** fixa no topo: "Você vê ritmo e status. O conteúdo das anotações e transcrições é exclusivo do líder."

### 2. Onde há lacuna, um empurrão
Quando o liderado está sem registro há mais de 14 dias ou sem avaliação no ciclo, a ficha mostra uma sugestão de ação para o BP ("falar com o líder sobre retomar a cadência") — sem notificação automática, só orientação em tela.

### 3. Tour de telas do líder já existente
O botão "Ver as telas do líder" (mockups) permanece e ganha link direto a partir da ficha, para o BP entender onde o líder encontra cada informação.

## Limites que não mudam

- Nada de conteúdo de feedback, transcrição, brief, resumo de IA ou avaliação não compartilhada.
- Sem impersonation. Sem escrita no diário do líder.

## Detalhes técnicos

- Nova RPC `get_hr_member_rhythm_profile(_workspace_id, _member_id)` — `SECURITY DEFINER`, `LANGUAGE plpgsql`, `SET search_path = public`, guardada por `is_workspace_admin`/`is_hr_admin_of_workspace` + checagem de que o member pertence ao workspace. Retorna JSON com: dados cadastrais do `team_members`, `last_feedback_at`, contagens mensais de feedbacks nos últimos 12 meses, contagem por `source`, e lista de `performance_reviews` com `review_type`, `period_start/end`, `status`, `shared_at`, `acknowledged_at`. Nenhuma coluna de texto (`content`, `summary`, `structured_summary`, `personal_lens`).
- Frontend: novo `src/components/hr/MemberRhythmProfile.tsx` renderizado dentro de `src/pages/HRRitmo.tsx` como terceiro estado (líderes → liderados → ficha), mantendo o padrão master-detail e o breadcrumb já usados.
- Sem mudança em RLS de `feedbacks`, `meeting_transcripts` ou `performance_reviews`.
