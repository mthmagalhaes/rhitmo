-- Adiciona política de SELECT para permitir que usuários autenticados leiam a tabela user_roles
-- Isso quebra a recursão RLS e permite que is_admin() funcione corretamente
CREATE POLICY "Authenticated users can read user_roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (true);