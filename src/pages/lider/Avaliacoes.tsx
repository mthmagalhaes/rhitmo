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
import { Button } from '@/components/ui/button';
import { Music, Sparkles, ArrowRight } from 'lucide-react';

interface Selected {
  id: string;
  name: string;
}

export default function LiderAvaliacoes() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Selected | null>(null);

  const goTo = (path: string) => {
    if (!selected) return;
    navigate(path);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <MembersGrid
        eyebrow="Avaliações"
        title="Para quem você vai gerar uma avaliação?"
        subtitle="Escolha um liderado e selecione entre Rhitmo (mensal/trimestral) ou Avaliação Formal."
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
              O Rhitmo gera o rascunho com base em notas, 1:1s e feedbacks compartilhados.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 mt-2">
            {/* Card 1: Rhitmo (com sub-opções Mensal / Trimestral) */}
            <Card className="rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] transition-all">
              <CardContent className="py-5 space-y-4">
                <div className="flex items-start gap-4">
                  <div className="rounded-xl bg-primary/10 p-2.5 shrink-0">
                    <Music className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-serif font-bold tracking-tight">Rhitmo</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Resumos automáticos do mês e do trimestre, com destaques, riscos e ações sugeridas pelo Mentor.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 pl-[3.25rem]">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl gap-1.5"
                    onClick={() =>
                      goTo(`/member/${selected?.id}?tab=rhitmo&sub=monthly`)
                    }
                  >
                    Mensal
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl gap-1.5"
                    onClick={() =>
                      goTo(`/member/${selected?.id}?tab=rhitmo&sub=quarterly`)
                    }
                  >
                    Trimestral
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Card 2: Avaliação Formal */}
            <Card
              className="rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transition-all cursor-pointer"
              onClick={() =>
                goTo(`/member/${selected?.id}?tab=reviews&action=new`)
              }
            >
              <CardContent className="flex items-start gap-4 py-5">
                <div className="rounded-xl bg-primary/10 p-2.5 shrink-0">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-serif font-bold tracking-tight">
                    Avaliações Formais
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Performance Review fundamentada em evidências reais. Você revisa, ajusta e compartilha.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
