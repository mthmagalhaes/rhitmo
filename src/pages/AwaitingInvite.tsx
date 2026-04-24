import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RhitmoLogo } from '@/components/RhitmoLogo';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Mail, Target, ArrowRight, LogOut } from 'lucide-react';

interface AwaitingInviteProps {
  onPersonaSwitch?: () => void;
}

export default function AwaitingInvite({ onPersonaSwitch }: AwaitingInviteProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { i18n } = useTranslation();
  const [code, setCode] = useState('');
  const lang = i18n.language?.startsWith('en') ? 'en' : i18n.language?.startsWith('es') ? 'es' : 'pt';

  const t = {
    pt: {
      title: 'Aguardando vínculo ao seu time',
      subtitle:
        'Você se cadastrou como liderado, mas ainda não encontramos um convite para o seu e-mail.',
      codeLabel: 'Tem um código de convite?',
      codePlaceholder: 'Cole o código aqui',
      codeCta: 'Acessar com código',
      orText: 'ou',
      askLeader:
        'Peça ao seu líder para te convidar pelo Rhitmo. Assim que ele convidar, sua conta será vinculada automaticamente.',
      switchTitle: 'Na verdade, sou líder',
      switchDesc: 'Crie seu próprio workspace e convide seu time.',
      switchCta: 'Mudar para conta de Líder',
      signOut: 'Sair',
      emptyCode: 'Insira um código de convite válido',
    },
    en: {
      title: 'Waiting to be linked to your team',
      subtitle: "You signed up as a member, but we haven't found an invite for your email yet.",
      codeLabel: 'Have an invite code?',
      codePlaceholder: 'Paste your code here',
      codeCta: 'Access with code',
      orText: 'or',
      askLeader:
        "Ask your leader to invite you on Rhitmo. As soon as they do, your account will be linked automatically.",
      switchTitle: "Actually, I'm a leader",
      switchDesc: 'Create your own workspace and invite your team.',
      switchCta: 'Switch to Leader account',
      signOut: 'Sign out',
      emptyCode: 'Enter a valid invite code',
    },
    es: {
      title: 'Esperando vincularte a tu equipo',
      subtitle: 'Te registraste como miembro, pero aún no encontramos una invitación para tu correo.',
      codeLabel: '¿Tienes un código de invitación?',
      codePlaceholder: 'Pega tu código aquí',
      codeCta: 'Acceder con código',
      orText: 'o',
      askLeader:
        'Pídele a tu líder que te invite en Rhitmo. En cuanto lo haga, tu cuenta se vinculará automáticamente.',
      switchTitle: 'En realidad, soy líder',
      switchDesc: 'Crea tu propio workspace e invita a tu equipo.',
      switchCta: 'Cambiar a cuenta de Líder',
      signOut: 'Salir',
      emptyCode: 'Ingresa un código válido',
    },
  }[lang];

  const handleSubmitCode = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) {
      toast({ title: t.emptyCode, variant: 'destructive' });
      return;
    }
    navigate(`/invite?code=${encodeURIComponent(trimmed)}`);
  };

  const handleSwitchToLeader = () => {
    try {
      localStorage.setItem('signup_persona', 'leader');
    } catch {
      // ignore
    }
    if (onPersonaSwitch) onPersonaSwitch();
    // Force a re-render of the layout so WorkspaceOnboarding shows up
    window.location.assign('/dashboard');
  };

  const handleSignOut = async () => {
    try {
      localStorage.removeItem('signup_persona');
    } catch {
      // ignore
    }
    await supabase.auth.signOut();
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <RhitmoLogo size="sm" className="text-primary" />
          </Link>
          <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-2">
            <LogOut className="h-4 w-4" />
            {t.signOut}
          </Button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-xl space-y-8 animate-fade-in">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <Mail className="h-8 w-8 text-primary" />
            </div>
            <h1 className="font-serif text-3xl lg:text-4xl font-bold tracking-tight text-foreground">
              {t.title}
            </h1>
            <p className="text-base text-muted-foreground">{t.subtitle}</p>
          </div>

          <div className="bg-card rounded-3xl border p-8 shadow-[0_2px_20px_rgba(0,0,0,0.04)] space-y-5">
            <form onSubmit={handleSubmitCode} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invite-code" className="text-sm font-semibold">
                  {t.codeLabel}
                </Label>
                <Input
                  id="invite-code"
                  type="text"
                  placeholder={t.codePlaceholder}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="rounded-xl bg-muted/30 border-0 ring-1 ring-input focus-visible:ring-2 focus-visible:ring-primary"
                />
              </div>
              <Button type="submit" className="w-full h-12 rounded-xl font-semibold">
                {t.codeCta}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">{t.orText}</span>
              </div>
            </div>

            <p className="text-sm text-muted-foreground text-center leading-relaxed">{t.askLeader}</p>
          </div>

          {/* Escape hatch — switch to leader */}
          <div className="bg-muted/30 rounded-2xl border p-6 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground mb-1">{t.switchTitle}</h3>
              <p className="text-sm text-muted-foreground mb-3">{t.switchDesc}</p>
              <Button variant="outline" size="sm" onClick={handleSwitchToLeader} className="rounded-lg">
                {t.switchCta}
                <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
