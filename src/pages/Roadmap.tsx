import { Link } from "react-router-dom";
import { RhitmoLogo } from "@/components/RhitmoLogo";
import { Button } from "@/components/ui/button";
import { Check, Construction, Calendar, Lightbulb, ArrowLeft } from "lucide-react";
import { AINativeBadge } from "@/components/ui/AINativeBadge";

const statusConfig = {
  done: { icon: Check, label: "Concluído", className: "bg-primary/10 text-primary border-primary/30" },
  wip: { icon: Construction, label: "Em andamento", className: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30" },
  planned: { icon: Calendar, label: "Planejado", className: "bg-muted text-muted-foreground border-border" },
  idea: { icon: Lightbulb, label: "Futuro", className: "bg-muted text-muted-foreground border-border" },
};

type Status = keyof typeof statusConfig;

interface RoadmapItem {
  title: string;
  description: string;
  status: Status;
}

interface Quarter {
  label: string;
  items: RoadmapItem[];
}

const roadmap: Quarter[] = [
  {
    label: "Q2 / 2026",
    items: [
      { title: "Rhitmo Sync v2", description: "Perfil comportamental completo com user manual, motivadores e estilo de reconhecimento.", status: "done" },
      { title: "Slack App", description: "Registre feedback diretamente do Slack sem sair da conversa.", status: "done" },
      { title: "Dashboard redesign", description: "Novo dashboard Bento Grid com métricas visuais e Career Compass.", status: "done" },
      { title: "Detecção de viés em tempo real", description: "IA alerta sobre linguagem tendenciosa enquanto você escreve feedback.", status: "done" },
      { title: "Pre-meeting briefs", description: "IA gera resumo automático antes de cada 1:1 com base no histórico.", status: "done" },
      { title: "Nudges automáticos", description: "Alertas inteligentes quando um liderado precisa de atenção.", status: "done" },
      { title: "HR Dashboard avançado", description: "Heatmaps de engajamento, risk table e métricas agregadas por departamento.", status: "done" },
      { title: "Tags manuais de classificação", description: "Líder pode classificar notas manualmente com tags visuais (Destaque, Risco, Melhoria).", status: "done" },
    ],
  },
  {
    label: "Q3 / 2026",
    items: [
      { title: "Avaliação 360°", description: "Colete feedback de pares, liderados e stakeholders para avaliações completas.", status: "wip" },
      { title: "Mentor Chat no Slack", description: "Líderes consultam o mentor de IA diretamente pelo Slack com /mentor.", status: "wip" },
      { title: "Meu Rhitmo no Slack", description: "Liderados acessam seu resumo de carreira e feedbacks pelo Slack.", status: "wip" },
    ],
  },
  {
    label: "Q4 / 2026",
    items: [
      { title: "OKRs completos", description: "Defina, acompanhe e conecte OKRs ao ciclo de performance.", status: "planned" },
      { title: "API pública", description: "Integre Rhitmo com seus sistemas internos via REST API.", status: "planned" },
      { title: "Filtros avançados no HR Dashboard", description: "Filtro por time, exportação CSV/PDF e comparativo entre períodos.", status: "planned" },
    ],
  },
  {
    label: "2027",
    items: [
      { title: "Pesquisa de clima organizacional", description: "Pulse surveys com análise de sentimento por IA.", status: "idea" },
      { title: "Integrações SAP / TOTVS / Oracle HCM", description: "Sincronização bidirecional com ERPs enterprise.", status: "idea" },
      { title: "Marketplace de competências", description: "Templates de frameworks de competência por indústria e cargo.", status: "idea" },
    ],
  },
];

const Roadmap = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <RhitmoLogo size="sm" className="text-primary" />
          </Link>
          <div className="flex items-center gap-3">
            <AINativeBadge size="sm" />
            <Button variant="ghost" size="sm" asChild>
              <Link to="/" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-16 bg-gradient-to-b from-background to-muted/30">
        <div className="container mx-auto px-4 text-center space-y-4 max-w-3xl">
          <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground">
            Roadmap Público
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Transparência é um dos nossos valores. Aqui está o que estamos construindo — e o que planejamos para o futuro.
          </p>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="space-y-16">
            {roadmap.map((quarter) => (
              <div key={quarter.label}>
                <h2 className="text-2xl font-bold tracking-tight text-foreground mb-6 flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-primary" />
                  {quarter.label}
                </h2>
                <div className="grid gap-4 ml-6 border-l-2 border-border pl-8">
                  {quarter.items.map((item) => {
                    const cfg = statusConfig[item.status];
                    const Icon = cfg.icon;
                    return (
                      <div
                        key={item.title}
                        className="bg-card rounded-2xl border p-6 space-y-2 hover:-translate-y-0.5 transition-transform"
                      >
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <h3 className="font-bold text-foreground">{item.title}</h3>
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.className}`}>
                            <Icon className="h-3 w-3" />
                            {cfg.label}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4 text-center space-y-4 max-w-2xl">
          <h2 className="text-2xl font-bold text-foreground">Quer sugerir uma feature?</h2>
          <p className="text-muted-foreground">
            Estamos sempre ouvindo. Envie sua sugestão para nossa equipe.
          </p>
          <Button size="lg" asChild>
            <a href="mailto:matheus@rhitmo.co">Enviar sugestão</a>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">© 2026 Rhitmo. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default Roadmap;
