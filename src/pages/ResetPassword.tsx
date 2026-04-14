import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { RhitmoLogo } from '@/components/RhitmoLogo';
import { RhythmWave } from '@/components/RhythmWave';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [success, setSuccess] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Listen for PASSWORD_RECOVERY event from Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true);
      }
    });

    // Also check hash for type=recovery
    const hash = window.location.hash;
    if (hash.includes('type=recovery')) {
      setIsRecovery(true);
    }

    return () => subscription.unsubscribe();
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({ title: "Senhas não conferem", description: "Digite a mesma senha nos dois campos.", variant: "destructive" });
      return;
    }

    if (password.length < 6) {
      toast({ title: "Senha muito curta", description: "A senha deve ter no mínimo 6 caracteres.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
      toast({ title: "Senha atualizada!", description: "Sua nova senha foi salva com sucesso." });
      setTimeout(() => navigate('/dashboard', { replace: true }), 2000);
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left side */}
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

      {/* Right side */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-background p-8">
        <div className="w-full max-w-md space-y-8 animate-fade-in">
          <div className="flex justify-center lg:hidden">
            <RhitmoLogo size="md" className="text-primary" />
          </div>

          {success ? (
            <div className="space-y-4 text-center">
              <CheckCircle2 className="h-16 w-16 text-primary mx-auto" />
              <h1 className="text-3xl font-bold text-foreground">Senha Atualizada!</h1>
              <p className="text-muted-foreground text-lg">Redirecionando para o dashboard...</p>
            </div>
          ) : !isRecovery ? (
            <div className="space-y-4 text-center">
              <h1 className="text-3xl font-bold text-foreground">Link Inválido</h1>
              <p className="text-muted-foreground text-lg">
                Este link de recuperação expirou ou é inválido. Solicite um novo link na página de login.
              </p>
              <Button onClick={() => navigate('/auth')} className="rounded-xl h-12 font-bold">
                Ir para o Login
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <h1 className="text-3xl font-bold text-foreground">Nova Senha</h1>
                <p className="text-muted-foreground text-lg">Escolha uma nova senha para sua conta</p>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="new-password">Nova Senha</Label>
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
                  <Label htmlFor="confirm-new-password">Confirmar Nova Senha</Label>
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
                  Salvar Nova Senha
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
