
-- A inserção real é feita pelo trigger SECURITY DEFINER, então usuários
-- autenticados não precisam inserir diretamente. Restringir para nenhum role.
DROP POLICY IF EXISTS "Service role can insert audit" ON public.admin_impersonation_audit;

-- Sem policy de INSERT = ninguém consegue inserir via API.
-- O trigger SECURITY DEFINER bypassa RLS, então auditoria continua funcionando.
