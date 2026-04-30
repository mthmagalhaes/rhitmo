import { PageTabs, type PageTab } from '@/components/PageTabs';
import { EmptyStateHero } from '@/components/EmptyStateHero';
import { Calendar, History, Inbox } from 'lucide-react';
import Index from '@/pages/Index';

export default function LideradoOneOnOnes() {
  const tabs: PageTab[] = [
    { value: 'proximos', label: 'Próximos', icon: Calendar, content: <Index /> },
    {
      value: 'historico',
      label: 'Histórico',
      icon: History,
      content: (
        <EmptyStateHero
          icon={Inbox}
          title="Sem histórico ainda"
          description="Suas 1:1s anteriores aparecerão aqui assim que seu líder começar a registrá-las no Rhitmo."
          variant="compact"
        />
      ),
    },
  ];

  return (
    <div className="max-w-5xl mx-auto p-6">
      <header className="mb-6">
        <h1 className="font-serif text-3xl font-bold tracking-tight">1:1s</h1>
        <p className="text-muted-foreground text-sm mt-1">Suas reuniões com o líder.</p>
      </header>
      <PageTabs tabs={tabs} defaultValue="proximos" />
    </div>
  );
}
