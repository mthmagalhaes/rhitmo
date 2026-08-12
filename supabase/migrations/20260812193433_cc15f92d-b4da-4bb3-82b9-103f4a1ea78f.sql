CREATE OR REPLACE FUNCTION public.feedbacks_set_transcript_hash()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  normalized text;
BEGIN
  IF NEW.content IS NOT NULL AND length(NEW.content) > 500 THEN
    IF TG_OP = 'UPDATE' AND OLD.content IS NOT DISTINCT FROM NEW.content AND NEW.transcript_hash IS NOT NULL THEN
      RETURN NEW;
    END IF;
    normalized := lower(regexp_replace(NEW.content, '\s+', ' ', 'g'));
    NEW.transcript_hash := encode(extensions.digest(normalized, 'sha256'), 'hex');
  END IF;
  RETURN NEW;
END;
$function$;