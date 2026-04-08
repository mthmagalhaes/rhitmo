-- Link Gabriela's auth user to her team_member record
UPDATE public.team_members
SET linked_user_id = '7af352c3-35ae-43cc-af4a-906dc28abce3',
    invite_status = 'accepted',
    invite_token = NULL
WHERE id = 'd7fe2ef0-8d9f-4191-a5cf-c1ac4bb8990f'
  AND email = 'gabriela.lucas@fstr.co';

-- Delete orphan subscription (if any)
DELETE FROM public.subscriptions
WHERE workspace_id = '9d87d814-e446-4940-9e6b-299873e22023';

-- Delete orphan teams (if any)
DELETE FROM public.teams
WHERE workspace_id = '9d87d814-e446-4940-9e6b-299873e22023';

-- Delete orphan workspace
DELETE FROM public.workspaces
WHERE id = '9d87d814-e446-4940-9e6b-299873e22023'
  AND owner_id = '7af352c3-35ae-43cc-af4a-906dc28abce3';