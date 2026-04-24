-- Recriar com search_path fixo. read_email_batch precisa de DROP para preservar assinatura original.
DROP FUNCTION IF EXISTS public.read_email_batch(text, integer, integer);

CREATE OR REPLACE FUNCTION public.enqueue_email(queue_name text, payload jsonb)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pgmq, pg_temp
AS $$
DECLARE
  msg_id bigint;
BEGIN
  SELECT pgmq.send(queue_name, payload) INTO msg_id;
  RETURN msg_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_email(queue_name text, message_id bigint)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pgmq, pg_temp
AS $$
DECLARE
  ok boolean;
BEGIN
  SELECT pgmq.delete(queue_name, message_id) INTO ok;
  RETURN ok;
END;
$$;

CREATE OR REPLACE FUNCTION public.move_to_dlq(source_queue text, dlq_name text, message_id bigint, payload jsonb)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pgmq, pg_temp
AS $$
DECLARE
  new_id bigint;
BEGIN
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  PERFORM pgmq.delete(source_queue, message_id);
  RETURN new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.read_email_batch(queue_name text, batch_size integer, vt integer)
RETURNS TABLE(msg_id bigint, read_ct integer, message jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pgmq, pg_temp
AS $$
BEGIN
  RETURN QUERY
    SELECT r.msg_id, r.read_ct, r.message
    FROM pgmq.read(queue_name, vt, batch_size) AS r;
END;
$$;

-- Restringir policy "Anyone can submit to waitlist" com validação mínima
DROP POLICY IF EXISTS "Anyone can submit to waitlist" ON public.waitlist_leads;

CREATE POLICY "Public can submit to waitlist"
ON public.waitlist_leads
FOR INSERT
TO anon, authenticated
WITH CHECK (
  email IS NOT NULL
  AND length(trim(email)) > 0
  AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
);