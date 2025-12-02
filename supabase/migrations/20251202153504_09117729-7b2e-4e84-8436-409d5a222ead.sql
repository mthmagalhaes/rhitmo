-- Função RPC para admin acessar metadados de usuários
CREATE OR REPLACE FUNCTION public.get_all_users_with_metadata()
RETURNS TABLE (
  user_id uuid,
  email text,
  full_name text,
  phone text,
  job_title text,
  team_size text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    au.id as user_id,
    au.email::text,
    (au.raw_user_meta_data->>'full_name')::text as full_name,
    (au.raw_user_meta_data->>'phone')::text as phone,
    (au.raw_user_meta_data->>'job_title')::text as job_title,
    (au.raw_user_meta_data->>'team_size')::text as team_size,
    au.created_at
  FROM auth.users au
  WHERE public.is_admin() = true
  ORDER BY au.created_at DESC
$$;