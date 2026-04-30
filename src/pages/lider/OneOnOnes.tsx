import { useState } from 'react';
import { PageTabs, type PageTab } from '@/components/PageTabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, ListChecks, BarChart3, Sparkles, X } from 'lucide-react';
import Index from '@/pages/Index';

function EducationalBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <Card className="rounded-2xl bg-gradient-to-br from-primary/5 to-accent/5 border-primary/10 shadow-[0_2px_20px_rgba(0,0,0,0.04)] mb-6">
      <CardContent className="flex items-start gap-4 py-5">
        <div className="rounded-xl bg-primary/10 p-2 shrink-0">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="font-serif font-bold tracking-tight">1:1s com cadência são metade da liderança</p>
          <p className="text-sm text-muted-foreground mt-1">
            Conecte seu Google Calendar em <strong>Configurações → Integrações</strong> para que o Rhitmo gere briefs antes de cada reunião e capture notas automaticamente.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onDismiss} className="shrink-0">
          <X className="w-4 h-4" />
        </Button>
      </CardContent>
    </Card>
  );
}

export default function LiderOneOnOnes() {
  const [bannerOpen, setBannerOpen] = useState(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('lider_1on1s_banner_dismissed') !== '1';
  });

  const dismiss = () => {
    setBannerOpen(false);
    try { localStorage.setItem('lider_1on1s_banner_dismissed', '1'); } catch {}
  };

  const tabs: PageTab[] = [
    { value: 'proximos', label: 'Próximos', icon: Calendar, content: <Index /> },
    { value: 'todos', label: 'Todos', icon: ListChecks, content: <Index /> },
    {
      value: 'estatisticas',
      label: 'Estatísticas',
      icon: BarChart3,
      content: (
        <p className="text-sm text-muted-foreground text-center py-12">
          Estatísticas detalhadas de cadência em breve.
        </p>
      ),
    },
  ];

  return (
    <div className="max-w-5xl mx-auto p-6">
      <header className="mb-6">
        <h1 className="font-serif text-3xl font-bold tracking-tight">1:1s</h1>
        <p className="text-muted-foreground text-sm mt-1">Reuniões individuais com cada liderado.</p>
      </header>
      {bannerOpen && <EducationalBanner onDismiss={dismiss} />}
      <PageTabs tabs={tabs} defaultValue="proximos" />
    </div>
  );
}
