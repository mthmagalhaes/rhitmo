import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, ExternalLink, Loader2, PenSquare, User, AlertTriangle } from 'lucide-react';
import { format, isToday, isTomorrow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface BriefData {
  suggested_agenda: { topic: string; rationale: string }[];
  pending_items: { description: string; from_note: string; date: string }[];
  context_summary: string;
  coaching_reminder: string;
}

const STOPWORDS = new Set([
  'sobre','para','como','este','esta','esse','essa','dele','dela','pelos','pelas',
  'ainda','depois','antes','durante','muito','pouco','algum','alguma','nenhum',
  'nenhuma','outro','outra','todos','todas','quando','onde','porque','enquanto',
  'sendo','foram','seria','tinha','havia','estar','estão','estava','fazer',
  'feito','vamos','isso','isto','aquele','aquela','aquilo','sempre','nunca',
  'também','agora','antes','assim','aqui','desde',
]);

const normalize = (s: string) =>
  (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const keywords = (text: string) =>
  normalize(text).split(' ').filter((w) => w.length > 4 && !STOPWORDS.has(w));

function matchPendingToAgenda(brief: BriefData) {
  const agenda = brief.suggested_agenda.map((a) => ({
    ...a,
    pendings: [] as BriefData['pending_items'],
  }));
  const unmatched: BriefData['pending_items'] = [];
  const sets = agenda.map((a) => new Set(keywords(`${a.topic} ${a.rationale}`)));

  for (const p of brief.pending_items || []) {
    const pKw = keywords(`${p.description} ${p.from_note}`);
    let bestIdx = -1;
    let bestScore = 0;
    sets.forEach((set, i) => {
      let score = 0;
      for (const k of pKw) if (set.has(k)) score++;
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    });
    if (bestIdx >= 0 && bestScore >= 1) agenda[bestIdx].pendings.push(p);
    else unmatched.push(p);
  }
  return { agenda, unmatched };
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

        const mtgAny = mtg as any;
        if (mtgAny.brief_cache && mtgAny.brief_generated_at) {
          const generatedAt = new Date(mtgAny.brief_generated_at);
          if (generatedAt > new Date(Date.now() - 30 * 60 * 1000)) {
            setBrief(mtgAny.brief_cache as BriefData);
            setLoading(false);
            return;
          }
        }

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

  const matched = useMemo(() => (brief ? matchPendingToAgenda(brief) : null), [brief]);

  if (authLoading || loading) {
    return (
      <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
        <Skeleton className="h-6 w-32 rounded-xl" />
        <Skeleton className="h-8 w-72 rounded-xl" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-4 sm:p-6">
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
    <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-8">
      {/* Header */}
      <div>
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-2 gap-2 rounded-xl -ml-2">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="font-serif text-3xl font-bold tracking-tight text-foreground">
              Brief — {memberName}
            </h1>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="text-sm text-muted-foreground">
                {format(startDate, "HH:mm", { locale: ptBR })} · {meeting?.title || '1:1'}
              </span>
              {today && (
                <Badge variant="outline" className="text-[11px] bg-amber-500/10 text-amber-600 border-amber-200">
                  Hoje
                </Badge>
              )}
              {tomorrow && (
                <Badge variant="outline" className="text-[11px] bg-blue-500/10 text-blue-600 border-blue-200">
                  Amanhã
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
              Abrir Meet
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
          </div>
        </div>
      )}

      {brief && matched && (
        <>
          {/* Leitura do momento */}
          {brief.context_summary && (
            <section className="rounded-2xl bg-card border border-border/50 shadow-[0_2px_20px_rgba(0,0,0,0.04)] p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-3">
                🧠 Leitura do momento
              </p>
              <p className="text-base text-foreground leading-relaxed">
                {brief.context_summary}
              </p>
            </section>
          )}

          {/* Pauta sugerida */}
          {matched.agenda.length > 0 && (
            <section className="rounded-2xl bg-card border border-border/50 shadow-[0_2px_20px_rgba(0,0,0,0.04)] p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-4">
                📋 Pauta sugerida
              </p>
              <ol className="space-y-5">
                {matched.agenda.map((item, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="text-sm font-bold text-primary mt-0.5 shrink-0 w-6">
                      {i + 1}.
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{item.topic}</p>
                      <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                        {item.rationale}
                      </p>
                      {item.pendings.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {item.pendings.map((p, j) => (
                            <Badge
                              key={j}
                              variant="outline"
                              className="text-[11px] bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/40 rounded-md gap-1 font-normal"
                              title={`${p.description} · de "${p.from_note}"`}
                            >
                              <AlertTriangle className="h-3 w-3" />
                              pendente desde {p.date}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
                {matched.unmatched.map((p, i) => (
                  <li key={`u-${i}`} className="flex gap-3">
                    <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground">{p.description}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        de "{p.from_note}" · {p.date}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {/* Como conduzir */}
          {brief.coaching_reminder && (
            <section className="rounded-2xl bg-violet-50/60 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-900/30 shadow-[0_2px_20px_rgba(0,0,0,0.04)] p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-700 dark:text-violet-300 mb-3">
                💡 Como conduzir
              </p>
              <p className="text-base text-foreground leading-relaxed">
                {brief.coaching_reminder}
              </p>
            </section>
          )}

          {/* Footer actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              className="rounded-xl gap-2 flex-1"
              onClick={() => navigate(`/member/${memberId}?openNote=true`)}
            >
              <PenSquare className="h-4 w-4" />
              Iniciar anotação
            </Button>
            <Button
              variant="outline"
              className="rounded-xl gap-2"
              onClick={() => navigate(`/member/${memberId}`)}
            >
              <User className="h-4 w-4" />
              Abrir perfil
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default BriefPage;
