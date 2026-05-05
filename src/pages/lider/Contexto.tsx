// Sprint 13.1 — /lider/contexto: Briefing Executivo por liderado (Master-Detail).
// Substitui o feed cronológico (que mostrava 23 cards de fontes diferentes) por
// uma visão executiva curada por IA, alinhada ao padrão Windmill Recaps.
import { useState } from 'react';
import { Layers } from 'lucide-react';
import { MemberAvatar } from '@/components/MemberAvatar';
import { MemberMasterList } from '@/components/leader/MemberMasterList';
import { EmptyMemberDetail } from '@/components/leader/EmptyMemberDetail';
import { ExecutiveBrief } from '@/components/context/ExecutiveBrief';
import { useContextBrief, type BriefWindow } from '@/hooks/useContextBrief';
import type { LeaderMemberRow } from '@/hooks/useLeaderMembers';

export default function LiderContexto() {
  const [selected, setSelected] = useState<LeaderMemberRow | null>(null);
  const [windowDays, setWindowDays] = useState<BriefWindow>(7);

  const { brief, isLoading, isRefreshing, refresh } = useContextBrief(
    selected?.id ?? null,
    windowDays,
  );

  return (
    <div className="flex h-[calc(100svh-3.5rem)] lg:h-[calc(100svh-3rem)] overflow-hidden">
      <MemberMasterList
        selectedMemberId={selected?.id ?? null}
        onSelect={(m) => setSelected(m)}
      />

      <main className="flex-1 min-w-0 overflow-y-auto bg-background">
        <div className="max-w-3xl px-6 lg:px-8 py-6 space-y-6">
          {!selected ? (
            <>
              <header>
                <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground mb-2">
                  <Layers className="h-3.5 w-3.5" />
                  Contexto
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground font-serif">
                  Briefing executivo por liderado
                </h1>
                <p className="mt-2 text-[15px] text-muted-foreground max-w-2xl leading-relaxed">
                  A Rhitmo lê tudo o que foi registrado sobre cada pessoa
                  (diário, 1:1s, kudos, metas, Pulse, sinais do Slack) e
                  resume em quatro blocos: Ganhos, Riscos, Em movimento e
                  Conversas recentes.
                </p>
              </header>

              <EmptyMemberDetail
                icon={Layers}
                title="Selecione um liderado"
                description="Escolha alguém na lista à esquerda para ver o Briefing Executivo da semana."
              />
            </>
          ) : (
            <>
              <header className="flex items-start gap-3">
                <MemberAvatar
                  memberId={selected.id}
                  memberName={selected.name}
                  avatarUrl={selected.avatar}
                  size="lg"
                />
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-1">
                    Contexto
                  </p>
                  <h1 className="text-2xl font-bold tracking-tight text-foreground font-serif truncate">
                    {selected.name}
                  </h1>
                  {selected.role && (
                    <p className="text-[13px] text-muted-foreground truncate">
                      {selected.role}
                    </p>
                  )}
                </div>
              </header>

              <ExecutiveBrief
                brief={brief}
                isLoading={isLoading}
                isRefreshing={isRefreshing}
                windowDays={windowDays}
                onWindowChange={setWindowDays}
                onRefresh={refresh}
              />
            </>
          )}
        </div>
      </main>
    </div>
  );
}
