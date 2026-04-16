
UPDATE public.team_members
SET linked_user_id = '28f28b46-ecbb-4e0a-aa8e-9e9a6874a1e8',
    invite_status = 'accepted',
    invite_token = NULL
WHERE id = 'b648ff1f-3daf-4caa-863e-9105e233f7b4'
  AND invite_status = 'pending';
