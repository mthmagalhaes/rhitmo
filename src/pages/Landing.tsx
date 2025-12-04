import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { RhitmoLogo } from "@/components/RhitmoLogo";
import { WaitlistDialog } from "@/components/WaitlistDialog";
import { useAuth } from "@/hooks/useAuth";
import { Zap, Heart, BarChart, Sparkles, Send, Loader2 } from "lucide-react";

// ============== MOCKUP SIMPLIFICADO ==============

const SimpleChatMockup = () => <div className="bg-card rounded-2xl border shadow-xl overflow-hidden">
    {/* Header */}
    <div className="px-5 py-4 border-b flex items-center gap-3">
      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
        <Sparkles className="h-4 w-4 text-primary" />
      </div>
      <div>
        <div className="font-medium text-sm">Mentor Chat</div>
        <div className="text-xs text-muted-foreground">Contexto: Maria Santos</div>
      </div>
    </div>
    
    {/* Messages */}
    <div className="p-5 space-y-4 min-h-[180px]">
      {/* User */}
      <div className="flex justify-end">
        <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-2.5 text-sm max-w-[75%]">
          Como dar feedback sobre atrasos sem desmotivar?
        </div>
      </div>
      
      {/* AI */}
      <div className="flex justify-start">
        <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3 text-sm max-w-[80%]">
          <span className="text-primary">✨</span> Baseado no perfil da Maria, sugiro uma abordagem empática. Comece reconhecendo as entregas positivas...
        </div>
      </div>
    </div>
    
    {/* Input */}
    <div className="px-5 py-4 border-t">
      <div className="bg-muted rounded-full flex items-center px-4 py-2.5">
        <span className="text-sm text-muted-foreground flex-1">
          Como posso ajudar você hoje?
        </span>
        <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
          <Send className="h-3.5 w-3.5 text-primary-foreground" />
        </div>
      </div>
    </div>
  </div>;

// ============== MAIN COMPONENT ==============

const Landing = () => {
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const {
    user,
    loading
  } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard", {
        replace: true
      });
    }
  }, [user, loading, navigate]);
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>;
  }
  if (user) return null;
  return <div className="min-h-screen bg-background">
      {/* Navbar */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <RhitmoLogo size="sm" className="text-primary" />
          </Link>

          <div className="flex items-center gap-3">
            <Button variant="outline" asChild className="border-primary/30 hover:bg-primary/10">
              <Link to="/auth">Log in</Link>
            </Button>
            <Button onClick={() => setWaitlistOpen(true)}>
              Lista de Espera
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 lg:py-28">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl xl:text-6xl">Nunca mais escreva uma avaliação de desempenho do zero.</h1>
          
          <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">Com Rhitmo, líderes ganham tempo e organização para focar no que mais importa: desenvolver pessoas e construir uma cultura de resultados.</p>
          
          <div className="pt-4">
            <Button size="lg" className="text-base px-8" onClick={() => setWaitlistOpen(true)}>
              Entrar na Lista de Espera
            </Button>
          </div>
        </div>
        
        {/* Mockup Simplificado */}
        <div className="mt-16 max-w-2xl mx-auto">
          <SimpleChatMockup />
        </div>
      </section>

      {/* Seção de Personas */}
      <section className="container mx-auto px-4 py-16 lg:py-20">
        <div className="grid gap-8 md:grid-cols-3">
          
          {/* Card 1: Para Líderes */}
          <div className="bg-card rounded-2xl border p-8 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-bold">Para Líderes</h3>
            <p className="text-lg font-medium">
              Automatize o operacional. Foque no humano.
            </p>
            <p className="text-muted-foreground">
              É como ter um livro de gestão escrito para você. O Rhitmo automatiza 
              anotações e avaliações para que você foque 100% no desenvolvimento do time.
            </p>
          </div>
          
          {/* Card 2: Para Times */}
          <div className="bg-card rounded-2xl border p-8 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Heart className="h-6 w-6 text-emerald-500" />
            </div>
            <h3 className="text-xl font-bold">Para Pessoas Lideradas</h3>
            <p className="text-lg font-medium">
              Saiba exatamente onde você está.
            </p>
            <p className="text-muted-foreground">
              Fim das surpresas e do "feedback fantasma". Tenha clareza total sobre 
              seu progresso com feedbacks baseados em fatos, não em opiniões recentes.
            </p>
          </div>
          
          {/* Card 3: Para RH */}
          <div className="bg-card rounded-2xl border p-8 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-slate-500/10 flex items-center justify-center">
              <BarChart className="h-6 w-6 text-slate-500" />
            </div>
            <h3 className="text-xl font-bold">Para RH</h3>
            <p className="text-lg font-medium">
              Escalone a cultura de alta performance.
            </p>
            <p className="text-muted-foreground">
              Saia do escuro. Visualize a saúde das equipes, identifique riscos de 
              retenção e garanta a consistência dos rituais de liderança em toda a empresa.
            </p>
          </div>
          
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            © 2025 Rhitmo. Todos os direitos reservados.
          </p>
        </div>
      </footer>

      <WaitlistDialog open={waitlistOpen} onOpenChange={setWaitlistOpen} />
    </div>;
};
export default Landing;