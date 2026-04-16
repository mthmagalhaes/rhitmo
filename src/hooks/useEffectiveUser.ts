import { useAuth } from './useAuth';
import { useImpersonation } from './useImpersonation';

/**
 * Returns the "effective" user identity, which is the impersonated user
 * when an admin is impersonating, or the authenticated user otherwise.
 *
 * CRITICAL: Every hook/query that depends on user identity to fetch
 * data scoped to "the current user" MUST use this hook instead of
 * `useAuth().user.id` directly. Otherwise, impersonation will leak
 * the admin's data into the impersonated user's view.
 */
export function useEffectiveUser() {
  const { user, loading: authLoading } = useAuth();
  const {
    isImpersonating,
    impersonatedUserId,
    impersonatedEmail,
    isLoading: impersonationLoading,
  } = useImpersonation();

  const id = isImpersonating && impersonatedUserId
    ? impersonatedUserId
    : user?.id ?? null;

  const email = isImpersonating && impersonatedEmail
    ? impersonatedEmail
    : user?.email ?? null;

  return {
    id,
    email,
    isImpersonating,
    /** True while we don't yet know whether impersonation is active. */
    loading: authLoading || impersonationLoading,
  };
}
