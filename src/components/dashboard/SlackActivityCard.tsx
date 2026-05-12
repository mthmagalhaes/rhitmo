// Card "Atividade no Slack" — mostra o último rollup semanal do liderado
// gerado por slack-weekly-rollup. Fonte: context_evidence
// (evidence_type='slack_activity_rollup', visibility='private_leader').
// Aparece para o líder ao selecionar um liderado em /lider/1on1s.
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Hash, Users, Sparkles, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { SlackIcon } from '@/components/icons/SlackIcon';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface RollupMetadata {
  themes?: string[];
  top_collaborators?: { name: string; count?: number }[];
  top_channels?: string[];
  evidence_count?: number;
  window_start?: string;
  window_end?: string;
  window_days?: number;
}

interface RollupRow {
  id: string;
  summary: string | null;
  occurred_at: string;
  metadata: RollupMetadata | null;
}

export function SlackActivityCard({ memberId }: { memberId: string }) {
  const { data, isLoading } = useQuery<RollupRow | null>({
    queryKey: ['slack-rollup', memberId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('context_evidence')
        .select('id, summary, occurred_at, metadata')
        .eq('member_id', memberId)
        .eq('evidence_type', 'slack_activity_rollup')
        .order('occurred_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as RollupRow) ?? null;
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <Card className="rounded-2xl border-0 shadow-[0_2px_20px_rgba(0,0,0,0.04)] p-5 space-y-3">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-16 w-full" />
      </Card>
    );
  }

  const meta = data?.metadata ?? null;
  const themes = meta?.themes?.slice(0, 3) ?? [];
  const collaborators = meta?.top_collaborators?.slice(0, 3) ?? [];
  const channels = meta?.top_channels?.slice(0, 3) ?? [];
  const hasContent = data && (themes.length || collaborators.length || channels.length);

  return (
    <Card className="rounded-2xl border-0 shadow-[0_2px_20px_rgba(0,0,0,0.04)] p-5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <SlackIcon className="h-4 w-4" />
          <h3 className="text-sm font-semibold tracking-tight">Atividade no Slack</h3>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            Últimos {meta?.window_days ?? 7} dias
          </Badge>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="text-muted-foreground hover:text-foreground" aria-label="Como funciona">
                <Info className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-xs text-xs">
              Resumo agregado de canais públicos onde o bot Rhitmo está. Sem DMs, sem privados,
              sem texto bruto. Visível só para você.
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {!hasContent ? (
        <p className="text-sm text-muted-foreground italic">
          Sem sinais relevantes nos últimos 7 dias.
        </p>
      ) : (
        <div className="space-y-3">
          {themes.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-1.5">
                Top temas
              </p>
              <div className="flex flex-wrap gap-1.5">
                {themes.map((t) => (
                  <Badge key={t} variant="outline" className="rounded-lg text-[11px] font-normal">
                    <Sparkles className="h-2.5 w-2.5 mr-1 text-primary" />
                    {t}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {collaborators.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-1.5">
                Mais conversa com
              </p>
              <div className="flex flex-wrap gap-1.5">
                {collaborators.map((c) => (
                  <Badge key={c.name} variant="secondary" className="rounded-lg text-[11px] font-normal">
                    <Users className="h-2.5 w-2.5 mr-1" />
                    {c.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {channels.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-1.5">
                Canais ativos
              </p>
              <div className="flex flex-wrap gap-1.5">
                {channels.map((c) => (
                  <span key={c} className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Hash className="h-2.5 w-2.5" />
                    {c.replace(/^#/, '')}
                  </span>
                ))}
              </div>
            </div>
          )}

          {data?.summary && (
            <p className="text-[13px] italic text-muted-foreground/90 leading-relaxed pt-1 border-t border-border/40">
              {data.summary}
            </p>
          )}

          {data?.occurred_at && (
            <p className="text-[10px] text-muted-foreground/60">
              Atualizado {formatDistanceToNow(new Date(data.occurred_at), { addSuffix: true, locale: ptBR })}
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
