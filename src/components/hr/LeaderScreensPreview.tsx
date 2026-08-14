import { useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Home, Calendar, NotebookPen, FileText, ChevronLeft, ChevronRight, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Enablement-only preview of the leader screens for HR Admins.
 *
 * Renders static, illustrative mockups with fictional data — it never queries
 * the backend and never exposes any real note, transcript or review content.
 */

interface Screen {
  id: string;
  icon: typeof Home;
  title: string;
  route: string;
  description: string;
  mock: React.ReactNode;
  tips: string[];
}

function MockCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/50 bg-card p-4 shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">{title}</p>
      {children}
    </div>
  );
}

function MockRow({ name, meta, right }: { name: string; meta: string; right?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-border/40 last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{name}</p>
        <p className="text-xs text-muted-foreground truncate">{meta}</p>
      </div>
      {right && <span className="text-xs text-muted-foreground shrink-0">{right}</span>}
    </div>
  );
}

const SCREENS: Screen[] = [
  {
    id: 'inicio',
    icon: Home,
    title: 'Início do líder',
    route: '/lider/inicio',
    description:
      'Primeira tela que o líder vê. Concentra o setup da conta (agenda, Slack), as próximas 1:1s e o pulso do time.',
    mock: (
      <div className="grid gap-3 sm:grid-cols-2">
        <MockCard title="Configuração da conta">
          <div className="space-y-2">
            <MockRow name="Conectar Google Calendar" meta="Conectado · agenda@empresa.com" right="OK" />
            <MockRow name="Transcrição automática" meta="Ativa nas 1:1s da agenda" right="OK" />
            <MockRow name="Conectar Slack" meta="Pendente" right="—" />
          </div>
        </MockCard>
        <MockCard title="Próximas 1:1s">
          <div className="space-y-2">
            <MockRow name="1:1 com Ana (exemplo)" meta="Hoje, 15:00 · Google Meet" right="Bot ativo" />
            <MockRow name="1:1 com Bruno (exemplo)" meta="Amanhã, 10:30 · Google Meet" right="Agendado" />
          </div>
        </MockCard>
      </div>
    ),
    tips: [
      'O card "Configuração da conta" é o melhor lugar para apoiar um líder travado no onboarding.',
      'O ícone de microfone em "Próximas 1:1s" chama o bot manualmente, inclusive com a reunião já em andamento.',
    ],
  },
  {
    id: '1on1s',
    icon: Calendar,
    title: '1:1s',
    route: '/lider/1on1s',
    description:
      'Lista de liderados à esquerda e, à direita, o histórico de 1:1s daquela pessoa com o brief preparado pela Rhitmo.',
    mock: (
      <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
        <MockCard title="Liderados">
          <div className="space-y-2">
            <MockRow name="Ana (exemplo)" meta="Última: 3 dias" />
            <MockRow name="Bruno (exemplo)" meta="Última: 18 dias" />
          </div>
        </MockCard>
        <MockCard title="Brief da próxima 1:1">
          <div className="space-y-2">
            <div className="h-2.5 w-3/4 rounded bg-muted" />
            <div className="h-2.5 w-full rounded bg-muted" />
            <div className="h-2.5 w-2/3 rounded bg-muted" />
            <p className="pt-2 text-xs text-muted-foreground">
              Conteúdo ilustrativo. O brief real é privado do líder.
            </p>
          </div>
        </MockCard>
      </div>
    ),
    tips: [
      'O brief é gerado antes da reunião com o contexto recente daquele liderado.',
      'Se o líder diz que "não veio brief", quase sempre falta agenda conectada ou não houve registro recente.',
    ],
  },
  {
    id: 'diario',
    icon: NotebookPen,
    title: 'Anotações & Evidências',
    route: '/lider/diario',
    description:
      'Onde ficam as notas, uploads de transcrição e transcrições do bot. É a base de evidências das avaliações.',
    mock: (
      <MockCard title="Anotações & Evidências (exemplo)">
        <div className="space-y-2">
          <MockRow name="Alinhamento semanal" meta="Transcrição do bot · 12/05/2026" right="Ana" />
          <MockRow name="Upload de transcrição" meta="Upload do líder · 05/05/2026" right="Bruno" />
          <MockRow name="Nota rápida" meta="Anotação manual · 02/05/2026" right="Ana" />
        </div>
        <p className="pt-3 text-xs text-muted-foreground">
          Os títulos acima são fictícios. O RH não acessa as anotações reais de nenhum líder.
        </p>
      </MockCard>
    ),
    tips: [
      'Cada item tem um chip de origem: Bot, Upload, Transcrição, Slack ou Nota.',
      'Transcrições longas ganham resumo, tópicos e a aba "Pergunte à Rhitmo".',
    ],
  },
  {
    id: 'avaliacoes',
    icon: FileText,
    title: 'Avaliações',
    route: '/lider/avaliacoes',
    description:
      'Histórico formal por liderado, geração da avaliação com evidências citadas e o fluxo de compartilhar com a pessoa.',
    mock: (
      <MockCard title="Histórico formal (exemplo)">
        <div className="space-y-2">
          <MockRow name="Ana (exemplo)" meta="Q2 2026 · compartilhada em 30/06/2026" right="Reconhecida" />
          <MockRow name="Bruno (exemplo)" meta="Q2 2026 · rascunho" right="Rascunho" />
        </div>
      </MockCard>
    ),
    tips: [
      'A avaliação só fica visível ao liderado depois que o líder clica em "Compartilhar".',
      'As citações da IA trazem data (DD/MM/AAAA) e abrem a evidência de origem.',
    ],
  },
];

export function LeaderScreensPreview({
  open, onOpenChange,
}: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [index, setIndex] = useState(0);
  const screen = SCREENS[index];
  const Icon = screen.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-serif tracking-tight">
            <Icon className="h-5 w-5 text-primary" />
            {screen.title}
          </DialogTitle>
          <DialogDescription>{screen.description}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          {SCREENS.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setIndex(i)}
              className={cn(
                'rounded-xl px-3 py-1.5 text-xs font-medium transition-colors',
                i === index
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted',
              )}
            >
              {s.title}
            </button>
          ))}
          <Badge variant="outline" className="ml-auto gap-1 text-[10px]">
            <EyeOff className="h-3 w-3" />
            dados fictícios
          </Badge>
        </div>

        <div className="rounded-2xl bg-muted/30 p-4">{screen.mock}</div>

        <ul className="space-y-1.5 text-sm text-muted-foreground">
          {screen.tips.map((tip) => (
            <li key={tip} className="flex gap-2">
              <span className="text-primary">·</span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>

        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-muted-foreground">
            Rota do líder: <code className="font-mono">{screen.route}</code>
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              disabled={index === 0}
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
            >
              <ChevronLeft className="h-4 w-4" /> Anterior
            </Button>
            <Button
              size="sm"
              className="rounded-xl"
              disabled={index === SCREENS.length - 1}
              onClick={() => setIndex((i) => Math.min(SCREENS.length - 1, i + 1))}
            >
              Próxima <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
