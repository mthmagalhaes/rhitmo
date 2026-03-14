import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { RhitmoLogo } from "@/components/RhitmoLogo";

import { useAuth } from "@/hooks/useAuth";
import { Zap, Heart, BarChart, Sparkles, Send, Loader2, ImageIcon, Menu, X, Check, Lock } from "lucide-react";
import analyticsScreenshot from "@/assets/analytics-screenshot.png";
import heroLeaderFlow from "@/assets/hero-leader-flow.png";
import heroDuoFeedback from "@/assets/hero-duo-feedback.png";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";

// ============== COMPONENTES DE VISUAL ==============

// Browser Frame - Janela estilo macOS
const BrowserFrame = ({
  children,
  wide = false
}: {
  children: React.ReactNode;
  wide?: boolean;
}) => <div className="relative">
    {/* Glow effect */}
    <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-emerald-500/20 rounded-3xl blur-2xl opacity-50" />
    
    <div className={cn("relative bg-card rounded-xl border shadow-xl overflow-hidden", wide ? "aspect-[16/9] lg:aspect-[2/1]" : "aspect-video")}>
      {/* Header macOS */}
      <div className="px-4 py-2.5 border-b bg-muted/30 flex items-center gap-1.5">
        <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
        <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
        <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
      </div>
      {/* Content */}
      <div className="h-[calc(100%-36px)]">
        {children}
      </div>
    </div>
  </div>;

// Image Placeholder - Área para upload de imagem
const ImagePlaceholder = ({
  label
}: {
  label: string;
}) => <div className="w-full h-full bg-muted/50 flex items-center justify-center">
    <div className="text-center space-y-2 px-4">
      <ImageIcon className="h-10 w-10 mx-auto text-muted-foreground/50" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  </div>;

// Human Image Container - Foto humana com glow
const HumanImageContainer = ({
  children
}: {
  children: React.ReactNode;
}) => <div className="relative">
    {/* Glow suave */}
    <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500/15 to-primary/15 rounded-3xl blur-2xl opacity-60" />
    
    <div className="relative rounded-3xl overflow-hidden shadow-2xl aspect-[4/5] max-w-sm mx-auto">
      {children}
    </div>
  </div>;

// ============== MOCKUP SIMPLIFICADO ==============

const SimpleChatMockup = () => <div className="bg-card h-full overflow-hidden">
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

// ============== MAIN COMPONENT ==============

