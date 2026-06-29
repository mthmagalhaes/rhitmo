-- Extend detect_feedback_source to recognize inline-format transcripts
-- (single paragraph "Name: ... Name: ..." without newlines, common when
-- users paste from Google Meet "Show transcript" or similar tools).

CREATE OR REPLACE FUNCTION public.detect_feedback_source(_content text, _current text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $function$
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
    -- Cabeçalho explícito de alinhamento/1:1 + lista de participantes
    WHEN _content ~* '^\s*\[(alinhamento|1:1|one[- ]?on[- ]?one|sync|reuni[aã]o)\]'
         AND (SELECT count(*) FROM regexp_matches(_content, '[A-ZÀ-Ý][\wÀ-ÿ ''.-]{1,60}:\s', 'g')) >= 4
      THEN 'transcription'
    -- Padrão genérico em linhas separadas
    WHEN length(_content) > 1500
         AND _content ~ '(^|\n)[A-ZÀ-Ý][\wÀ-ÿ ''.-]{1,60}:\s'
      THEN 'transcription'
    -- NOVO: padrão inline "Nome Sobrenome: ... Nome Sobrenome: ..." em parágrafo único
    -- Exige >= 6 turnos e densidade compatível com fala (~1 turno por 25 palavras).
    WHEN length(_content) > 400
         AND (SELECT count(*) FROM regexp_matches(_content, '(^|[.!?\s])[A-ZÀ-Ý][a-zà-ÿ]+(\s[A-ZÀ-Ý][a-zà-ÿ]+){0,3}:\s', 'g')) >= 6
         AND (SELECT count(*) FROM regexp_matches(_content, '(^|[.!?\s])[A-ZÀ-Ý][a-zà-ÿ]+(\s[A-ZÀ-Ý][a-zà-ÿ]+){0,3}:\s', 'g'))
             * 25 > array_length(regexp_split_to_array(_content, '\s+'), 1) / 4
      THEN 'transcription'
    ELSE COALESCE(_current, 'manual')
  END;
$function$;

-- Backfill: reclassify legacy 'manual' rows that now match the inline heuristic.
UPDATE public.feedbacks
SET source = 'transcription'
WHERE source IN ('manual', '')
  AND content IS NOT NULL
  AND length(content) > 400
  AND public.detect_feedback_source(content, source) = 'transcription';