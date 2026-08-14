// Insight Card — o "AI-Native moment" do Diário v2.
// Calcula gaps de cobertura (liderados sem nota há +14 dias) a partir do
// dataset que a página já carrega. Sem edge function, sem IA — pura agregação
// determinística (calibrada com health-status-logic: 7 / 8-14 / +14).
import { useMemo, useState, useEffect } from 'react';
import { differenceInDays } from 'date-fns';
import { Sparkles, PenSquare, CheckCircle2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MemberAvatar } from '@/components/MemberAvatar';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import type { LeaderMemberRow } from '@/hooks/useLeaderMembers';

interface DiaryCoverageInsightProps {
  members: LeaderMemberRow[];
  onCreateNoteFor: (member: LeaderMemberRow) => void;
}

interface Gap {
  member: LeaderMemberRow;
  /** null = nunca teve nota; number = dias desde a última nota */
  daysSince: number | null;
}

export function DiaryCoverageInsight({ members, onCreateNoteFor }: DiaryCoverageInsightProps) {
  const gaps = useMemo<Gap[]>(() => {
    const now = Date.now();
    return members
      .map<Gap>((m) => {
        if (!m.feedback_count) {
          return { member: m, daysSince: null };
        }
        const days = differenceInDays(now, new Date(m.last_feedback_date));
        return { member: m, daysSince: days };
      })
      .filter((g) => g.daysSince === null || g.daysSince > 14)
      .sort((a, b) => {
        // "nunca" primeiro, depois pelos mais antigos
        if (a.daysSince === null && b.daysSince !== null) return -1;
        if (b.daysSince === null && a.daysSince !== null) return 1;
        return (b.daysSince ?? 0) - (a.daysSince ?? 0);
      });
  }, [members]);

  const { id: userId } = useEffectiveUser();
  const signature = useMemo(
    () => gaps.map((g) => `${g.member.id}:${g.daysSince ?? 'n'}`).join('|'),
    [gaps],
  );
  const storageKey = userId ? `rhitmo:diary-coverage-dismissed:${userId}` : null;
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!storageKey || gaps.length === 0) {
      setDismissed(false);
      return;
    }
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return setDismissed(false);
      const parsed = JSON.parse(raw) as { at: number; sig: string };
      const within7d = Date.now() - parsed.at < 7 * 24 * 60 * 60 * 1000;
      setDismissed(within7d && parsed.sig === signature);
    } catch {
      setDismissed(false);
    }
  }, [storageKey, signature, gaps.length]);

  const handleDismiss = () => {
    if (storageKey) {
      try {
        localStorage.setItem(
          storageKey,
          JSON.stringify({ at: Date.now(), sig: signature }),
        );
      } catch {
        /* noop */
      }
    }
    setDismissed(true);
  };

  // Estado positivo — ninguém atrasado
  if (gaps.length === 0) {
    const mostRecent = members
      .filter((m) => m.feedback_count > 0)
      .sort((a, b) =>
        new Date(b.last_feedback_date).getTime() - new Date(a.last_feedback_date).getTime(),
      )[0];

    return (
      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="h-8 w-8 shrink-0 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">Cobertura em dia.</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Todos os liderados têm nota recente.{' '}
              {mostRecent && (
                <>
                  Última registrada para{' '}
                  <span className="text-foreground/80">{mostRecent.name.split(' ')[0]}</span>.
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (dismissed) return null;

  const top = gaps.slice(0, 3);
  const rest = gaps.length - top.length;

  return (
    <div className="relative rounded-2xl border border-border/60 bg-gradient-to-br from-primary/[0.04] to-transparent p-4 sm:p-5">
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dispensar insight"
        className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors rounded-md p-1 hover:bg-muted/60"
      >
        <X className="h-3.5 w-3.5" />
      </button>
      <div className="flex items-start gap-3">
        <div className="h-8 w-8 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary/80">
            Insight da Rhitmo
          </p>
          <p className="text-sm text-foreground mt-1 leading-relaxed">
            <span className="font-medium">
              {gaps.length === 1 ? '1 liderado' : `${gaps.length} liderados`} sem nota recente.
            </span>{' '}
            <span className="text-muted-foreground">
              Pode valer um registro rápido antes da próxima 1:1.
            </span>
          </p>

          <ul className="mt-3 space-y-1.5">
            {top.map((g) => (
              <li key={g.member.id} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <MemberAvatar
                    memberId={g.member.id}
                    memberName={g.member.name}
                    avatarUrl={g.member.avatar}
                    size="sm"
                    className="h-6 w-6 shrink-0"
                  />
                  <span className="text-sm text-foreground/90 truncate">{g.member.name}</span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {g.daysSince === null ? 'sem notas' : `há ${g.daysSince} dias`}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs gap-1.5 shrink-0"
                  onClick={() => onCreateNoteFor(g.member)}
                >
                  <PenSquare className="h-3 w-3" />
                  Anotar
                </Button>
              </li>
            ))}
          </ul>

          {rest > 0 && (
            <p className="text-xs text-muted-foreground mt-2.5">
              + {rest} {rest === 1 ? 'outro' : 'outros'} com mais de 14 dias sem nota.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
