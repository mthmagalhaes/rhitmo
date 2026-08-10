import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, ArrowLeft, EyeOff, MonitorPlay, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Props {
  workspaceId: string;
  memberId: string;
  onBack: () => void;
  onOpenPreview: () => void;
}

interface Profile {
  member: {
    member_id: string;
    member_name: string;
    member_role: string | null;
    invite_status: string | null;
    member_since: string | null;
    leader_name: string | null;
    leader_email: string | null;
  } | null;
  last_feedback_at: string | null;
  feedback_count_90d: number;
  feedback_count_total: number;
  monthly_counts: { month: string; count: number }[];
  by_source: { source: string; count: number }[];
  reviews: {
    id: string;
    review_type: string;
    period_type: string | null;
    period_start: string | null;
    period_end: string | null;
    created_at: string;
    shared_at: string | null;
    acknowledged_at: string | null;
    status: 'draft' | 'shared' | 'acknowledged';
    evidence_count: number | null;
  }[];
  has_active_plan: boolean;
}

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : '—');

const SOURCE_LABEL: Record<string, string> = {
  recall_bot: 'Transcrição do bot',
  transcript: 'Transcrição enviada',
  upload: 'Upload do líder',
  slack: 'Slack',
  manual: 'Anotação manual',
  magic_paste: 'Colagem rápida',
  pulse: 'Pulse',
};

const REVIEW_STATUS_LABEL: Record<Profile['reviews'][number]['status'], string> = {
  draft: 'Rascunho',
  shared: 'Compartilhada',
  acknowledged: 'Reconhecida',
};

const REVIEW_TYPE_LABEL: Record<string, string> = {
  formal: 'Avaliação formal',
  manager: 'Avaliação do líder',
  self: 'Autoavaliação',
  upwards: 'Avaliação do líder pelo liderado',
  peer: 'Avaliação de pares',
  '360': '360°',
};

function monthLabel(ym: string) {
  const [y, m] = ym.split('-');
  return new Date(Number(y), Number(m) - 1, 1)
    .toLocaleDateString('pt-BR', { month: 'short' })
    .replace('.', '');
}

