import { PageTabs, type PageTab } from '@/components/PageTabs';
import { EmptyStateHero } from '@/components/EmptyStateHero';
import { FileText, CheckCircle2, Sparkles } from 'lucide-react';
import Index from '@/pages/Index';

export default function LideradoAvaliacoes() {
  const tabs: PageTab[] = [
    { value: 'para-revisar', label: 'Para revisar', icon: FileText, content: <Index /> },
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