const Landing = () => {
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
    return <div className="light" style={{ colorScheme: 'light' }}>
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>;
  }
  if (user) return null;
  return <div className="light" style={{ colorScheme: 'light' }}>
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <RhitmoLogo size="sm" className="text-primary" />
          </Link>

          {/* Desktop: Botões normais */}
          <div className="hidden md:flex items-center gap-3">
            <Link to="/auth">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground min-h-[44px]">
                Entrar
              </Button>
            </Link>
            <Link to="/auth?mode=signup">
              <Button className="min-h-[44px]">
                Começar grátis
              </Button>
            </Link>
          </div>

          {/* Mobile: Hamburger menu */}
          <Sheet>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" className="h-11 w-11">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] pt-12">
              <nav className="flex flex-col gap-4">
                <SheetClose asChild>
                  <Link to="/auth">
                    <Button variant="outline" className="w-full justify-start min-h-[44px]">
                      Entrar
                    </Button>
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link to="/auth?mode=signup">
                    <Button className="w-full min-h-[44px]">
                      Começar grátis
                    </Button>
                  </Link>
                </SheetClose>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-background to-muted/30">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-20 lg:py-28">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            
            {/* Coluna Esquerda - Texto */}
            <div className="space-y-6 text-left">
              <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl xl:text-6xl">
                Nunca mais escreva uma avaliação de desempenho do zero.
              </h1>
              
              <p className="text-lg text-muted-foreground leading-relaxed max-w-xl">
                Com Rhitmo, líderes ganham tempo e organização para focar no que mais importa: desenvolver pessoas e construir uma cultura de resultados.
              </p>
              
              <div className="pt-4 flex flex-wrap gap-3">
                <Button size="lg" className="text-base px-8" onClick={() => navigate('/auth?mode=signup')}>
                  Começar grátis
                </Button>
                <Button size="lg" variant="outline" className="text-base px-8" asChild>
                  <a href="#pricing">Ver planos</a>
                </Button>
              </div>
            </div>
            
            {/* Coluna Direita - Imagem Premium */}
            <div className="relative">
              {/* Glow effect roxo/esmeralda */}
              <div className="absolute -inset-4 bg-gradient-to-r from-primary/30 to-emerald-500/30 rounded-3xl blur-3xl opacity-60" />
              
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-border/50 hover:scale-105 transition-transform duration-500">
                {/* Overlay roxo similar à página de login */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/50 to-primary/30 mix-blend-multiply z-10" />
                
                <img src={heroLeaderFlow} alt="Líder trabalhando com calma e controle em ambiente minimalista" className="w-full h-full object-cover aspect-[4/3]" />
              </div>
            </div>
            
          </div>
        </div>
      </section>

      {/* Seção: Vídeo Demo */}
      <section className="py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            
            {/* Título */}
            <div className="space-y-3">
              <h2 className="text-3xl lg:text-4xl font-bold text-foreground">Veja Rhitmo em ação</h2>
              <p className="text-lg text-muted-foreground">
                Transforme a gestão do seu time em menos de 2 minutos.
              </p>
            </div>
            
            {/* Vídeo YouTube Embed */}
            <div className="relative">
              {/* Glow effect sutil */}
              <div className="absolute -inset-4 bg-gradient-to-r from-primary/10 to-emerald-500/10 rounded-3xl blur-2xl opacity-50" />
              
              <div className="relative rounded-2xl overflow-hidden shadow-xl">
                <iframe className="w-full aspect-video" src="https://www.youtube.com/embed/bRQiwrBGlsc" title="Rhitmo - Tour Completo" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
              </div>
            </div>
            
          </div>
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
            
            {/* Visual - Browser Frame com Mentor Chat */}
            <div>
              <BrowserFrame>
                <SimpleChatMockup />
              </BrowserFrame>
            </div>
          </div>
        </div>
      </section>

      {/* Seção 2: Para Pessoas Lideradas - Fundo Cinza Suave */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Visual - Foto Humana (emoção) */}
            <div className="md:order-1 order-2">
              <HumanImageContainer>
                <div className="relative w-full h-full">
                  {/* Overlay esmeralda suave */}
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/40 to-emerald-600/20 mix-blend-multiply z-10 rounded-2xl" />
                  
                  <img src={heroDuoFeedback} alt="Líder e liderado em conversa de feedback construtivo olhando para tablet" className="w-full h-full object-cover rounded-2xl" />
                </div>
              </HumanImageContainer>
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
            
            {/* Visual - Browser Frame Wide com Analytics */}
            <div>
              <BrowserFrame wide>
                <img src={analyticsScreenshot} alt="Analytics Dashboard - Rhitmo" className="w-full h-full object-cover object-top" />
              </BrowserFrame>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center space-y-3 mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-foreground">
              Simples. Transparente.
            </h2>
            <p className="text-lg text-muted-foreground">
              Comece grátis. Evolua quando seu time crescer.
            </p>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">

            {/* ── Pulse ── */}
            <div className="bg-card rounded-2xl shadow-sm p-8 border space-y-6">
              <div>
                <h3 className="text-2xl font-bold tracking-tight text-foreground">Pulse</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Para o líder que quer começar a registrar e desenvolver seu time.
                </p>
              </div>

              <div>
                <span className="text-4xl font-bold text-foreground">Grátis</span>
                <span className="text-sm text-muted-foreground ml-1">· para sempre</span>
              </div>

              <Button className="w-full min-h-[44px]" onClick={() => navigate('/auth?mode=signup')}>
                Começar grátis
              </Button>

              <ul className="space-y-3 pt-2">
                {[
                  "Até 3 liderados",
                  "20 mensagens de Mentor Chat por mês",
                  "Notas e anotações ilimitadas",
                  "1 avaliação formal por mês",
                  "1 time",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                    <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
                {[
                  "Meu Rhitmo para liderados",
                  "Gravação de reuniões",
                  "Analytics completo",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground opacity-50">
                    <Lock className="h-4 w-4 mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            {/* ── Pro (destacado) ── */}
            <div className="relative md:-translate-y-2">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                <span className="bg-primary text-primary-foreground text-xs font-semibold px-4 py-1 rounded-full">
                  Mais popular
                </span>
              </div>
              <div className="bg-card rounded-2xl shadow-md p-8 border-2 border-primary space-y-6">
                <div>
                  <h3 className="text-2xl font-bold tracking-tight text-foreground">Pro</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    Para líderes que gerenciam até 5 pessoas e querem desenvolver cada uma com intenção.
                  </p>
                </div>

                <div>
                  <div>
                    <span className="text-4xl font-bold text-foreground">R$69</span>
                    <span className="text-sm text-muted-foreground ml-1">/líder/mês</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">14 dias grátis · cancele quando quiser</p>
                </div>

                <Button className="w-full min-h-[44px]" onClick={() => navigate('/auth?mode=signup&plan=pro')}>
                  Começar com 14 dias grátis
                </Button>

                <ul className="space-y-3 pt-2">
                  {[
                    "Até 5 liderados",
                    "Mentor Chat ilimitado",
                    "Notas e anotações ilimitadas",
                    "Avaliações formais ilimitadas",
                    "Meu Rhitmo para seus liderados",
                    "Gravação de reuniões (até 4h/mês)",
                    "Analytics completo",
                    "Até 3 times",
                  ].map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                      <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* ── Business ── */}
            <div className="bg-card rounded-2xl shadow-sm p-8 border space-y-6">
              <div>
                <h3 className="text-2xl font-bold tracking-tight text-foreground">Business</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Para empresas que querem uma cultura de feedback consistente em todos os times.
                </p>
              </div>

              <div>
                <div>
                  <span className="text-4xl font-bold text-foreground">R$89</span>
                  <span className="text-sm text-muted-foreground ml-1">/líder/mês</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Mínimo 3 líderes · R$267/mês</p>
              </div>

              <Button variant="outline" className="w-full min-h-[44px]" asChild>
                <a href="mailto:matheus@rhitmo.co">Falar com a equipe</a>
              </Button>

              <ul className="space-y-3 pt-2">
                {[
                  "Até 8 liderados por líder",
                  "Tudo do plano Pro",
                  "Times ilimitados",
                  "Gravação de reuniões (até 8h/mês)",
                  "HR Dashboard com métricas agregadas",
                  "Onboarding assistido",
                  "Suporte prioritário",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                    <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 pb-20">
        <div className="container mx-auto px-4 text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            © 2025 Rhitmo. Todos os direitos reservados.
          </p>
          <Link to="/auth" className="text-xs text-muted-foreground/70 hover:text-primary transition-colors inline-block">
            Já tem conta? Entrar
          </Link>
        </div>
      </footer>

      
    </div>
  </div>;
};
export default Landing;