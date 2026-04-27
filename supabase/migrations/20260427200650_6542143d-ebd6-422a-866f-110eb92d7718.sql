CREATE OR REPLACE FUNCTION public.dismiss_recall_bot(_bot_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _updated int;
BEGIN
  UPDATE public.recall_bots
  SET status = 'dismissed'
  WHERE id = _bot_id
    AND user_id = effective_user_id();
  GET DIAGNOSTICS _updated = ROW_COUNT;
  RETURN _updated > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.dismiss_recall_bot(uuid) TO authenticated;