import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { RhitmoLogo } from '@/components/RhitmoLogo';
import { WaitlistDialog } from '@/components/WaitlistDialog';
import { Button } from '@/components/ui/button';
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuList, NavigationMenuTrigger } from '@/components/ui/navigation-menu';
import { Loader2, Users, BarChart3, Sparkles, MessageSquare, Plus, Check, AlertTriangle, Download } from 'lucide-react';

// ============== MOCKUP COMPONENTS ==============

const HeroMockup = () => <div className="relative w-full aspect-[4/3]">
    {/* Dashboard Background */}
    <div className="absolute inset-0 rounded-2xl bg-card border shadow-xl overflow-hidden">
      {/* Sidebar hint */}
      <div className="absolute left-0 top-0 bottom-0 w-16 bg-muted/50 border-r flex flex-col items-center py-4 gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary/20" />
        <div className="w-8 h-1 rounded bg-muted-foreground/20" />
        <div className="w-8 h-1 rounded bg-muted-foreground/20" />
        <div className="w-8 h-1 rounded bg-muted-foreground/20" />
      </div>
      
      {/* Main content area */}
      <div className="ml-16 p-4">
        <div className="h-6 w-32 bg-muted rounded mb-4" />
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map(i => <div key={i} className="bg-muted/50 rounded-lg p-3 space-y-2">
              <div className="w-10 h-10 rounded-full bg-primary/20" />
              <div className="h-3 w-20 bg-muted rounded" />
              <div className="h-2 w-16 bg-muted-foreground/20 rounded" />
            </div>)}
        </div>
      </div>
    </div>

    {/* Floating Chat Window */}
    <div className="absolute bottom-4 right-4 w-[65%] bg-card rounded-xl border-2 border-primary/30 shadow-2xl overflow-hidden transform rotate-1">
      {/* Chat Header */}
      <div className="bg-primary/10 px-4 py-3 border-b flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">Mentor IA</span>
      </div>
      
      {/* Chat Messages */}
      <div className="p-3 space-y-3 bg-background/50">
        {/* User message */}
        <div className="flex justify-end">
          <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-md px-3 py-2 text-xs max-w-[80%]">
            Como dar feedback para o João sobre atrasos?
          </div>
        </div>
        
        {/* AI message */}
        <div className="flex justify-start">
          <div className="bg-muted rounded-2xl rounded-bl-md px-3 py-2 text-xs max-w-[85%]">
            <span className="text-primary">✨</span> Baseado no perfil DISC do João (alto D), sugiro uma abordagem direta...
          </div>
        </div>
      </div>
      
      {/* Input */}
      <div className="px-3 py-2 border-t bg-card">
        <div className="bg-muted rounded-full h-7 flex items-center px-3">
          <span className="text-xs text-muted-foreground">Como posso ajudar?</span>
        </div>
      </div>
    </div>
  </div>;
const TimelineMockup = () => <div className="w-full bg-card rounded-2xl border shadow-xl p-6 space-y-4">
    {/* Header */}
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium">JM</div>
        <div>
          <div className="font-medium text-sm">João Mendes</div>
          <div className="text-xs text-muted-foreground">Desenvolvedor Senior</div>
        </div>
      </div>
      <Button size="sm" variant="outline" className="h-8">
        <Plus className="h-3 w-3 mr-1" /> Nova Nota
      </Button>
    </div>
    
    {/* Timeline */}
    <div className="space-y-3 pt-2">
      {/* Note 1 */}
      <div className="flex gap-3">
        <div className="flex flex-col items-center">
          <div className="w-2 h-2 rounded-full bg-success" />
          <div className="w-0.5 h-full bg-border" />
        </div>
        <div className="flex-1 bg-success/10 rounded-lg p-3 border border-success/20">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium">02 Dez</span>
            <span className="text-xs bg-success/20 text-success px-2 py-0.5 rounded-full">Positivo</span>
          </div>
          <p className="text-xs text-muted-foreground">Excelente apresentação para o cliente. Dominou tecnicamente...</p>
        </div>
      </div>
      
      {/* Note 2 */}
      <div className="flex gap-3">
        <div className="flex flex-col items-center">
          <div className="w-2 h-2 rounded-full bg-warning" />
          <div className="w-0.5 h-full bg-border" />
        </div>
        <div className="flex-1 bg-warning/10 rounded-lg p-3 border border-warning/20">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium">28 Nov</span>
            <span className="text-xs bg-warning/20 text-warning px-2 py-0.5 rounded-full">Atenção</span>
          </div>
          <p className="text-xs text-muted-foreground">Segundo atraso na entrega do sprint. Conversar sobre...</p>
        </div>
      </div>
      
      {/* Note 3 */}
      <div className="flex gap-3">
        <div className="flex flex-col items-center">
          <div className="w-2 h-2 rounded-full bg-success" />
        </div>
        <div className="flex-1 bg-success/10 rounded-lg p-3 border border-success/20">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium">15 Nov</span>
            <span className="text-xs bg-success/20 text-success px-2 py-0.5 rounded-full">Positivo</span>
          </div>
          <p className="text-xs text-muted-foreground">Ajudou o estagiário com onboarding técnico...</p>
        </div>
      </div>
    </div>
  </div>;
