
-- ── Tabela: meeting_signals ─────────────────────────────────────────────────
-- 1 linha por (recall_bot × participante). Métricas objetivas derivadas do
-- transcript, mais sentimento opcional (LLM). Privacidade: somente o líder
-- (manager_id) consegue ler.

CREATE TABLE public.meeting_signals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  manager_id UUID NOT NULL,                     -- líder dono (auth.users.id)
  member_id UUID NULL,                          -- team_members.id do participante (nullable: convidados externos)
  recall_bot_id UUID NOT NULL REFERENCES public.recall_bots(id) ON DELETE CASCADE,
  meeting_transcript_id UUID NULL,              -- meeting_transcripts.id (referência fraca)
  series_key TEXT NULL,                         -- estável p/ baseline rolante (manager_id::member_id)
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  participant_name TEXT NULL,                   -- nome do participante (do diarization)
  is_leader BOOLEAN NOT NULL DEFAULT false,

  -- Métricas brutas
  meeting_seconds INTEGER NULL,                 -- duração total estimada da reunião
  talk_seconds INTEGER NULL,                    -- quanto este participante falou
  talk_pct NUMERIC(5,2) NULL,                   -- % do tempo total
  silence_seconds INTEGER NULL,                 -- silêncio total da reunião (gaps > 3s)
  turn_count INTEGER NULL,                      -- nº de turnos de fala deste participante
  avg_turn_words NUMERIC(8,2) NULL,             -- média de palavras por turno
  questions_asked INTEGER NULL,                 -- frases terminadas em ?
  interruptions_made INTEGER NULL,              -- interrupções feitas por este participante
  words_total INTEGER NULL,
  words_per_minute NUMERIC(8,2) NULL,

  -- Sentimento por LLM (opcional, -1 a 1)
  sentiment_score NUMERIC(4,3) NULL,
  sentiment_label TEXT NULL,                    -- 'positivo' | 'neutro' | 'negativo'
  sentiment_summary TEXT NULL,                  -- 1 linha explicando o tom

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (recall_bot_id, member_id, participant_name)
);

CREATE INDEX idx_meeting_signals_manager_member ON public.meeting_signals(manager_id, member_id, occurred_at DESC);
CREATE INDEX idx_meeting_signals_series ON public.meeting_signals(series_key, occurred_at DESC);
CREATE INDEX idx_meeting_signals_bot ON public.meeting_signals(recall_bot_id);

GRANT SELECT ON public.meeting_signals TO authenticated;
GRANT ALL ON public.meeting_signals TO service_role;

ALTER TABLE public.meeting_signals ENABLE ROW LEVEL SECURITY;

-- Líder dono enxerga só os próprios sinais. Liderados NUNCA leem.
CREATE POLICY "Leaders read own meeting signals"
  ON public.meeting_signals
  FOR SELECT
  TO authenticated
  USING (auth.uid() = manager_id);

-- Apenas service_role escreve (via edge function).
CREATE POLICY "Service role writes signals"
  ON public.meeting_signals
  FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- ── Trigger: deriva series_key e updated_at ────────────────────────────────
CREATE OR REPLACE FUNCTION public.meeting_signals_set_defaults()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  IF NEW.series_key IS NULL AND NEW.member_id IS NOT NULL THEN
    NEW.series_key := NEW.manager_id::text || ':' || NEW.member_id::text;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_meeting_signals_defaults
  BEFORE INSERT OR UPDATE ON public.meeting_signals
  FOR EACH ROW EXECUTE FUNCTION public.meeting_signals_set_defaults();

-- ── RPC: get_member_signals_trend ─────────────────────────────────────────
-- Retorna últimas N reuniões do liderado (lado dele, não do líder) com
-- baseline rolante (média + stddev das anteriores) e flag de drift.
-- Drift: número de métricas onde |z-score| >= 1.0 na linha atual.

