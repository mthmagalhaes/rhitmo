
-- Detector heurístico do source efetivo de um feedback
CREATE OR REPLACE FUNCTION public.detect_feedback_source(_content text, _current text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN _content IS NULL OR length(_content) = 0 THEN COALESCE(_current, 'manual')
    -- Preserva sources já confiáveis
    WHEN _current IS NOT NULL AND _current NOT IN ('manual','') THEN _current
    -- Tactiq / Granola / Fireflies / Google Meet transcripts
    WHEN _content ~* 'Meeting started:'
         AND (_content ~* 'Participants:|tactiq\.io|fireflies|granola') THEN 'transcription'
    -- Padrão Tactiq: > 10:32 Nome:
    WHEN (SELECT count(*) FROM regexp_matches(_content, '^>\s?\d{1,2}:\d{2}\s+\S', 'gm')) >= 4
      THEN 'transcription'
    -- Padrão markdown bold: **Nome:**
    WHEN (SELECT count(*) FROM regexp_matches(_content, '\*\*[^*\n:]{1,80}:\*\*', 'g')) >= 4
      THEN 'transcription'
    -- Conteúdo longo com padrão genérico de fala (Nome: ...)
    WHEN length(_content) > 1500
         AND _content ~ '(^|\n)[A-ZÀ-Ý][\wÀ-ÿ ''.-]{1,60}:\s'
      THEN 'transcription'
    ELSE COALESCE(_current, 'manual')
  END;
$$;

-- Backfill one-shot (somente linhas manual/NULL que mudam)
UPDATE public.feedbacks
SET source = public.detect_feedback_source(content, source)
WHERE (source IS NULL OR source = 'manual')
  AND public.detect_feedback_source(content, source) <> COALESCE(source, 'manual');

-- Trigger defensivo para futuras inserções/edições
CREATE OR REPLACE FUNCTION public.feedbacks_auto_source()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.source := public.detect_feedback_source(NEW.content, NEW.source);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS feedbacks_auto_source_trg ON public.feedbacks;
CREATE TRIGGER feedbacks_auto_source_trg
BEFORE INSERT OR UPDATE OF content, source ON public.feedbacks
FOR EACH ROW
EXECUTE FUNCTION public.feedbacks_auto_source();
