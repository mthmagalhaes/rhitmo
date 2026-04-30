import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { RhitmoLogo } from '@/components/RhitmoLogo';
import { RhythmWave } from '@/components/RhythmWave';
import { useEffect } from 'react';
import { useHomeRoute } from '@/hooks/useHomeRoute';

const ResetPassword = () => {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [success, setSuccess] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const home = useHomeRoute();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true);
      }
    });

    const hash = window.location.hash;
    if (hash.includes('type=recovery')) {
      setIsRecovery(true);
    }

    return () => subscription.unsubscribe();
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({ title: t('auth.passwordMismatch'), description: t('auth.passwordMismatchDesc'), variant: "destructive" });
      return;
    }

    if (password.length < 6) {
      toast({ title: t('auth.passwordTooShort'), description: t('auth.passwordMinLength'), variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
      toast({ title: t('auth.passwordUpdated'), description: t('auth.passwordUpdatedDesc') });
      setTimeout(() => navigate(home, { replace: true }), 2000);
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-[hsl(var(--background))]">
        <div className="absolute inset-0 flex flex-col justify-center">
          <RhythmWave variant="auth" className="opacity-100" />
        </div>
        <div className="absolute inset-0 flex flex-col justify-end pb-16">
          <RhythmWave variant="auth" height={200} className="opacity-40" />
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
          <RhitmoLogo size="lg" className="text-primary mb-6" />
          <p className="text-sm font-medium tracking-[0.2em] uppercase text-primary/60">
            AI-Native Leadership Partner
          </p>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center bg-background p-8">
        <div className="w-full max-w-md space-y-8 animate-fade-in">
          <div className="flex justify-center lg:hidden">
            <RhitmoLogo size="md" className="text-primary" />
          </div>

          {success ? (
            <div className="space-y-4 text-center">
              <CheckCircle2 className="h-16 w-16 text-primary mx-auto" />
              <h1 className="text-3xl font-bold text-foreground">{t('auth.passwordUpdated')}</h1>
              <p className="text-muted-foreground text-lg">{t('auth.redirectingToDashboard')}</p>
            </div>
          ) : !isRecovery ? (
            <div className="space-y-4 text-center">
              <h1 className="text-3xl font-bold text-foreground">{t('auth.invalidLink')}</h1>
              <p className="text-muted-foreground text-lg">
                {t('auth.invalidLinkDesc')}
              </p>
              <Button onClick={() => navigate('/auth')} className="rounded-xl h-12 font-bold">
                {t('auth.goToLogin')}
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <h1 className="text-3xl font-bold text-foreground">{t('auth.newPassword')}</h1>
                <p className="text-muted-foreground text-lg">{t('auth.chooseNewPassword')}</p>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="new-password">{t('auth.newPassword')}</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="rounded-xl bg-muted/30 border-0 ring-1 ring-input focus-visible:ring-2 focus-visible:ring-primary"
                    required
                    disabled={loading}
                    minLength={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-new-password">{t('auth.confirmNewPassword')}</Label>
                  <Input
                    id="confirm-new-password"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="rounded-xl bg-muted/30 border-0 ring-1 ring-input focus-visible:ring-2 focus-visible:ring-primary"
                    required
                    disabled={loading}
                    minLength={6}
                  />
                </div>
                <Button type="submit" className="w-full h-12 rounded-xl font-bold text-base" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('auth.saveNewPassword')}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
