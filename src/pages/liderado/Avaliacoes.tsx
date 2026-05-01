// Sprint 10.5 — UX cleanup: a aba "Para revisar" antes renderizava o Index inteiro
// (dashboard completo) dentro de uma tab, gerando duplicação visual.
// Agora aponta o usuário ao seu painel principal, onde Self-Review, Upwards Review,
// Peer Review pendentes e reviews compartilhadas já vivem na seção "Avaliações Formais".
import { Link } from 'react-router-dom';
import { PageTabs, type PageTab } from '@/components/PageTabs';
import { EmptyStateHero } from '@/components/EmptyStateHero';
import { Button } from '@/components/ui/button';
import { FileText, CheckCircle2, Sparkles, ArrowRight } from 'lucide-react';

export default function LideradoAvaliacoes() {
  const tabs: PageTab[] = [
    {
      value: 'para-revisar',
      label: 'Para revisar',
      icon: FileText,
      content: (
        <div className="flex flex-col items-center gap-4 py-12">
          <EmptyStateHero
            icon={FileText}
            title="Suas avaliações vivem no painel principal"
            description="Auto-avaliação, feedback ascendente e reviews compartilhadas pelo seu líder estão na seção 'Avaliações Formais' do seu painel."
            variant="compact"
          />
          <Button asChild className="gap-2 rounded-xl">
            <Link to="/liderado">
              Ir para o painel
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      ),
    },
    {
      value: 'concluidas',
      label: 'Concluídas',
      icon: CheckCircle2,
      content: (
        <EmptyStateHero
          icon={Sparkles}
          title="Suas avaliações concluídas aparecerão aqui"
          description="Assim que você confirmar a leitura de uma avaliação compartilhada pelo seu líder, ela passa para esta aba."
          variant="compact"
        />
      ),
    },
  ];

  return (
    <div className="max-w-5xl mx-auto p-6">
      <header className="mb-6">
        <h1 className="font-serif text-3xl font-bold tracking-tight">Avaliações</h1>
        <p className="text-muted-foreground text-sm mt-1">Performance Reviews compartilhadas com você.</p>
      </header>
      <PageTabs tabs={tabs} defaultValue="para-revisar" />
    </div>
  );
}
