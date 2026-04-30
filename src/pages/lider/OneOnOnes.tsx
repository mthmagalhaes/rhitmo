import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, X } from 'lucide-react';
import { UpcomingMeetingsCard } from '@/components/dashboard/UpcomingMeetingsCard';
import { PendingTranscriptsCard } from '@/components/dashboard/PendingTranscriptsCard';
import { MembersGrid } from '@/components/leader/MembersGrid';
import { useCalendarIntegration } from '@/hooks/useCalendarIntegration';
import { useNavigate } from 'react-router-dom';

function EducationalBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <Card className="rounded-2xl bg-gradient-to-br from-primary/5 to-accent/5 border-primary/10 shadow-[0_2px_20px_rgba(0,0,0,0.04)] mb-6">
      <CardContent className="flex items-start gap-4 py-5">
        <div className="rounded-xl bg-primary/10 p-2 shrink-0">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="font-serif font-bold tracking-tight">
            Conecte seu Google Calendar
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            O Rhitmo lista suas próximas 1:1s, gera briefs antes de cada reunião e
            captura notas automaticamente. Configure em{' '}
            <strong>Configurações → Integrações</strong>.
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
  const navigate = useNavigate();
  const { isConnected } = useCalendarIntegration() as unknown as {
    isConnected: boolean;
  };

  const [bannerOpen, setBannerOpen] = useState(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('lider_1on1s_banner_dismissed') !== '1';
  });
  const dismiss = () => {
    setBannerOpen(false);
    try {
      localStorage.setItem('lider_1on1s_banner_dismissed', '1');
    } catch {
      /* noop */
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-10">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-2">
          1:1s
        </p>
        <h1 className="font-serif text-3xl font-bold tracking-tight">
          Suas próximas reuniões
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Conectado ao Google Calendar. Briefs, transcrição e captura automática.
        </p>
      </header>

      {bannerOpen && !isConnected && <EducationalBanner onDismiss={dismiss} />}

      {/* Calendar-driven section */}
      <section className="space-y-4">
        <UpcomingMeetingsCard />
        <PendingTranscriptsCard />
      </section>

      {/* Per-member entry: jump straight into a member's 1:1 history */}
      <section>
        <MembersGrid
          eyebrow="Por liderado"
          title="Abrir histórico de 1:1s"
          subtitle="Veja todas as 1:1s anteriores, briefs e transcrições de cada liderado."
          mode="select"
          showNewMemberCta={false}
          onMemberSelect={(m) => navigate(`/member/${m.id}?tab=diary`)}
        />
      </section>
    </div>
  );
}
