
CREATE OR REPLACE FUNCTION public.competency_templates_scrub_public()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_public IS TRUE THEN
    NEW.company := 'Modelo público';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS competency_templates_scrub_public_trg ON public.competency_templates;
CREATE TRIGGER competency_templates_scrub_public_trg
BEFORE INSERT OR UPDATE ON public.competency_templates
FOR EACH ROW EXECUTE FUNCTION public.competency_templates_scrub_public();

UPDATE public.competency_templates
SET company = 'Modelo público'
WHERE is_public IS TRUE AND company IS DISTINCT FROM 'Modelo público';

CREATE OR REPLACE FUNCTION public.tm_guard_insert_linkage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.linked_user_id IS NOT NULL AND NEW.linked_user_id <> uid THEN
    RAISE EXCEPTION 'Nao e permitido vincular a conta de outro usuario ao criar um liderado';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tm_guard_insert_linkage_trg ON public.team_members;
CREATE TRIGGER tm_guard_insert_linkage_trg
BEFORE INSERT ON public.team_members
FOR EACH ROW EXECUTE FUNCTION public.tm_guard_insert_linkage();