const ChatMockup = () => <div className="w-full bg-card rounded-2xl border shadow-xl overflow-hidden">
    {/* Header */}
    <div className="bg-primary/10 px-5 py-4 border-b flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
        <Sparkles className="h-5 w-5 text-primary" />
      </div>
      <div>
        <div className="font-medium">Mentor de Liderança</div>
        <div className="text-xs text-muted-foreground">Contexto: Maria Santos • Designer</div>
      </div>
    </div>
    
    {/* Messages */}
    <div className="p-5 space-y-4 bg-background/50 min-h-[200px]">
      {/* User */}
      <div className="flex justify-end">
        <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-2.5 text-sm max-w-[80%]">
          A Maria não está entregando no prazo. Como abordar isso sem desmotivar?
        </div>
      </div>
      
      {/* AI */}
      <div className="flex justify-start">
        <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3 text-sm max-w-[85%] space-y-2">
          <p>
            <span className="text-primary font-medium">✨ Baseado no perfil da Maria</span> (comunicação contextual, alta autonomia):
          </p>
          <p className="text-muted-foreground">
            Sugiro uma conversa individual onde você primeiro reconheça a qualidade do trabalho dela, depois explore juntos os bloqueios. Evite cobrança direta...
          </p>
          <div className="bg-primary/10 rounded-lg p-2 text-xs border border-primary/20">
            <strong>💬 Roteiro sugerido:</strong> "Maria, gostei muito do último projeto. Queria entender o que está travando os prazos para ver como posso ajudar..."
          </div>
        </div>
      </div>
    </div>
    
    {/* Input */}
    <div className="px-5 py-4 border-t bg-card">
      <div className="bg-muted rounded-full flex items-center px-4 py-2.5">
        <span className="text-sm text-muted-foreground flex-1">Como posso ajudar você hoje?</span>
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
          <Sparkles className="h-4 w-4 text-primary-foreground" />
        </div>
      </div>
    </div>
  </div>;
