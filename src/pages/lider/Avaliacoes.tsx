// Sprint 12.5 — Avaliações com layout Master-Detail estilo Windmill.
// Espelha /lider/diario e /lider/objetivos: lista fixa à esquerda, conteúdo à direita.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardCheck, Music, Sparkles, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MemberAvatar } from '@/components/MemberAvatar';
import { MemberMasterList } from '@/components/leader/MemberMasterList';
import { EmptyMemberDetail } from '@/components/leader/EmptyMemberDetail';
import type { LeaderMemberRow } from '@/hooks/useLeaderMembers';

export default function LiderAvaliacoes() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<LeaderMemberRow | null>(null);

  const goTo = (path: string) => {
    if (!selected) return;
    navigate(path);
  };

  return (
    <div className="flex h-[calc(100svh-3.5rem)] lg:h-[calc(100svh-3rem)] overflow-hidden">
      <MemberMasterList
        selectedMemberId={selected?.id ?? null}
        onSelect={(m) => setSelected(m)}
      />

      <main className="flex-1 min-w-0 overflow-y-auto bg-background">
        <div className="lg:hidden px-4 sm:px-6 pt-4" />

        {!selected ? (
          <div className="max-w-3xl px-6 lg:px-8 py-6">
            <header className="mb-2">
              <h1 className="font-serif text-2xl font-bold tracking-tight">
                Avaliações
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Gere um Rhitmo (mensal/trimestral) ou uma Avaliação Formal a partir das evidências do liderado.
              </p>
            </header>
            <EmptyMemberDetail
              icon={ClipboardCheck}
              title="Selecione um liderado"
              description="Escolha alguém à esquerda para gerar um Rhitmo (mensal/trimestral) ou uma Avaliação Formal."
            />
          </div>
        ) : (
          <div className="max-w-3xl px-6 lg:px-8 py-6 space-y-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Avaliações
            </p>

            <header className="flex items-center gap-3 -mt-3">
              <MemberAvatar
                memberId={selected.id}
                memberName={selected.name}
                avatarUrl={selected.avatar}
                size="lg"
              />
              <div>
                <h1 className="font-serif text-2xl font-bold tracking-tight">
                  {selected.name}
                </h1>
                {selected.role && (
                  <p className="text-sm text-muted-foreground">
                    {selected.role}
                  </p>
                )}
              </div>
            </header>

            <div>
              <h2 className="font-serif text-lg font-bold tracking-tight">
                Escolha o tipo de avaliação
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                O Rhitmo gera o rascunho com base em notas, 1:1s e feedbacks compartilhados.
              </p>
            </div>

            <div className="grid gap-3">
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
                        goTo(`/member/${selected.id}?tab=rhitmo&sub=monthly`)
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
                        goTo(`/member/${selected.id}?tab=rhitmo&sub=quarterly`)
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
                  goTo(`/member/${selected.id}?tab=reviews&action=new`)
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
          </div>
        )}
      </main>
    </div>
  );
}
