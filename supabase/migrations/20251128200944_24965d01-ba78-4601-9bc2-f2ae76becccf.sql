-- Permitir leitura pública de team_members apenas para a página de sync
-- Isso é necessário para que o liderado possa ver seu nome ao acessar o link
CREATE POLICY "Qualquer pessoa pode ler membros para sync"
ON public.team_members
FOR SELECT
USING (true);