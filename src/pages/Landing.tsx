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
        <div className="text-xs text-muted-foreground">Liderada: Maria Santos</div>
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

// ============== MOCKUPS PREMIUM PARA PERSONAS ==============

const DashboardMockup = () => <div className="relative">
    {/* Glow effect */}
    <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-emerald-500/20 rounded-3xl blur-2xl opacity-50" />
    
    {/* Container */}
    <div className="relative aspect-video bg-card rounded-2xl shadow-2xl border overflow-hidden">
      {/* Header macOS style */}
      <div className="px-4 py-3 border-b bg-muted/50 flex items-center gap-2">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <div className="w-3 h-3 rounded-full bg-yellow-400" />
          <div className="w-3 h-3 rounded-full bg-green-400" />
        </div>
        <span className="text-xs text-muted-foreground ml-2">Dashboard — Rhitmo</span>
      </div>
      
      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Metric cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-primary/5 rounded-lg p-3">
            <div className="text-xs text-muted-foreground">Feedbacks</div>
            <div className="text-xl font-bold text-primary">24</div>
          </div>
          <div className="bg-emerald-500/10 rounded-lg p-3">
            <div className="text-xs text-muted-foreground">Avaliações</div>
            <div className="text-xl font-bold text-emerald-600">8</div>
          </div>
          <div className="bg-muted rounded-lg p-3">
            <div className="text-xs text-muted-foreground">Membros</div>
            <div className="text-xl font-bold text-foreground">12</div>
          </div>
        </div>
        
        {/* Member list */}
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-emerald-500" />
              <div className="flex-1">
                <div className="h-3 w-24 bg-muted-foreground/20 rounded" />
                <div className="h-2 w-16 bg-muted-foreground/10 rounded mt-1" />
              </div>
              <div className="h-6 w-16 bg-primary/10 rounded-full" />
            </div>)}
        </div>
      </div>
    </div>
  </div>;
const FeedbackMockup = () => <div className="relative">
    {/* Glow effect */}
    <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500/20 to-primary/20 rounded-3xl blur-2xl opacity-50" />
    
    {/* Container - mobile style */}
    <div className="relative aspect-[4/5] max-w-sm mx-auto bg-card rounded-2xl shadow-2xl border overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <span className="font-medium text-sm">Meu Progresso</span>
        <Heart className="h-5 w-5 text-emerald-500" />
      </div>
      
      {/* Evolution chart */}
      <div className="p-4">
        <div className="h-32 flex items-end gap-2 mb-4">
          {[40, 55, 45, 70, 85, 75, 90].map((h, i) => <div key={i} className="flex-1 bg-gradient-to-t from-emerald-500 to-emerald-300 rounded-t" style={{
          height: `${h}%`
        }} />)}
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-emerald-600">+32%</div>
          <div className="text-sm text-muted-foreground">crescimento este trimestre</div>
        </div>
      </div>
      
      {/* Recent feedbacks */}
      <div className="px-4 pb-4 space-y-2">
        <div className="text-xs font-medium text-muted-foreground uppercase">Últimos Feedbacks</div>
        {[1, 2].map(i => <div key={i} className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
            <div className="h-2 w-full bg-emerald-500/30 rounded mb-1" />
            <div className="h-2 w-3/4 bg-emerald-500/20 rounded" />
          </div>)}
      </div>
    </div>
  </div>;
