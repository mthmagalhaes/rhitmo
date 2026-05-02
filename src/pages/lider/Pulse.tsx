// Sprint 13.x — Página /lider/pulse: lista de pulses agrupados por status.
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Filter,
  MoreVertical,
  Plus,
  Search,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { usePulses, type PulseListRow, type PulseStatus } from '@/hooks/usePulses';
import { PulseWizard } from '@/components/pulse/PulseWizard';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const SECTIONS: { key: PulseStatus; label: string }[] = [
  { key: 'draft', label: 'Rascunhos' },
  { key: 'active', label: 'Ativos' },
  { key: 'closed', label: 'Encerrados' },
];

export default function LiderPulse() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: pulses = [], isLoading } = usePulses();
  const [search, setSearch] = useState('');
  const [wizardOpen, setWizardOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return pulses;
    return pulses.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.motivation ?? '').toLowerCase().includes(q),
    );
  }, [pulses, search]);

  const grouped = useMemo(() => {
    const acc: Record<PulseStatus, PulseListRow[]> = {
      draft: [],
      active: [],
      closed: [],
    };
    filtered.forEach((p) => acc[p.status].push(p));
    return acc;
  }, [filtered]);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('pulse_surveys').delete().eq('id', id);
    if (error) {
      toast.error('Não foi possível excluir', { description: error.message });
      return;
    }
    toast.success('Pulse excluído');
    queryClient.invalidateQueries({ queryKey: ['leader-pulses'] });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <header className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground mb-2">
            <Sparkles className="h-3 w-3" />
            Pulse
          </div>
          <h1 className="text-3xl font-serif tracking-tight">Pesquisas Pulse</h1>
        </div>
        <Button onClick={() => setWizardOpen(true)} className="rounded-xl gap-2">
          <Plus className="h-4 w-4" /> Novo Pulse
        </Button>
      </header>

      <div className="flex items-center gap-3 mb-8">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar..."
            className="pl-9 rounded-xl"
          />
        </div>
        <Button variant="outline" className="rounded-xl gap-2" disabled>
          <Filter className="h-4 w-4" /> Filtrar
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
        </div>
      ) : pulses.length === 0 ? (
        <EmptyPulses onCreate={() => setWizardOpen(true)} />
      ) : (
        <div className="space-y-8">
          {SECTIONS.map(({ key, label }) => {
            const items = grouped[key];
            if (items.length === 0) return null;
            return (
              <section key={key}>
                <h2 className="flex items-center gap-2 text-sm font-medium mb-3">
                  {label}
                  <Badge variant="secondary" className="rounded-full">{items.length}</Badge>
                </h2>
                <div className="rounded-2xl border bg-card divide-y">
                  {items.map((p) => (
                    <PulseRow
                      key={p.id}
                      pulse={p}
                      onClick={() => navigate(`/lider/pulse/${p.id}`)}
                      onDelete={() => handleDelete(p.id)}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <PulseWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        onCreated={(id) => navigate(`/lider/pulse/${id}`)}
      />
    </div>
  );
}

function PulseRow({
  pulse,
  onClick,
  onDelete,
}: {
  pulse: PulseListRow;
  onClick: () => void;
  onDelete: () => void;
}) {
  const lastActivity = pulse.launched_at ?? pulse.created_at;
  const responseRate = pulse.participants
    ? Math.round((pulse.responses / pulse.participants) * 100)
    : null;

  return (
    <div className="flex items-center justify-between px-4 py-3 hover:bg-accent/50 cursor-pointer" onClick={onClick}>
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium truncate">{pulse.name}</span>
          {pulse.status === 'draft' && (
            <Badge variant="outline" className="rounded-full text-[10px] py-0 h-5">Rascunho</Badge>
          )}
          {pulse.status === 'active' && (
            <Badge className="rounded-full text-[10px] py-0 h-5 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-0">Ativo</Badge>
          )}
          {pulse.status === 'closed' && (
            <Badge variant="secondary" className="rounded-full text-[10px] py-0 h-5">Encerrado</Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {pulse.status === 'draft'
            ? 'Criado por você'
            : `${pulse.participants} ${pulse.participants === 1 ? 'participante' : 'participantes'}`}
          {' · '}
          {pulse.status === 'draft' && pulse.launched_at == null
            ? 'Nunca enviado'
            : `Há ${formatDistanceToNow(new Date(lastActivity), { locale: ptBR })}`}
          {responseRate != null && pulse.status !== 'draft' && (
            <> · {responseRate}% respondido</>
          )}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onClick}>Abrir</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={onDelete}>
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function EmptyPulses({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="rounded-2xl border bg-card p-12 text-center">
      <Sparkles className="h-8 w-8 mx-auto mb-3 text-primary" />
      <h3 className="text-lg font-serif mb-1">Você ainda não criou nenhum Pulse</h3>
      <p className="text-sm text-muted-foreground mb-5 max-w-md mx-auto">
        Pulses são pesquisas rápidas e estruturadas que a Rhitmo conduz com seu time via Slack. As respostas viram contexto na sua timeline.
      </p>
      <Button onClick={onCreate} className="rounded-xl gap-2">
        <Plus className="h-4 w-4" /> Criar primeiro Pulse
      </Button>
    </div>
  );
}
