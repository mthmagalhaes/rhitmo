import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, MailCheck, Sparkles } from 'lucide-react';
import { RhitmoLogo } from '@/components/RhitmoLogo';
import { RhythmWave } from '@/components/RhythmWave';
import { trackFunnel, trackSignupConversion } from '@/lib/analytics';

interface AuthProps {
  defaultMode?: 'login' | 'signup';
  defaultEmail?: string;
  isInviteFlow?: boolean;
  persona?: 'leader' | 'hr_admin';
}

export const Auth = ({ defaultMode = 'login', defaultEmail = '', isInviteFlow = false, persona }: AuthProps) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(defaultMode === 'signup');
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  // Sprint 2.1: persistent banner + cooldown for unconfirmed-email resend
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resending, setResending] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = window.setInterval(() => setResendCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(t);
  }, [resendCooldown]);

  const handleResendVerification = async () => {
    if (!unconfirmedEmail || resendCooldown > 0) return;
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: unconfirmedEmail,
        options: { emailRedirectTo: `${window.location.origin}/dashboard` },
      });
      if (error) throw error;
      toast({
        title: 'Link reenviado',
        description: `Se a conta existir, um novo link foi para ${unconfirmedEmail}.`,
      });
      trackFunnel('auth_email_resent', { payload: { email: unconfirmedEmail } });
      setResendCooldown(60);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast({ title: 'Não foi possível reenviar', description: msg, variant: 'destructive' });
    } finally {
      setResending(false);
    }
  };

  // Persist persona for OAuth round-trip
  if (typeof window !== 'undefined' && persona) {
    try {
      localStorage.setItem('signup_persona', persona);
    } catch {
      // ignore
    }
  }

  const personaTitle = isSignUp && persona === 'leader'
    ? (t('auth.createLeaderAccount', { defaultValue: 'Criar conta de Líder' }) as string)
    : isSignUp && persona === 'hr_admin'
    ? (t('auth.createHRAdminAccount', { defaultValue: 'Criar conta de RH Admin' }) as string)
    : null;

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({ title: t('auth.enterEmail'), description: t('auth.enterEmailDesc'), variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast({
        title: t('auth.linkSent'),
        description: t('auth.checkEmailReset'),
      });
      setIsForgotPassword(false);
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (error) throw error;
      toast({
        title: t('auth.loginSuccess'),
        description: t('auth.welcomeBack')
      });
    } catch (error: any) {
      const raw = String(error?.message ?? '');
      let title = t('common.error') as string;
      let description = raw;
      if (/email not confirmed|not.*confirm/i.test(raw)) {
        title = 'E-mail ainda não confirmado';
        description = 'Confira sua caixa de entrada (e o spam). Use o botão abaixo para reenviar o link.';
        setUnconfirmedEmail(email);
      } else if (/invalid login|invalid credentials/i.test(raw)) {
        title = 'E-mail ou senha incorretos';
        description = 'Confira os dados ou use "Esqueci minha senha".';
      }
      toast({ title, description, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        title: t('auth.passwordMismatch'),
        description: t('auth.passwordMismatchDesc'),
        variant: "destructive"
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: t('auth.passwordTooShort'),
        description: t('auth.passwordMinLength'),
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`
        }
      });
      if (error) throw error;

      // Detecta "email já registrado": Supabase responde 200 com user mas
      // identities=[] quando o e-mail já tem conta confirmada.
      const identities = (data?.user as { identities?: unknown[] } | null)?.identities;
      if (data?.user && Array.isArray(identities) && identities.length === 0) {
        toast({
          title: 'Esse e-mail já tem conta',
          description: 'Detectamos que você já é cadastrado. Trocamos para a tela de login.',
        });
        setIsSignUp(false);
        setPassword('');
        setConfirmPassword('');
        return;
      }

      // Fire Google Ads signup conversion (idempotent per email)
      trackSignupConversion(email);

      toast({
        title: t('auth.accountCreated'),
        description: t('auth.accountCreatedDesc')
      });
    } catch (error: any) {
      // Mensagens mais claras pros erros mais comuns do Supabase
      const raw = String(error?.message ?? '');
      let title = t('common.error') as string;
      let description = raw;
      if (/already registered|already exists|user already/i.test(raw)) {
        title = 'Esse e-mail já tem conta';
        description = 'Use "Entrar" com sua senha. Esqueceu? Use "Esqueci minha senha".';
        setIsSignUp(false);
      } else if (/password.*(short|6 char|weak)/i.test(raw)) {
        title = 'Senha muito fraca';
        description = 'Use pelo menos 6 caracteres. Combine letras e números.';
      } else if (/pwned|leaked/i.test(raw)) {
        title = 'Senha vazada em incidentes públicos';
        description = 'Esta senha apareceu em vazamentos conhecidos. Escolha outra.';
      }
      toast({ title, description, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const { error } = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (error) throw error;
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: "destructive"
      });
      setLoading(false);
    }
  };

  const emailReadOnly = isInviteFlow && !!defaultEmail;

  return (
    <div className="flex min-h-screen">
      {/* LEFT SIDE: Branded Rhythm Wave */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-[hsl(var(--background))]">
        <div className="absolute inset-0 flex flex-col justify-center">
          <RhythmWave variant="auth" className="opacity-100" />
        </div>
        <div className="absolute inset-0 flex flex-col justify-end pb-16">
          <RhythmWave variant="auth" height={200} className="opacity-40" />
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
          <a
            href="https://rhitmo.co"
            aria-label="Ir para a página inicial da Rhitmo"
            className="inline-block transition-opacity hover:opacity-80"
          >
            <RhitmoLogo size="lg" className="text-primary mb-6" />
          </a>
          <p className="text-sm font-medium tracking-[0.2em] uppercase text-primary/60">
            AI-Native Leadership Partner
          </p>
        </div>
      </div>
      
      {/* RIGHT SIDE: Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-background p-8">
        <div className="w-full max-w-md space-y-8 animate-fade-in">
          <div className="flex justify-center lg:hidden">
            <a
              href="https://rhitmo.co"
              aria-label="Ir para a página inicial da Rhitmo"
              className="inline-block transition-opacity hover:opacity-80"
            >
              <RhitmoLogo size="md" className="text-primary" />
            </a>
          </div>
          
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">
              {isForgotPassword
                ? t('auth.recoverPassword')
                : isSignUp
                ? (personaTitle ?? t('auth.createAccount'))
                : t('auth.loginTitle')}
            </h1>
            <p className="text-muted-foreground text-lg">
              {isForgotPassword ? t('auth.recoverPasswordDesc') : isSignUp ? t('auth.completeSignup') : t('auth.loginSubtitle')}
            </p>
          </div>

          {/* Forgot Password Form */}
          {isForgotPassword && (
            <form onSubmit={handleForgotPassword} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="recovery-email">{t('common.email')}</Label>
                <Input
                  id="recovery-email"
                  type="email"
                  placeholder={t('auth.emailPlaceholder')}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="rounded-xl bg-muted/30 border-0 ring-1 ring-input focus-visible:ring-2 focus-visible:ring-primary"
                  required
                  disabled={loading}
                />
              </div>
              <Button type="submit" className="w-full h-12 rounded-xl font-bold text-base" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('auth.sendRecoveryLink')}
              </Button>
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setIsForgotPassword(false)}
                  className="text-sm text-primary hover:underline font-medium"
                >
                  {t('auth.backToLogin')}
                </button>
              </div>
            </form>
          )}

          {/* Invite Flow Banner */}
          {isInviteFlow && isSignUp && (
            <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-xl text-sm text-primary">
              <Sparkles className="h-4 w-4 flex-shrink-0" />
              <span>{t('auth.setPasswordForAccount')}</span>
            </div>
          )}
          
          {/* Signup Form */}
          {!isForgotPassword && isSignUp ? (
            <form onSubmit={handleSignUp} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">{t('common.email')}</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder={t('auth.emailPlaceholder')} 
                  value={email} 
                  onChange={e => !emailReadOnly && setEmail(e.target.value)} 
                  readOnly={emailReadOnly}
                  className={`rounded-xl bg-muted/30 border-0 ring-1 ring-input focus-visible:ring-2 focus-visible:ring-primary ${emailReadOnly ? "bg-muted" : ""}`}
                  required 
                  disabled={loading} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t('common.password')}</Label>
                <Input 
                  id="password" 
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
                <Label htmlFor="confirmPassword">{t('auth.confirmPassword')}</Label>
                <Input 
                  id="confirmPassword" 
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
                {t('auth.createAccount')}
              </Button>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    {t('auth.orContinueWith')}
                  </span>
                </div>
              </div>
              
              <Button 
                type="button" 
                variant="outline" 
                className="w-full rounded-xl h-12" 
                onClick={handleGoogleSignIn}
                disabled={loading}
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                {t('auth.signInWithGoogle')}
              </Button>
              
              {isInviteFlow && (
                <div className="text-center pt-4">
                  <p className="text-sm text-muted-foreground">
                    {t('auth.alreadyHaveAccount')}{' '}
                    <button type="button" onClick={() => setIsSignUp(false)} className="text-primary hover:underline font-medium">
                      {t('auth.login')}
                    </button>
                  </p>
                </div>
              )}

              <div className="text-center pt-2">
                <p className="text-sm text-muted-foreground">
                  <Link to="/" className="text-primary hover:underline font-medium">
                    {t('auth.backToHome')}
                  </Link>
                </p>
              </div>
            </form>
          ) : !isForgotPassword ? (
            <form onSubmit={handleLogin} className="space-y-6">
              {unconfirmedEmail && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2 text-sm">
                  <div className="flex items-center gap-2 font-medium text-amber-900">
                    <MailCheck className="h-4 w-4" />
                    Confirme seu e-mail
                  </div>
                  <p className="text-amber-800 text-xs leading-relaxed">
                    Enviamos um link de verificação para <strong>{unconfirmedEmail}</strong>. Não chegou? Olhe no spam ou reenvie abaixo.
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="rounded-xl bg-white"
                    onClick={handleResendVerification}
                    disabled={resending || resendCooldown > 0}
                  >
                    {resending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                    {resendCooldown > 0 ? `Reenviar em ${resendCooldown}s` : 'Reenviar verificação'}
                  </Button>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">{t('common.email')}</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder={t('auth.emailPlaceholder')} 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  className="rounded-xl bg-muted/30 border-0 ring-1 ring-input focus-visible:ring-2 focus-visible:ring-primary"
                  required 
                  disabled={loading} 
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">{t('common.password')}</Label>
                  <button
                    type="button"
                    onClick={() => setIsForgotPassword(true)}
                    className="text-xs text-primary hover:underline font-medium"
                  >
                    {t('auth.forgotPassword')}
                  </button>
                </div>
                <Input 
                  id="password" 
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
              <Button type="submit" className="w-full h-12 rounded-xl font-bold text-base" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('auth.login')}
              </Button>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    {t('auth.orContinueWith')}
                  </span>
                </div>
              </div>
              
              <Button 
                type="button" 
                variant="outline" 
                className="w-full rounded-xl h-12" 
                onClick={handleGoogleSignIn}
                disabled={loading}
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                {t('auth.signInWithGoogle')}
              </Button>
              
              {isInviteFlow && (
                <div className="text-center pt-4">
                  <p className="text-sm text-muted-foreground">
                    {t('auth.firstTimeHere')}{' '}
                    <button type="button" onClick={() => setIsSignUp(true)} className="text-primary hover:underline font-medium">
                      {t('auth.createAccount')}
                    </button>
                  </p>
                </div>
              )}

            </form>
          ) : null}
        </div>
      </div>
    </div>
  );
};
