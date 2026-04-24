import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { RhitmoLogo } from '@/components/RhitmoLogo';
import { ArrowLeft, ArrowRight, Target, Users, Sparkles } from 'lucide-react';

type Persona = 'leader' | 'member';

export default function PersonaSelector() {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const lang = i18n.language?.startsWith('en') ? 'en' : i18n.language?.startsWith('es') ? 'es' : 'pt';

  const choose = (persona: Persona) => {
    try {
      localStorage.setItem('signup_persona', persona);
    } catch {
      // ignore
    }
    navigate(`/auth?mode=signup&persona=${persona}`);
  };

  const t = {
    pt: {
      back: 'Voltar para a página inicial',
      title: 'Como você vai usar o Rhitmo?',
      subtitle: 'Escolha o seu papel para personalizarmos sua experiência.',
      leaderBadge: 'Recomendado para experimentar',
      leaderTitle: 'Sou Líder de time',
      leaderDesc:
        'Crie seu workspace, convide seu time e tenha acesso a Google Calendar, AI Mentor, Reviews e Briefs pré-1:1.',
      leaderCta: 'Continuar como Líder',
      memberTitle: 'Sou Liderado',
      memberDesc:
        'Você foi convidado pelo seu líder? Use o link do convite que recebeu por e-mail ou crie sua conta de acesso.',
      memberCta: 'Continuar como Liderado',
      footer: 'Já tem conta?',
      footerCta: 'Entrar',
    },
    en: {
      back: 'Back to homepage',
      title: 'How will you use Rhitmo?',
      subtitle: 'Choose your role so we can tailor your experience.',
      leaderBadge: 'Recommended for trying it out',
      leaderTitle: "I'm a Team Leader",
      leaderDesc:
        'Create your workspace, invite your team, and unlock Google Calendar, AI Mentor, Reviews and pre-1:1 Briefs.',
      leaderCta: 'Continue as Leader',
      memberTitle: "I'm a Team Member",
      memberDesc:
        'Were you invited by your leader? Use the invite link you received via email or create your access account.',
      memberCta: 'Continue as Member',
      footer: 'Already have an account?',
      footerCta: 'Sign in',
    },
    es: {
      back: 'Volver al inicio',
      title: '¿Cómo vas a usar Rhitmo?',
      subtitle: 'Elige tu rol para personalizar tu experiencia.',
      leaderBadge: 'Recomendado para probar',
      leaderTitle: 'Soy Líder de equipo',
      leaderDesc:
        'Crea tu workspace, invita a tu equipo y accede a Google Calendar, AI Mentor, Reviews y Briefs pre-1:1.',
      leaderCta: 'Continuar como Líder',
      memberTitle: 'Soy Miembro del equipo',
      memberDesc:
        '¿Te invitó tu líder? Usa el enlace de invitación que recibiste por correo o crea tu cuenta de acceso.',
      memberCta: 'Continuar como Miembro',
      footer: '¿Ya tienes cuenta?',
      footerCta: 'Iniciar sesión',
    },
  }[lang];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="max-w-6xl mx-auto px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-foreground">
            <RhitmoLogo size="sm" className="text-primary" />
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {t.back}
          </Link>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center px-6 py-12 lg:py-20">
        <div className="w-full max-w-5xl space-y-10 animate-fade-in">
          <div className="text-center space-y-3">
            <h1 className="font-serif text-3xl lg:text-5xl font-bold tracking-tight text-foreground">
              {t.title}
            </h1>
            <p className="text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto">
              {t.subtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Leader card (highlighted) */}
            <button
              type="button"
              onClick={() => choose('leader')}
              className="group relative text-left bg-card rounded-3xl border-2 border-primary p-8 lg:p-10 shadow-[0_2px_20px_rgba(0,0,0,0.04)] hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col"
            >
              <span className="absolute -top-3 left-6 inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1.5 rounded-full">
                <Sparkles className="h-3.5 w-3.5" />
                {t.leaderBadge}
              </span>
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
                <Target className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-xl lg:text-2xl font-bold text-foreground mb-3 tracking-tight">
                {t.leaderTitle}
              </h3>
              <p className="text-muted-foreground leading-relaxed flex-1">{t.leaderDesc}</p>
              <Button className="w-full rounded-xl mt-6 h-12 font-semibold" size="lg">
                {t.leaderCta}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </button>

            {/* Member card */}
            <button
              type="button"
              onClick={() => choose('member')}
              className="group text-left bg-card rounded-3xl border p-8 lg:p-10 shadow-[0_2px_20px_rgba(0,0,0,0.04)] hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col"
            >
              <div className="w-14 h-14 rounded-2xl bg-accent/50 flex items-center justify-center mb-5">
                <Users className="h-7 w-7 text-accent-foreground" />
              </div>
              <h3 className="text-xl lg:text-2xl font-bold text-foreground mb-3 tracking-tight">
                {t.memberTitle}
              </h3>
              <p className="text-muted-foreground leading-relaxed flex-1">{t.memberDesc}</p>
              <Button variant="outline" className="w-full rounded-xl mt-6 h-12 font-semibold" size="lg">
                {t.memberCta}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              {t.footer}{' '}
              <Link to="/auth" className="text-primary hover:underline font-medium">
                {t.footerCta}
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