function daysSince(iso: string | null) {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

export function MemberRhythmProfile({ workspaceId, memberId, onBack, onOpenPreview }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['hr-member-rhythm-profile', workspaceId, memberId],
    queryFn: async (): Promise<Profile | null> => {
      const { data, error } = await supabase.rpc('get_hr_member_rhythm_profile', {
        _workspace_id: workspaceId,
        _member_id: memberId,
      });
      if (error) throw error;
      return data as unknown as Profile;
    },
    enabled: !!workspaceId && !!memberId,
    staleTime: 2 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data?.member) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" className="rounded-xl gap-2 -ml-2" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
        <p className="text-sm text-muted-foreground">Liderado não encontrado neste workspace.</p>
      </div>
    );
  }

  const m = data.member;
  const since = daysSince(data.last_feedback_at);
  const maxMonth = Math.max(1, ...data.monthly_counts.map((x) => x.count));
  const noReviewYet = data.reviews.length === 0;
  const stale = since === null || since > 14;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" className="rounded-xl gap-2 -ml-2" onClick={onBack}>
        <ArrowLeft className="h-4 w-4" /> Voltar para o time
      </Button>

      {/* Privacy strip */}
      <div className="rounded-2xl border border-border/50 bg-muted/40 px-4 py-3 flex items-start gap-2">
        <EyeOff className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
        <p className="text-xs text-muted-foreground">
          Você vê ritmo e status. O conteúdo das anotações, transcrições e avaliações continua
          exclusivo do líder.
        </p>
      </div>

      {/* Header */}
      <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
        <h2 className="text-2xl font-bold tracking-tight font-serif">{m.member_name}</h2>
        <p className="text-sm text-muted-foreground">{m.member_role || 'Sem cargo definido'}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3 text-sm">
          <div>
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Líder</p>
            <p className="font-medium truncate">{m.leader_name || m.leader_email || '—'}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Convite</p>
            <p className="font-medium">{m.invite_status || '—'}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">No time desde</p>
            <p className="font-medium">{fmt(m.member_since)}</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge variant="outline" className="rounded-xl text-[11px]">
            {data.has_active_plan ? 'PDI ativo' : 'Sem PDI ativo'}
          </Badge>
          <Button variant="outline" size="sm" className="rounded-xl gap-2" onClick={onOpenPreview}>
            <MonitorPlay className="h-4 w-4" /> Ver as telas do líder
          </Button>
        </div>
      </div>

      {/* Ritmo */}
      <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Ritmo de 1:1s
        </h3>
        <div className="mt-4 flex flex-wrap gap-8">
          <div>
            <p
              className={cn(
                'text-3xl font-bold tracking-tight',
                since === null || since > 14
                  ? 'text-rose-600'
                  : since > 7
                    ? 'text-amber-600'
                    : 'text-emerald-600',
              )}
            >
              {since === null ? '—' : `${since}d`}
            </p>
            <p className="text-xs text-muted-foreground">
              desde o último registro {data.last_feedback_at ? `(${fmt(data.last_feedback_at)})` : ''}
            </p>
          </div>
          <div>
            <p className="text-3xl font-bold tracking-tight">{data.feedback_count_90d}</p>
            <p className="text-xs text-muted-foreground">registros em 90 dias</p>
          </div>
          <div>
            <p className="text-3xl font-bold tracking-tight">{data.feedback_count_total}</p>
            <p className="text-xs text-muted-foreground">registros no total</p>
          </div>
        </div>

        {data.monthly_counts.length > 0 && (
          <div className="mt-6 flex items-end gap-2 h-24">
            {data.monthly_counts.map((mm) => (
              <div key={mm.month} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] text-muted-foreground">{mm.count}</span>
                <div
                  className="w-full rounded-t-md bg-primary/70"
                  style={{ height: `${(mm.count / maxMonth) * 100}%`, minHeight: 3 }}
                />
                <span className="text-[10px] text-muted-foreground">{monthLabel(mm.month)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Evidências */}
      <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Evidências disponíveis para o líder
        </h3>
        {data.by_source.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Nenhuma evidência registrada ainda.</p>
        ) : (
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {data.by_source.map((s) => (
              <div
                key={s.source}
                className="flex items-center justify-between rounded-xl border border-border/40 px-4 py-2.5 text-sm"
              >
                <span>{SOURCE_LABEL[s.source] ?? s.source}</span>
                <span className="font-semibold">{s.count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Avaliações */}
      <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Avaliações
        </h3>
        {noReviewYet ? (
          <p className="mt-3 text-sm text-muted-foreground">Nenhuma avaliação criada até agora.</p>
        ) : (
          <div className="mt-4 space-y-2">
            {data.reviews.map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/40 px-4 py-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium">
                    {REVIEW_TYPE_LABEL[r.review_type] ?? r.review_type}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {r.period_start || r.period_end
                      ? `${fmt(r.period_start)} — ${fmt(r.period_end)}`
                      : `Criada em ${fmt(r.created_at)}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {r.evidence_count ? (
                    <span className="text-xs text-muted-foreground">
                      {r.evidence_count} evidências
                    </span>
                  ) : null}
                  <Badge variant="outline" className="rounded-xl text-[11px]">
                    {REVIEW_STATUS_LABEL[r.status]}
                    {r.shared_at ? ` · ${fmt(r.shared_at)}` : ''}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {(stale || noReviewYet) && (
        <div className="rounded-2xl border border-amber-300/50 bg-amber-50/60 dark:bg-amber-950/20 p-4 flex items-start gap-3">
          <Lightbulb className="h-4 w-4 mt-0.5 text-amber-600 shrink-0" />
          <div className="text-sm">
            <p className="font-medium">Sugestão para o BP</p>
            <p className="text-muted-foreground">
              {stale && noReviewYet
                ? 'Sem registro recente e sem avaliação no ciclo. Vale conversar com o líder sobre retomar a cadência de 1:1s e iniciar a avaliação.'
                : stale
                  ? 'Mais de 14 dias sem registro de 1:1. Vale conversar com o líder sobre retomar a cadência.'
                  : 'Ainda não há avaliação para este liderado. Vale alinhar o início do ciclo com o líder.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