CREATE OR REPLACE FUNCTION public.get_member_signals_trend(
  p_member_id UUID,
  p_limit INTEGER DEFAULT 12
)
RETURNS TABLE (
  id UUID,
  occurred_at TIMESTAMPTZ,
  recall_bot_id UUID,
  participant_name TEXT,
  talk_pct NUMERIC,
  questions_asked INTEGER,
  avg_turn_words NUMERIC,
  interruptions_made INTEGER,
  sentiment_score NUMERIC,
  sentiment_label TEXT,
  sentiment_summary TEXT,
  meeting_seconds INTEGER,
  baseline_talk_pct NUMERIC,
  baseline_questions NUMERIC,
  baseline_avg_turn_words NUMERIC,
  baseline_sentiment NUMERIC,
  drift_flags INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_manager_id UUID;
BEGIN
  -- Ownership: só o líder dono do liderado pode consultar.
  SELECT t.leader_user_id INTO v_manager_id
  FROM team_members tm
  JOIN teams t ON t.id = tm.team_id
  WHERE tm.id = p_member_id
  LIMIT 1;

  IF v_manager_id IS NULL OR v_manager_id <> auth.uid() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  WITH member_rows AS (
    SELECT *
    FROM meeting_signals ms
    WHERE ms.member_id = p_member_id
      AND ms.manager_id = v_manager_id
      AND ms.is_leader = false
    ORDER BY ms.occurred_at DESC
    LIMIT p_limit
  ),
  with_baselines AS (
    SELECT
      mr.*,
      AVG(mr.talk_pct) OVER (ORDER BY mr.occurred_at ROWS BETWEEN 8 PRECEDING AND 1 PRECEDING) AS bl_talk,
      AVG(mr.questions_asked) OVER (ORDER BY mr.occurred_at ROWS BETWEEN 8 PRECEDING AND 1 PRECEDING) AS bl_q,
      AVG(mr.avg_turn_words) OVER (ORDER BY mr.occurred_at ROWS BETWEEN 8 PRECEDING AND 1 PRECEDING) AS bl_atw,
      AVG(mr.sentiment_score) OVER (ORDER BY mr.occurred_at ROWS BETWEEN 8 PRECEDING AND 1 PRECEDING) AS bl_sent,
      STDDEV_SAMP(mr.talk_pct) OVER (ORDER BY mr.occurred_at ROWS BETWEEN 8 PRECEDING AND 1 PRECEDING) AS sd_talk,
      STDDEV_SAMP(mr.questions_asked) OVER (ORDER BY mr.occurred_at ROWS BETWEEN 8 PRECEDING AND 1 PRECEDING) AS sd_q,
      STDDEV_SAMP(mr.avg_turn_words) OVER (ORDER BY mr.occurred_at ROWS BETWEEN 8 PRECEDING AND 1 PRECEDING) AS sd_atw,
      STDDEV_SAMP(mr.sentiment_score) OVER (ORDER BY mr.occurred_at ROWS BETWEEN 8 PRECEDING AND 1 PRECEDING) AS sd_sent
    FROM member_rows mr
  )
  SELECT
    wb.id,
    wb.occurred_at,
    wb.recall_bot_id,
    wb.participant_name,
    wb.talk_pct,
    wb.questions_asked,
    wb.avg_turn_words,
    wb.interruptions_made,
    wb.sentiment_score,
    wb.sentiment_label,
    wb.sentiment_summary,
    wb.meeting_seconds,
    wb.bl_talk,
    wb.bl_q,
    wb.bl_atw,
    wb.bl_sent,
    (
      (CASE WHEN wb.sd_talk IS NOT NULL AND wb.sd_talk > 0 AND ABS(wb.talk_pct - wb.bl_talk) / wb.sd_talk >= 1.0 THEN 1 ELSE 0 END)
    + (CASE WHEN wb.sd_q    IS NOT NULL AND wb.sd_q    > 0 AND ABS(wb.questions_asked - wb.bl_q) / wb.sd_q >= 1.0 THEN 1 ELSE 0 END)
    + (CASE WHEN wb.sd_atw  IS NOT NULL AND wb.sd_atw  > 0 AND ABS(wb.avg_turn_words - wb.bl_atw) / wb.sd_atw >= 1.0 THEN 1 ELSE 0 END)
    + (CASE WHEN wb.sd_sent IS NOT NULL AND wb.sd_sent > 0 AND ABS(wb.sentiment_score - wb.bl_sent) / wb.sd_sent >= 1.0 THEN 1 ELSE 0 END)
    )::INTEGER AS drift_flags
  FROM with_baselines wb
  ORDER BY wb.occurred_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_member_signals_trend(UUID, INTEGER) TO authenticated;
