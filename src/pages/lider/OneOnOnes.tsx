// Sprint 12.2 — /lider/1on1s estilo Windmill/Notion: master-detail + ordem
// editorial (Sugestões → Próximas → Pauta → Action items → Privada).
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
import { ActionItemsBlock } from '@/components/oneonone/ActionItemsBlock';
import { MemberUpcomingMeetings } from '@/components/oneonone/MemberUpcomingMeetings';
import { useLeaderMembers, type LeaderMemberRow } from '@/hooks/useLeaderMembers';

export default function LiderOneOnOnes() {
  const navigate = useNavigate();
  const { workspace } = useLeaderMembers();
  const [selected, setSelected] = useState<LeaderMemberRow | null>(null);
  const sharedRef = useRef<AgendaBlockRef>(null);

  return (
    <div className="flex h-[calc(100svh-3.5rem)] lg:h-[calc(100svh-3rem)] overflow-hidden">
      <MemberMasterList
        selectedMemberId={selected?.id ?? null}
        onSelect={(m) => setSelected(m)}
      />

      <main className="flex-1 min-w-0 overflow-y-auto bg-background">
        {/* Mobile: trigger da master list já é renderizado pelo componente */}
        <div className="lg:hidden px-4 sm:px-6 pt-4" />

        {!selected ? (
          <div className="max-w-5xl px-6 lg:px-8 py-6">
            <header className="mb-2">
              <h1 className="font-serif text-2xl font-bold tracking-tight">
                1:1s
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Resumo executivo da Rhitmo pra você liderar a próxima conversa.
              </p>
            </header>
            <EmptyMemberDetail
              icon={CalendarIcon}
              title="Selecione um liderado"
              description="Escolha alguém na lista à esquerda para preparar a próxima 1:1, registrar a pauta ou ver o histórico."
            />
          </div>
        ) : (
          <div className="max-w-5xl px-6 lg:px-8 py-6 space-y-6">
            {/* Eyebrow da seção */}
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              1:1s
            </p>

            {/* Cabeçalho do liderado */}
            <header className="flex items-center justify-between gap-3 -mt-4">
              <div className="flex items-center gap-3">
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
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-xl gap-1 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => navigate(`/lider/contexto?member=${selected.id}`)}
                >
                  Ver feed bruto
                  <ArrowRight className="h-3 w-3" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl gap-2"
                  onClick={() => navigate(`/member/${selected.id}`)}
                >
                  Abrir ficha
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </header>

            {/* AI Prep — sugestões da Rhitmo */}
            <OneOnOnePrepCard
              workspaceId={workspace?.id ?? null}
              memberId={selected.id}
              onAdd={(text) => sharedRef.current?.appendLine(text)}
            />

            {/* Próximas reuniões deste liderado (versão enxuta) */}
            <section className="space-y-3">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                Próximas reuniões
              </h2>
              <MemberUpcomingMeetings
                memberId={selected.id}
                memberName={selected.name}
              />
            </section>

            {/* Pauta compartilhada (full-width, neutra) */}
            <AgendaBlock
              ref={sharedRef}
              variant="shared"
              memberId={selected.id}
              workspaceId={workspace?.id ?? null}
            />

            {/* Itens de ação */}
            <ActionItemsBlock
              memberId={selected.id}
              workspaceId={workspace?.id ?? null}
            />

            {/* Anotação privada (full-width, bg-muted + dashed + cadeado) */}
            <AgendaBlock
              variant="private"
              memberId={selected.id}
              workspaceId={workspace?.id ?? null}
            />

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
