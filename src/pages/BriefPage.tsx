import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, ExternalLink, Loader2, PenSquare, User, CheckCircle } from 'lucide-react';
import { format, isToday, isTomorrow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface BriefData {
  suggested_agenda: { topic: string; rationale: string }[];
  pending_items: { description: string; from_note: string; date: string }[];
  context_summary: string;
  coaching_reminder: string;
}

const BriefPage = () => {
  const { meetingId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [meeting, setMeeting] = useState<any>(null);
  const [memberName, setMemberName] = useState('');
  const [memberId, setMemberId] = useState('');
  const [brief, setBrief] = useState<BriefData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user || !meetingId) return;

    const fetchMeetingAndBrief = async () => {
      setLoading(true);
      try {
        // Fetch meeting - cast to any to handle new columns not yet in types
        const { data: mtg, error: mtgErr } = await supabase
          .from('upcoming_meetings')
          .select('*')
          .eq('id', meetingId)
          .single();

        if (mtgErr || !mtg) {
          setError('Reunião não encontrada.');
          setLoading(false);
          return;
        }

        setMeeting(mtg);

        // Fetch member name
        if (mtg.member_id) {
          const { data: member } = await supabase
            .from('team_members')
            .select('name, id')
            .eq('id', mtg.member_id)
            .single();
          if (member) {
            setMemberName(member.name);
            setMemberId(member.id);
          }
        }

        // Check cache (brief_cache column added via migration, access via any cast)
        const mtgAny = mtg as any;
        if (mtgAny.brief_cache && mtgAny.brief_generated_at) {
          const generatedAt = new Date(mtgAny.brief_generated_at);
          const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);
          if (generatedAt > thirtyMinAgo) {
            setBrief(mtgAny.brief_cache as BriefData);
            setLoading(false);
            return;
          }
        }

        // Generate brief
        setLoading(false);
        setGenerating(true);
        const { data: fnData, error: fnError } = await supabase.functions.invoke('generate-brief', {
          body: { meetingId },
        });

        if (fnError) {
          console.error('Brief generation error:', fnError);
          setError('Erro ao gerar o brief. Tente novamente.');
          setGenerating(false);
          return;
        }

        if (fnData?.brief) {
          setBrief(fnData.brief);
          if (fnData.member_name) setMemberName(fnData.member_name);
          if (fnData.member_id) setMemberId(fnData.member_id);
        }
        setGenerating(false);
      } catch (e) {
        console.error(e);
        setError('Erro inesperado.');
        setLoading(false);
        setGenerating(false);
      }
    };

    fetchMeetingAndBrief();
  }, [user, meetingId]);

  if (authLoading || loading) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        <Skeleton className="h-8 w-48 mb-4 rounded-xl" />
        <Skeleton className="h-6 w-72 mb-8 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="col-span-2 h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4 gap-2 rounded-xl">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
        <div className="rounded-2xl bg-card border border-border/50 shadow-[0_2px_20px_rgba(0,0,0,0.04)] p-8 text-center">
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  const startDate = meeting ? new Date(meeting.start_time) : new Date();
  const today = isToday(startDate);
  const tomorrow = isTomorrow(startDate);

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div>
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-2 gap-2 rounded-xl -ml-2">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Brief — {memberName}
            </h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-sm text-muted-foreground">
                {format(startDate, "HH:mm", { locale: ptBR })} · {meeting?.title || '1:1'}
              </span>
              {today && (
                <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-200">
                  Hoje às {format(startDate, "HH:mm")}
                </Badge>
              )}
              {tomorrow && (
                <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 border-blue-200">
                  Amanhã às {format(startDate, "HH:mm")}
                </Badge>
              )}
            </div>
          </div>
          {meeting?.meet_link && (
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl gap-2 shrink-0"
              onClick={() => window.open(meeting.meet_link, '_blank')}
            >
              <ExternalLink className="h-4 w-4" />
              Abrir no Google Meet
            </Button>
          )}
        </div>
      </div>

      {/* Generating state */}
      {generating && !brief && (
        <div className="rounded-2xl bg-card border border-border/50 shadow-[0_2px_20px_rgba(0,0,0,0.04)] p-8">
          <div className="flex flex-col items-center justify-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">Preparando seu brief...</p>
              <p className="text-xs text-muted-foreground mt-1">
                Analisando histórico e pendências com IA
              </p>
            </div>
            <div className="w-full max-w-sm space-y-3 mt-2">
              <Skeleton className="h-4 w-full rounded" />
              <Skeleton className="h-4 w-3/4 rounded" />
              <Skeleton className="h-4 w-5/6 rounded" />
            </div>
          </div>
        </div>
      )}

      {/* Brief content */}
      {brief && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Suggested Agenda */}
            <div className="md:col-span-2 rounded-2xl bg-card border border-border/50 shadow-[0_2px_20px_rgba(0,0,0,0.04)] p-6">
              <h2 className="text-base font-semibold text-foreground mb-4 tracking-tight">
                📋 Pauta Sugerida
              </h2>
              <ol className="space-y-3">
                {brief.suggested_agenda.map((item, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="text-sm font-bold text-primary mt-0.5 shrink-0">
                      {i + 1}.
                    </span>
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.topic}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.rationale}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            {/* Pending Items */}
            <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 shadow-[0_2px_20px_rgba(0,0,0,0.04)] p-6">
              <h2 className="text-base font-semibold text-foreground mb-4 tracking-tight">
                ⏳ Pendências
              </h2>
              {brief.pending_items.length === 0 ? (
                <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                  <CheckCircle className="h-4 w-4" />
                  Nenhuma pendência identificada
                </div>
              ) : (
                <ul className="space-y-3">
                  {brief.pending_items.map((item, i) => (
                    <li key={i}>
                      <p className="text-sm text-foreground">{item.description}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        de: {item.from_note} ({item.date})
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Context Summary */}
          <div className="rounded-2xl bg-violet-50 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-900/30 shadow-[0_2px_20px_rgba(0,0,0,0.04)] p-6">
            <h2 className="text-base font-semibold text-foreground mb-3 tracking-tight">
              🧠 Contexto atual
            </h2>
            <p className="text-sm text-foreground leading-relaxed">{brief.context_summary}</p>
            {brief.coaching_reminder && (
              <div className="mt-4 flex items-start gap-2">
                <Badge variant="secondary" className="rounded-lg shrink-0 text-xs">
                  💡 Lembrete
                </Badge>
                <p className="text-sm text-muted-foreground">{brief.coaching_reminder}</p>
              </div>
            )}
          </div>

          {/* Footer actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              className="rounded-xl gap-2 flex-1"
              onClick={() => navigate(`/member/${memberId}?openNote=true`)}
            >
              <PenSquare className="h-4 w-4" />
              Iniciar Anotação para {memberName}
            </Button>
            <Button
              variant="outline"
              className="rounded-xl gap-2"
              onClick={() => navigate(`/member/${memberId}`)}
            >
              <User className="h-4 w-4" />
              Abrir perfil completo
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default BriefPage;
