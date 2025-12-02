import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { RhitmoLogo } from '@/components/RhitmoLogo';
import { WaitlistDialog } from '@/components/WaitlistDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';
import { BookOpen, Brain, FileText, Loader2, Users, BarChart3, Sparkles } from 'lucide-react';

const Landing = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [waitlistOpen, setWaitlistOpen] = useState(false);

  useEffect(() => {
    if (user && !loading) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link to="/">
              <RhitmoLogo size="sm" />
            </Link>
            
            <NavigationMenu className="hidden md:flex">
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="bg-transparent">Produto</NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-[400px] gap-3 p-4">
                      <li className="row-span-1">
                        <div className="flex items-start gap-3 rounded-md p-3 hover:bg-accent">
                          <Users className="h-5 w-5 text-primary mt-0.5" />
                          <div>
                            <div className="text-sm font-medium">Para Líderes</div>
                            <p className="text-sm text-muted-foreground">
                              O fim da tela em branco nas avaliações
                            </p>
                          </div>
                        </div>
                      </li>
                      <li className="row-span-1">
                        <div className="flex items-start gap-3 rounded-md p-3 hover:bg-accent">
                          <BarChart3 className="h-5 w-5 text-primary mt-0.5" />
                          <div>
                            <div className="text-sm font-medium">Para RH</div>
                            <p className="text-sm text-muted-foreground">
                              Visibilidade e cultura de dados
                            </p>
                          </div>
                        </div>
                      </li>
                      <li className="row-span-1">
                        <div className="flex items-start gap-3 rounded-md p-3 hover:bg-accent">
                          <Sparkles className="h-5 w-5 text-primary mt-0.5" />
                          <div>
                            <div className="text-sm font-medium">Como Funciona</div>
                            <p className="text-sm text-muted-foreground">
                              Diário → IA → Avaliação
                            </p>
                          </div>
                        </div>
                      </li>
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link to="/auth">Log in</Link>
            </Button>
            <Button onClick={() => setWaitlistOpen(true)}>
              Join Waitlist
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 lg:py-24">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
          <div className="space-y-6">
            <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl xl:text-6xl">
              Nunca mais escreva uma avaliação de desempenho{' '}
              <span className="text-success">do zero.</span>
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-xl">
              Com o Rhitmo, líderes ganham tempo e organização para focar no que mais importa:{' '}
              <span className="bg-success/20 text-foreground px-1.5 py-0.5 rounded">
                desenvolver pessoas e construir uma cultura de resultados.
              </span>
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button size="lg" className="text-base px-8" onClick={() => setWaitlistOpen(true)}>
                Entrar na Lista de Espera
              </Button>
              <Button size="lg" variant="outline" className="text-base px-8" asChild>
                <Link to="/auth">Já tenho conta</Link>
              </Button>
            </div>
          </div>

          {/* Hero Image */}
          <div className="relative">
            <div className="aspect-[4/3] rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-success/10 overflow-hidden flex items-center justify-center">
              <div className="text-center p-8">
                <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-primary/20 flex items-center justify-center">
                  <FileText className="h-12 w-12 text-primary" />
                </div>
                <p className="text-lg font-medium text-foreground">
                  Transforme anotações em avaliações profissionais
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16 lg:py-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight lg:text-4xl">
            Sua liderança potencializada
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Ferramentas simples que ajudam você a ser um líder melhor, sem complicação
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Card 1 - Diário */}
          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardContent className="pt-6">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Registre fatos em segundos</h3>
              <p className="text-muted-foreground">
                Não confie na memória. Capture feedbacks e observações no momento em que acontecem.
              </p>
            </CardContent>
          </Card>

          {/* Card 2 - AI Mentor */}
          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardContent className="pt-6">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Brain className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Assistente 24/7</h3>
              <p className="text-muted-foreground">
                Um mentor de IA que identifica vieses e sugere ações personalizadas para cada liderado.
              </p>
            </CardContent>
          </Card>

          {/* Card 3 - Avaliação PDF */}
          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardContent className="pt-6">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Avaliações com um clique</h3>
              <p className="text-muted-foreground">
                Gere avaliações formais completas baseadas nos seus registros reais.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16 lg:py-24">
        <div className="rounded-2xl bg-primary/5 border border-primary/20 p-8 lg:p-12 text-center">
          <h2 className="text-2xl font-bold lg:text-3xl mb-4">
            Pronto para transformar sua liderança?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Entre na lista de espera e seja um dos primeiros a experimentar o Rhitmo.
          </p>
          <Button size="lg" className="text-base px-8" onClick={() => setWaitlistOpen(true)}>
            Entrar na Lista de Espera
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <RhitmoLogo size="sm" />
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Rhitmo. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>

      {/* Waitlist Dialog */}
      <WaitlistDialog open={waitlistOpen} onOpenChange={setWaitlistOpen} />
    </div>
  );
};

export default Landing;
