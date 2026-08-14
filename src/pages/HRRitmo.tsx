import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHRAdmin } from '@/components/HRAdminGuard';
import { Loader2, ArrowLeft, EyeOff, MonitorPlay, Users, CalendarClock, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { LeaderScreensPreview } from '@/components/hr/LeaderScreensPreview';
import { MemberRhythmProfile } from '@/components/hr/MemberRhythmProfile';

interface LeaderRhythm {
  leader_id: string;
  leader_name: string | null;
  leader_email: string | null;
  total_members: number;
  members_with_recent_1on1: number;
  last_feedback_at: string | null;
  days_since_last_feedback: number;
  formal_reviews_12m: number;
}

interface MemberRhythm {
  member_id: string;
  member_name: string;
  member_role: string | null;
  invite_status: string | null;
  last_feedback_at: string | null;
  days_since_last_feedback: number;
  feedback_count_90d: number;
  review_status: 'none' | 'draft' | 'shared' | 'acknowledged';
  last_review_at: string | null;
  has_active_plan: boolean;
}

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('pt-BR') : '—';

function coverageTone(pct: number) {
  if (pct >= 80) return 'text-emerald-600';
  if (pct >= 50) return 'text-amber-600';
  return 'text-rose-600';
}

function recencyTone(days: number) {
  if (days <= 7) return 'text-emerald-600';
  if (days <= 14) return 'text-amber-600';
  return 'text-rose-600';
}

const REVIEW_LABEL: Record<MemberRhythm['review_status'], string> = {
  none: 'Sem avaliação',
  draft: 'Rascunho',
  shared: 'Compartilhada',
  acknowledged: 'Reconhecida',
};

export default function HRRitmo() {
  const { workspaceId, workspaceName } = useHRAdmin();
  const [selected, setSelected] = useState<LeaderRhythm | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const { data: leaders, isLoading } = useQuery({
    queryKey: ['hr-rhythm-overview', workspaceId],
    queryFn: async (): Promise<LeaderRhythm[]> => {
      const { data, error } = await supabase.rpc('get_hr_rhythm_overview', {
        _workspace_id: workspaceId,
      });
      if (error) throw error;
      return ((data as { leaders?: LeaderRhythm[] })?.leaders ?? []);
    },
    enabled: !!workspaceId,
    staleTime: 2 * 60 * 1000,
  });

  const { data: members, isLoading: loadingDetail } = useQuery({
    queryKey: ['hr-rhythm-detail', workspaceId, selected?.leader_id],
    queryFn: async (): Promise<MemberRhythm[]> => {
      const { data, error } = await supabase.rpc('get_hr_leader_rhythm_detail', {
        _workspace_id: workspaceId,
        _leader_user_id: selected!.leader_id,
      });
      if (error) throw error;
      return ((data as { members?: MemberRhythm[] })?.members ?? []);
    },
    enabled: !!workspaceId && !!selected,
    staleTime: 2 * 60 * 1000,
  });

  return (
    <div className="min-h-dvh">
      {/* Header */}
      <div className="border-b border-border/40 bg-gradient-to-b from-muted/40 to-transparent">
        <div className="max-w-6xl mx-auto px-6 py-10 sm:py-12">
          <div className="flex items-center gap-2 mb-3">
            <span className="h-px w-6 bg-primary/50" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Visão BP
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground font-serif">
            Ritmo de liderança
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Cobertura e cadência das 1:1s em {workspaceName}. Aqui você vê quem está mantendo o ritmo
            e onde falta acompanhamento — sem acessar o conteúdo privado das anotações dos líderes.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="gap-1 rounded-xl text-[11px]">
              <EyeOff className="h-3 w-3" /> Somente datas, contagens e status
            </Badge>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl gap-2"
              onClick={() => setPreviewOpen(true)}
            >
              <MonitorPlay className="h-4 w-4" />
              Ver as telas do líder
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : selectedMemberId ? (
          <MemberRhythmProfile
            workspaceId={workspaceId}
            memberId={selectedMemberId}
            onBack={() => setSelectedMemberId(null)}
            onOpenPreview={() => setPreviewOpen(true)}
          />
        ) : selected ? (
          <div className="space-y-5">
            <Button
              variant="ghost"
              size="sm"
              className="rounded-xl gap-2 -ml-2"
              onClick={() => {
                setSelected(null);
                setSelectedMemberId(null);
              }}
            >
              <ArrowLeft className="h-4 w-4" /> Todos os líderes
            </Button>


            <div>
              <h2 className="text-2xl font-bold tracking-tight font-serif">
                {selected.leader_name || selected.leader_email}
              </h2>
              <p className="text-sm text-muted-foreground">{selected.leader_email}</p>
            </div>

            {loadingDetail ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (members?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum liderado ativo neste time.</p>
            ) : (
              <div className="rounded-2xl border border-border/50 bg-card shadow-[0_2px_20px_rgba(0,0,0,0.04)] overflow-hidden">
                <div className="hidden sm:grid grid-cols-[1.4fr_1fr_0.8fr_1fr_0.8fr] gap-3 px-5 py-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground border-b border-border/40">
                  <span>Liderado</span>
                  <span>Último registro</span>
                  <span>90 dias</span>
                  <span>Avaliação formal</span>
                  <span>PDI</span>
                </div>
                {members!.map((m) => (
                  <button
                    key={m.member_id}
                    type="button"
                    onClick={() => setSelectedMemberId(m.member_id)}
                    className="w-full text-left grid sm:grid-cols-[1.4fr_1fr_0.8fr_1fr_0.8fr] gap-1 sm:gap-3 px-5 py-3 border-b border-border/30 last:border-0 text-sm transition-colors hover:bg-muted/40"
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">{m.member_name}</p>
                      {m.member_role && (
                        <p className="text-xs text-muted-foreground truncate">{m.member_role}</p>
                      )}
                    </div>
                    <span className={cn('text-xs sm:text-sm', recencyTone(m.days_since_last_feedback))}>
                      {m.last_feedback_at
                        ? `${fmt(m.last_feedback_at)} · ${m.days_since_last_feedback}d`
                        : 'Nunca'}
                    </span>
                    <span className="text-xs sm:text-sm text-muted-foreground">
                      {m.feedback_count_90d} registros
                    </span>
                    <span className="text-xs sm:text-sm text-muted-foreground">
                      {REVIEW_LABEL[m.review_status]}
                      {m.last_review_at ? ` · ${fmt(m.last_review_at)}` : ''}
                    </span>
                    <span className="text-xs sm:text-sm text-muted-foreground">
                      {m.has_active_plan ? 'Ativo' : '—'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (leaders?.length ?? 0) === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum líder com time ativo neste workspace.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {leaders!.map((l) => {
              const pct = l.total_members
                ? Math.round((l.members_with_recent_1on1 / l.total_members) * 100)
                : 0;
              return (
                <button
                  key={l.leader_id}
                  type="button"
                  onClick={() => setSelected(l)}
                  className="text-left rounded-2xl border border-border/50 bg-card p-5 shadow-[0_2px_20px_rgba(0,0,0,0.04)] transition-transform hover:-translate-y-1"
                >
                  <p className="font-semibold tracking-tight truncate">
                    {l.leader_name || l.leader_email}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{l.leader_email}</p>

                  <div className="mt-4 flex items-baseline gap-2">
                    <span className={cn('text-3xl font-bold tracking-tight', coverageTone(pct))}>
                      {pct}%
                    </span>
                    <span className="text-xs text-muted-foreground">cobertura em 30 dias</span>
                  </div>

                  <div className="mt-4 space-y-1.5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-2">
                      <Users className="h-3.5 w-3.5" />
                      {l.members_with_recent_1on1}/{l.total_members} liderados com registro
                    </span>
                    <span className="flex items-center gap-2">
                      <CalendarClock className="h-3.5 w-3.5" />
                      Último registro: {l.last_feedback_at ? fmt(l.last_feedback_at) : 'nunca'}
                    </span>
                    <span className="flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5" />
                      {l.formal_reviews_12m} avaliações formais (12 meses)
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <LeaderScreensPreview open={previewOpen} onOpenChange={setPreviewOpen} />
    </div>
  );
}
