// Sprint 12 — Master-Detail layout for /lider/1on1s
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MemberAvatar } from '@/components/MemberAvatar';
import { MemberMasterList } from '@/components/leader/MemberMasterList';
import { EmptyMemberDetail } from '@/components/leader/EmptyMemberDetail';
import { OneOnOnePrepCard } from '@/components/oneonone/OneOnOnePrepCard';
import { AgendaBlock, type AgendaBlockRef } from '@/components/oneonone/AgendaBlock';
import { UpcomingMeetingsCard } from '@/components/dashboard/UpcomingMeetingsCard';
import { useLeaderMembers, type LeaderMemberRow } from '@/hooks/useLeaderMembers';

export default function LiderOneOnOnes() {
  const navigate = useNavigate();
  const { workspace } = useLeaderMembers();
  const [selected, setSelected] = useState<LeaderMemberRow | null>(null);
  const sharedRef = useRef<AgendaBlockRef>(null);

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <MemberMasterList
        title="1:1s"
        selectedMemberId={selected?.id ?? null}
        onSelect={(m) => setSelected(m)}
      />

      <main className="flex-1 min-w-0">
        <div className="lg:hidden px-4 sm:px-6 pt-6">
          {/* trigger lives inside MemberMasterList */}
        </div>

        {!selected ? (
          <div className="px-4 sm:px-6 py-8">
            <EmptyMemberDetail
              icon={CalendarIcon}
              title="Selecione um liderado"
              description="Escolha alguém na lista à esquerda para preparar a próxima 1:1, registrar a pauta ou ver o histórico."
            />
          </div>
        ) : (
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
            {/* Cabeçalho */}
            <header className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <MemberAvatar
                  memberId={selected.id}
                  memberName={selected.name}
                  avatarUrl={selected.avatar}
                  size="lg"
                />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                    1:1
                  </p>
                  <h1 className="font-serif text-2xl font-bold tracking-tight">
                    {selected.name}
                  </h1>
                  {selected.role && (
                    <p className="text-sm text-muted-foreground">{selected.role}</p>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl gap-2"
                onClick={() => navigate(`/member/${selected.id}`)}
              >
                Abrir ficha
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </header>

            {/* AI Prep */}
            <OneOnOnePrepCard
              workspaceId={workspace?.id ?? null}
              memberId={selected.id}
              onAdd={(text) => sharedRef.current?.appendLine(text)}
            />

            {/* Próximas reuniões (filtro futuro por membro) */}
            <section className="space-y-2">
              <h2 className="font-serif text-sm font-bold tracking-tight text-muted-foreground uppercase tracking-[0.15em]">
                Próximas reuniões
              </h2>
              <UpcomingMeetingsCard />
            </section>

            {/* Pauta + Anotação */}
            <section className="grid gap-4 md:grid-cols-2">
              <AgendaBlock
                ref={sharedRef}
                variant="shared"
                memberId={selected.id}
                workspaceId={workspace?.id ?? null}
              />
              <AgendaBlock
                variant="private"
                memberId={selected.id}
                workspaceId={workspace?.id ?? null}
              />
            </section>

            {/* CTA: histórico completo */}
            <Card
              className="rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)] p-4 flex items-center justify-between cursor-pointer hover:-translate-y-0.5 transition-transform"
              onClick={() => navigate(`/member/${selected.id}?tab=diary`)}
            >
              <div>
                <p className="font-serif text-sm font-bold tracking-tight">
                  Histórico de 1:1s e notas
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Veja todas as 1:1s anteriores, briefs e transcrições deste liderado.
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
