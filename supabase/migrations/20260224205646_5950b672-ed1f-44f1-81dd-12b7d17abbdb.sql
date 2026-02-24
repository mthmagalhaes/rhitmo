ALTER TABLE public.upcoming_meetings
DROP CONSTRAINT IF EXISTS upcoming_meetings_user_id_google_event_id_key;

ALTER TABLE public.upcoming_meetings
ADD CONSTRAINT upcoming_meetings_user_event_member_key 
UNIQUE (user_id, google_event_id, member_id);