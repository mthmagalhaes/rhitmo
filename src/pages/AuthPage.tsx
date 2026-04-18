import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Auth } from '@/components/Auth';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

type BillingCycle = 'quarterly' | 'semiannual' | 'annual';

const AuthPage = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [checkoutTriggered, setCheckoutTriggered] = useState(false);

  // URL params
  const mode = searchParams.get('mode') as 'login' | 'signup' | null;
  const emailParam = searchParams.get('email');
  const planParam = searchParams.get('plan'); // currently only 'pro' is auto-checkoutable
  const cycleParam = (searchParams.get('cycle') ?? 'annual') as BillingCycle;

  // Detect invite flow
  const hasPendingInvite = typeof window !== 'undefined' && !!localStorage.getItem('pending_invite');
  const isInviteFlow = hasPendingInvite || mode === 'signup';

  useEffect(() => {
    if (!user || loading) return;
    if (checkoutTriggered) return;

    // Auto-checkout for the Pro plan only.
    if (planParam === 'pro') {
      setCheckoutTriggered(true);

      const validCycle: BillingCycle = (['quarterly', 'semiannual', 'annual'] as const).includes(cycleParam)
        ? cycleParam
        : 'annual';

      const pollAndCheckout = async () => {
        let workspace = null;
        for (let i = 0; i < 10; i++) {
          const { data } = await supabase
            .from('workspaces')
            .select('id')
            .maybeSingle();
          if (data) {
            workspace = data;
            break;
          }
          await new Promise((r) => setTimeout(r, 500));
        }

        if (!workspace) {
          navigate('/dashboard', { replace: true });
          return;
        }

        try {
          const { data, error } = await supabase.functions.invoke('create-checkout-session', {
            body: { plan: 'pro', billingCycle: validCycle },
          });
          if (!error && data?.url) {
            window.location.href = data.url;
            return;
          }
        } catch (err) {
          console.error('Auto-checkout error:', err);
        }

        navigate('/dashboard', { replace: true });
      };

      pollAndCheckout();
      return;
    }

    // Default routing: HR Admin → /hr, otherwise /dashboard
    const checkAndRedirect = async () => {
      const { data: hrWorkspace } = await supabase
        .from('workspaces')
        .select('id')
        .contains('hr_admin_ids', [user.id])
        .limit(1)
        .maybeSingle();

      if (hrWorkspace) {
        navigate('/hr', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    };
    checkAndRedirect();
  }, [user, loading, navigate, planParam, cycleParam, checkoutTriggered]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user && planParam === 'pro') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background flex-col gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Preparando seu checkout...</p>
      </div>
    );
  }

  if (user) return null;

  return (
    <Auth
      defaultMode={isInviteFlow ? 'signup' : 'login'}
      defaultEmail={emailParam || undefined}
      isInviteFlow={isInviteFlow}
    />
  );
};

export default AuthPage;