const ReviewMockup = () => <div className="w-full bg-card rounded-2xl border shadow-xl overflow-hidden">
    {/* Header */}
    <div className="bg-muted/50 px-5 py-4 border-b flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
          <Download className="h-5 w-5 text-primary" />
        </div>
        <div>
          <div className="font-medium">Avaliação de Desempenho</div>
          <div className="text-xs text-muted-foreground">João Mendes • Q4 2024</div>
        </div>
      </div>
      <span className="text-xs bg-primary/20 text-primary px-3 py-1 rounded-full font-medium">
        ✨ Gerado por IA
      </span>
    </div>
    
    {/* Document Preview */}
    <div className="p-5 space-y-4 bg-background/50">
      {/* Section 1 */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Check className="h-4 w-4 text-success" />
          <span className="font-medium text-sm">Principais Conquistas</span>
        </div>
        <div className="bg-success/10 rounded-lg p-3 border border-success/20 text-xs text-muted-foreground space-y-1">
          <p>• Liderou a migração do sistema legado com zero downtime</p>
          <p>• Mentoria ativa com 2 desenvolvedores júnior</p>
          <p>• NPS interno de 92 na última pesquisa do time</p>
        </div>
      </div>
      
      {/* Section 2 */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <span className="font-medium text-sm">Pontos de Desenvolvimento</span>
        </div>
        <div className="bg-warning/10 rounded-lg p-3 border border-warning/20 text-xs text-muted-foreground space-y-1">
          <p>• Gestão de tempo em projetos paralelos</p>
          <p>• Comunicação proativa sobre bloqueios</p>
        </div>
      </div>
      
      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button size="sm" className="flex-1">
          <Download className="h-3 w-3 mr-1" /> Exportar PDF
        </Button>
        <Button size="sm" variant="outline" className="flex-1">
          Editar
        </Button>
      </div>
    </div>
  </div>;

// ============== MAIN COMPONENT ==============

const Landing = () => {
  const {
    user,
    loading
  } = useAuth();
  const navigate = useNavigate();
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  useEffect(() => {
    if (user && !loading) {
      navigate('/dashboard', {
        replace: true
      });
    }
  }, [user, loading, navigate]);
  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>;
  }
  if (user) return null;
  return <div className="min-h-screen bg-background">
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
              Lista de Espera
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 lg:py-24">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
          <div className="space-y-6">
            <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl xl:text-6xl">
              Construa uma cultura de alta performance.{' '}
              <span className="text-muted-foreground">Sem o caos operacional.</span>
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-xl">
              Substitua a memória falha e as planilhas por uma inteligência contínua. O Rhitmo transforma anotações do dia a dia em{' '}
              <span className="text-foreground font-medium">avaliações de desempenho completas e livres de viés.</span>
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

          {/* Hero Mockup */}
          <div className="hidden lg:block">
            <HeroMockup />
          </div>
        </div>
      </section>

      {/* Feature 1: Diário Inteligente */}
      <section className="container mx-auto px-4 py-16 lg:py-24 border-t">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
          <div className="space-y-6 order-2 lg:order-1">
            <div className="inline-block text-xs font-medium bg-primary/10 text-primary px-3 py-1 rounded-full">
              O Diário Inteligente
            </div>
            <h2 className="text-3xl font-bold tracking-tight lg:text-4xl">
              Pare de confiar na memória.
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Capture feedbacks, conquistas e pontos de atenção em segundos. O Rhitmo organiza tudo cronologicamente para que você nunca mais perca um contexto importante.
            </p>
          </div>
          <div className="order-1 lg:order-2">
            <TimelineMockup />
          </div>
        </div>
      </section>

      {/* Feature 2: Mentor IA */}
      <section className="container mx-auto px-4 py-16 lg:py-24 border-t bg-muted/30">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
          <div>
            <ChatMockup />
          </div>
          <div className="space-y-6">
            <div className="inline-block text-xs font-medium bg-primary/10 text-primary px-3 py-1 rounded-full">
              Mentor de Liderança IA
            </div>
            <h2 className="text-3xl font-bold tracking-tight lg:text-4xl">Mentoring de nível mundial para cada gestor.</h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Não sabe como dar aquele feedback difícil? O Mentor IA analisa o histórico do colaborador e sugere o roteiro perfeito, livre de vieses e focado em desenvolvimento.
            </p>
          </div>
        </div>
      </section>

      {/* Feature 3: Avaliações Automáticas */}
      <section className="container mx-auto px-4 py-16 lg:py-24 border-t">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
          <div className="space-y-6 order-2 lg:order-1">
            <div className="inline-block text-xs font-medium bg-primary/10 text-primary px-3 py-1 rounded-full">
              Avaliações Automáticas
            </div>
            <h2 className="text-3xl font-bold tracking-tight lg:text-4xl">Chega de avaliação de desempenho feito às pressas e entregue aos 45' do segundo tempo</h2>
            <p className="text-lg text-muted-foreground leading-relaxed">Chegou o fim do ciclo? Com um clique, transforme meses de anotações em um rascunho de Avaliação de Desempenho formal, estruturada e pronta para você fazer ajustes finos. Chega de muuuiiiito tempo perdido e vieses inconscientes em um momento tão importante.</p>
          </div>
          <div className="order-1 lg:order-2">
            <ReviewMockup />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16 lg:py-24 border-t">
        <div className="rounded-2xl bg-primary/5 border border-primary/20 p-8 lg:p-12 text-center">
          <h2 className="text-2xl font-bold lg:text-3xl mb-4">
            Pronto para liderar melhor?
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
    </div>;
};
export default Landing;