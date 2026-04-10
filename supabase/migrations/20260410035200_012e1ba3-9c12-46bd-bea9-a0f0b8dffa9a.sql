-- Clean up existing pending_pdi nudges since PDI is now member's responsibility
DELETE FROM public.leader_nudges WHERE nudge_type = 'pending_pdi';
