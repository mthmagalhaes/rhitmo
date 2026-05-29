// Painel "Saúde do Slack" — embutido no card Slack em /lider/configuracoes.
// Mostra status do orquestrador, próximas 1:1s na janela de brief, última
// DM enviada e quantidade de sinais ambient capturados. Inclui botão de
// teste manual que dispara o brief AGORA via admin-test-orchestrator.
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Activity, Calendar, Send, Sparkles, Loader2, FlaskConical } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { safeRpc, safeFunctionInvoke } from '@/lib/supabaseSafe';


interface OrchestratorHealth {
  last_orchestrator_run: string | null;
  last_orchestrator_status: string | null;
  upcoming_briefs_count: number;
  next_meeting: {
    id: string;
    title: string | null;
    start_time: string;
    member_name: string | null;
    brief_sent: boolean;
  } | null;
  last_brief_sent_at: string | null;
  last_pulse_sent_at: string | null;
  slack_signals_7d: number;
}

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2 text-[11px] leading-relaxed">
      <Icon className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground/90 ml-auto text-right">{value}</span>
    </div>
  );
}

function relTime(iso: string | null): string {
  if (!iso) return '—';
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: ptBR });
  } catch {
    return '—';
  }
}

export function SlackHealthPanel() {
  const { id: effectiveUserId } = useEffectiveUser();
  const { toast } = useToast();
  const [testing, setTesting] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['slack-orchestrator-health', effectiveUserId],
    enabled: !!effectiveUserId,
    staleTime: 30_000,
    retry: 1,
    queryFn: async () => {
      return await safeRpc<OrchestratorHealth>('get_slack_orchestrator_health', {
        p_user_id: effectiveUserId!,
      });
    },
  });

  const handleTest = async () => {
    setTesting(true);
    try {
      const res = await safeFunctionInvoke<{
        ok: boolean;
        scenario?: string;
        member_name?: string;
        stage?: string;
      }>('admin-test-orchestrator', {});
      if (res?.ok) {
        toast({
          title: 'DM de teste enviada ao Slack',
          description:
            res.scenario === 'brief'
              ? `Brief de 1:1 com ${res.member_name} disparado.`
              : 'Sem 1:1 na janela; enviei um ping confirmando que o orquestrador está online.',
        });
        refetch();
      } else {
        toast({
          title: 'Não consegui enviar',
          description:
            res?.stage === 'no_slack_integration'
              ? 'Conecte o Slack antes de testar.'
              : 'Tente novamente em alguns segundos.',
          variant: 'destructive',
        });
      }
    } catch (err) {
      console.error('[SlackHealthPanel] test failed', err);
      toast({ title: 'Erro inesperado', variant: 'destructive' });
    } finally {
      setTesting(false);
    }
  };


  if (isLoading) {
    return (
      <div className="mt-3 rounded-xl border border-border/50 bg-muted/20 px-3 py-2.5">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          Carregando saúde do orquestrador…
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="mt-3 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2.5 space-y-2">
        <p className="text-[11px] text-destructive/90 leading-relaxed">
          Não consegui carregar a saúde do orquestrador.
          {error instanceof Error && (
            <span className="block text-[10px] text-destructive/70 mt-0.5 font-mono break-all">
              {error.message}
            </span>
          )}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="w-full rounded-xl text-xs"
          onClick={() => refetch()}
        >
          Tentar novamente
        </Button>
      </div>
    );
  }

  const nextMeetingLabel = data.next_meeting
    ? `${data.next_meeting.member_name ?? '—'} · ${format(
        new Date(data.next_meeting.start_time),
        "dd/MM 'às' HH:mm",
        { locale: ptBR },
      )}`
    : 'Nenhuma agendada';

  return (
    <div className="mt-3 rounded-xl border border-border/50 bg-muted/20 px-3 py-2.5 space-y-1.5">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Saúde do orquestrador
        </span>
        <span className="text-[10px] text-muted-foreground">
          {data.last_orchestrator_status === 'succeeded' ? '🟢' : '🟡'}{' '}
          {relTime(data.last_orchestrator_run)}
        </span>
      </div>

      <Row
        icon={Calendar}
        label="Próximas 1:1s (janela 20h)"
        value={`${data.upcoming_briefs_count} pendente${data.upcoming_briefs_count === 1 ? '' : 's'}`}
      />
      <Row icon={Calendar} label="Próxima reunião" value={nextMeetingLabel} />
      <Row icon={Send} label="Último brief enviado" value={relTime(data.last_brief_sent_at)} />
      <Row icon={Send} label="Último pulse enviado" value={relTime(data.last_pulse_sent_at)} />
      <Row icon={Sparkles} label="Sinais Slack (7d)" value={String(data.slack_signals_7d)} />

      <Button
        variant="outline"
        size="sm"
        className="w-full rounded-xl text-xs mt-2"
        onClick={handleTest}
        disabled={testing}
      >
        {testing ? (
          <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
        ) : (
          <FlaskConical className="h-3 w-3 mr-1.5" />
        )}
        Enviar brief de teste agora
      </Button>
    </div>
  );
}
