import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MembersGrid } from '@/components/leader/MembersGrid';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, ClipboardList, Sparkles } from 'lucide-react';

interface Selected {
  id: string;
  name: string;
}

const cycles = [
  {
    id: 'monthly',
    title: 'Rhitmo Mensal',
    description:
      'Resumo executivo do último mês com destaques, riscos e ações sugeridas pelo Mentor.',
    icon: Calendar,
    deepLink: (id: string) => `/member/${id}?tab=rhitmo&sub=monthly`,
  },
  {
    id: 'quarterly',
    title: 'Rhitmo Trimestral',
    description:
      'Visão consolidada do trimestre conectando objetivos, evidências e padrões de comportamento.',
    icon: ClipboardList,
    deepLink: (id: string) => `/member/${id}?tab=rhitmo&sub=quarterly`,
  },
  {
    id: 'formal',
    title: 'Rhitmo Formal',
    description:
      'Performance Review fundamentada em evidências reais. Você revisa, ajusta e compartilha.',
    icon: Sparkles,
    deepLink: (id: string) => `/member/${id}?tab=reviews`,
  },
] as const;

export default function LiderAvaliacoes() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Selected | null>(null);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <MembersGrid
        eyebrow="Avaliações"
        title="Para quem você vai gerar uma avaliação?"
        subtitle="Escolha um liderado e selecione o ciclo: mensal, trimestral ou formal."
        mode="select"
        onMemberSelect={(m) => setSelected(m)}
      />

      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl tracking-tight">
              Avaliações de {selected?.name}
            </DialogTitle>
            <DialogDescription>
              Escolha o ciclo. O Rhitmo gera o rascunho com base em notas, 1:1s e
              feedbacks compartilhados.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 mt-2">
            {cycles.map((c) => {
              const Icon = c.icon;
              return (
                <Card
                  key={c.id}
                  className="rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transition-all cursor-pointer"
                  onClick={() => {
                    if (!selected) return;
                    navigate(c.deepLink(selected.id));
                  }}
                >
                  <CardContent className="flex items-start gap-4 py-5">
                    <div className="rounded-xl bg-primary/10 p-2.5 shrink-0">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-serif font-bold tracking-tight">{c.title}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {c.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
