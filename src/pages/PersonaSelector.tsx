import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { RhitmoLogo } from '@/components/RhitmoLogo';
import { ArrowLeft, ArrowRight, Target, Building2, Sparkles } from 'lucide-react';

type Persona = 'leader' | 'hr_admin';

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
      title: 'Como você quer começar?',
      subtitle: 'Escolha o ponto de entrada para configurarmos seu workspace corretamente.',
      leaderBadge: 'Comece grátis',
      leaderTitle: 'Sou Líder de time',
      leaderDesc:
        'Crie seu workspace agora. Os 3 primeiros usuários são grátis, com Mentor AI ilimitado, 1:1s, Pulse, PDI, 360° e transcrição de reuniões. Pague só a partir do 4º liderado.',
      leaderCta: 'Começar como Líder',
      hrTitle: 'Sou RH / People Admin',
      hrDesc:
        'Visão da empresa inteira: convide o primeiro líder, organize times e veja uma amostra do painel Enterprise antes do upgrade. Para times de 50+ pessoas.',
      hrCta: 'Começar como RH Admin',
      trust: 'Sem cartão de crédito. Cancele quando quiser.',
      seePricing: 'Ver planos completos',
      footer: 'Já tem conta?',
      footerCta: 'Entrar',
    },
    en: {
      back: 'Back to homepage',
      title: 'How do you want to start?',
      subtitle: 'Choose your entry point so we can configure your workspace correctly.',
      leaderBadge: 'Start free',
      leaderTitle: "I'm a Team Leader",
      leaderDesc:
        'Spin up your workspace now. First 3 users are free, with unlimited Mentor AI, 1:1s, Pulse, IDP, 360° and meeting transcription. Pay only from the 4th seat onward.',
      leaderCta: 'Start as Leader',
      hrTitle: "I'm HR / People Admin",
      hrDesc:
        'Whole-company view: invite the first leader, organize teams and preview the Enterprise panel before upgrading. Built for 50+ people orgs.',
      hrCta: 'Start as HR Admin',
      trust: 'No credit card. Cancel anytime.',
      seePricing: 'See full pricing',
      footer: 'Already have an account?',
      footerCta: 'Sign in',
    },
    es: {
      back: 'Volver al inicio',
      title: '¿Cómo quieres empezar?',
      subtitle: 'Elige el punto de entrada para configurar tu workspace correctamente.',
      leaderBadge: 'Empieza gratis',
      leaderTitle: 'Soy Líder de equipo',
      leaderDesc:
        'Crea tu workspace ahora. Los 3 primeros usuarios son gratis, con Mentor AI ilimitado, 1:1s, Pulse, PDI, 360° y transcripción de reuniones. Paga solo a partir del 4º colaborador.',
      leaderCta: 'Empezar como Líder',
      hrTitle: 'Soy RH / People Admin',
      hrDesc:
        'Visión de toda la empresa: invita al primer líder, organiza equipos y prueba el panel Enterprise antes del upgrade. Para organizaciones de 50+ personas.',
      hrCta: 'Empezar como RH Admin',
      trust: 'Sin tarjeta de crédito. Cancela cuando quieras.',
      seePricing: 'Ver planes completos',
      footer: '¿Ya tienes cuenta?',
      footerCta: 'Iniciar sesión',
    },
  }[lang];

  return (
    <div className="min-h-screen bg-background flex flex-col">
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

            <button
              type="button"
              onClick={() => choose('hr_admin')}
              className="group text-left bg-card rounded-3xl border p-8 lg:p-10 shadow-[0_2px_20px_rgba(0,0,0,0.04)] hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col"
            >
              <div className="w-14 h-14 rounded-2xl bg-accent/50 flex items-center justify-center mb-5">
                <Building2 className="h-7 w-7 text-accent-foreground" />
              </div>
              <h3 className="text-xl lg:text-2xl font-bold text-foreground mb-3 tracking-tight">
                {t.hrTitle}
              </h3>
              <p className="text-muted-foreground leading-relaxed flex-1">{t.hrDesc}</p>
              <Button variant="outline" className="w-full rounded-xl mt-6 h-12 font-semibold" size="lg">
                {t.hrCta}
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
