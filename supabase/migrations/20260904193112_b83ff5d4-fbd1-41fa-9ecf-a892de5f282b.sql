REVOKE ALL ON FUNCTION public.can_access_calibration_session(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_calibration_session(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_calibration_grid(date, date, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_calibration_grid(date, date, uuid) TO authenticated, service_role;