const AnalyticsMockup = () => <div className="relative">
    {/* Glow effect */}
    <div className="absolute -inset-4 bg-gradient-to-r from-slate-500/20 to-primary/20 rounded-3xl blur-2xl opacity-50" />
    
    {/* Container */}
    <div className="relative aspect-video bg-card rounded-2xl shadow-2xl border overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b bg-muted/50 flex items-center gap-2">
        <BarChart className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Analytics — Visão Geral</span>
      </div>
      
      {/* Analytics grid */}
      <div className="p-4 grid grid-cols-2 gap-4">
        {/* Pie chart simulation */}
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">Saúde dos Times</div>
          <div className="relative w-20 h-20 mx-auto">
            <svg className="w-full h-full" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15" fill="none" stroke="hsl(var(--muted))" strokeWidth="3" />
              <circle cx="18" cy="18" r="15" fill="none" stroke="hsl(142.1 76.2% 36.3%)" strokeWidth="3" strokeDasharray="75 25" strokeDashoffset="25" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-bold">87%</span>
            </div>
          </div>
        </div>
        
        {/* Metrics */}
        <div className="space-y-2">
          <div className="p-2 bg-emerald-500/10 rounded-lg">
            <div className="text-xs text-muted-foreground">Engajamento</div>
            <div className="text-lg font-bold text-emerald-600">94%</div>
          </div>
          <div className="p-2 bg-primary/5 rounded-lg">
            <div className="text-xs text-muted-foreground">Avaliações</div>
            <div className="text-lg font-bold text-primary">156</div>
          </div>
        </div>
      </div>
      
      {/* Teams bar */}
      <div className="px-4 pb-4">
        <div className="flex gap-2">
          {['Vendas', 'Tech', 'Marketing'].map(team => <div key={team} className="flex-1 p-2 bg-muted/50 rounded-lg text-center">
              <div className="text-xs text-muted-foreground">{team}</div>
              <div className="flex justify-center gap-0.5 mt-1">
                <span className="text-xs font-medium">●●●</span>
              </div>
            </div>)}
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

      {/* Seção 1: Para Líderes - Fundo Branco */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Texto */}
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                <Zap className="h-4 w-4" />
                Para Líderes
              </div>
              <h2 className="text-3xl lg:text-4xl font-bold text-foreground">
                Automatize o operacional. Lidere com confiança.
              </h2>
              <div className="space-y-4 text-lg text-muted-foreground leading-relaxed">
                <p>
                  É como ter um livro de gestão escrito para você, que se adapta em tempo real às necessidades do seu time. O Rhitmo atua como sua plataforma de automação gerencial: ele transforma anotações soltas em pautas de reunião e avaliações de desempenho completas, eliminando horas de trabalho manual burocrático.
                </p>
                <p>
                  Eleve o impacto das suas 1:1s com insights automáticos que decifram o estilo de trabalho de cada liderado. Construa confiança através de uma comunicação livre de ruídos e simplifique a complexidade da cultura de alta performance.
                </p>
              </div>
            </div>
            
            {/* Mockup */}
            <div>
              <DashboardMockup />
            </div>
          </div>
        </div>
      </section>

      {/* Seção 2: Para Pessoas Lideradas - Fundo Cinza Suave */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Mockup - Esquerda em desktop */}
            <div className="md:order-1 order-2">
              <FeedbackMockup />
            </div>
            
            {/* Texto - Direita em desktop */}
            <div className="space-y-6 md:order-2 order-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 text-sm font-medium">
                <Heart className="h-4 w-4" />
                Para Pessoas Lideradas
              </div>
              <h2 className="text-3xl lg:text-4xl font-bold text-foreground">
                Avaliações justas. Carreira sem surpresas.
              </h2>
              <div className="space-y-4 text-lg text-muted-foreground leading-relaxed">
                <p>
                  Chega de ter seu esforço esquecido ou subvalorizado. O Rhitmo elimina vieses e garante que todas as suas entregas sejam lembradas na hora da avaliação, baseando seu feedback em fatos reais, não apenas na memória recente do gestor.
                </p>
                <p>
                  Use essa clareza para crescer. Receba planos de desenvolvimento personalizados que mostram exatamente o caminho para o próximo nível, transformando a avaliação de desempenho em uma alavanca para a sua promoção.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Seção 3: Para RH - Fundo Branco */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Texto */}
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-500/10 text-slate-600 text-sm font-medium">
                <BarChart className="h-4 w-4" />
                Para RH
              </div>
              <h2 className="text-3xl lg:text-4xl font-bold text-foreground">
                Escale a cultura. Elimine o gargalo operacional.
              </h2>
              <div className="space-y-4 text-lg text-muted-foreground leading-relaxed">
                <p>
                  Garanta avaliações objetivas e pontuais, sem precisar microgerenciar o processo. O Rhitmo devolve o tempo dos seus gestores ao automatizar a escrita das avaliações, entregando rascunhos estruturados e livres de viés.
                </p>
                <p>
                  Vá além dos treinamentos de sala de aula. O Rhitmo oferece coaching personalizado e contínuo no fluxo de trabalho. Para o RH, isso significa visibilidade total: acesse métricas de saúde dos times e insights profundos para medir o ROI da sua cultura.
                </p>
              </div>
            </div>
            
            {/* Mockup */}
            <div>
              <AnalyticsMockup />
            </div>
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