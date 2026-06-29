
-- pgcrypto for digest()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.feedbacks
  ADD COLUMN IF NOT EXISTS transcript_hash text,
  ADD COLUMN IF NOT EXISTS personal_lens jsonb;

CREATE INDEX IF NOT EXISTS idx_feedbacks_transcript_hash
  ON public.feedbacks (transcript_hash)
  WHERE transcript_hash IS NOT NULL;

-- Trigger: compute hash on insert/update when content is long enough.
CREATE OR REPLACE FUNCTION public.feedbacks_set_transcript_hash()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized text;
BEGIN
  IF NEW.content IS NOT NULL AND length(NEW.content) > 500 THEN
    IF TG_OP = 'UPDATE' AND OLD.content IS NOT DISTINCT FROM NEW.content AND NEW.transcript_hash IS NOT NULL THEN
      RETURN NEW;
    END IF;
    normalized := lower(regexp_replace(NEW.content, '\s+', ' ', 'g'));
    NEW.transcript_hash := encode(digest(normalized, 'sha256'), 'hex');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_feedbacks_transcript_hash ON public.feedbacks;
CREATE TRIGGER trg_feedbacks_transcript_hash
  BEFORE INSERT OR UPDATE OF content ON public.feedbacks
  FOR EACH ROW
  EXECUTE FUNCTION public.feedbacks_set_transcript_hash();

-- Backfill existing long content.
UPDATE public.feedbacks
SET transcript_hash = encode(digest(lower(regexp_replace(content, '\s+', ' ', 'g')), 'sha256'), 'hex')
WHERE transcript_hash IS NULL
  AND content IS NOT NULL
  AND length(content) > 500;
