// Página de teste — Fase 1 da migração 1:1s → Pessoas.
// Rota oculta: /lider/pessoas-v2 (não aparece na sidebar).
// Lista densa estilo Tako/Windmill: 1 clique → ficha do liderado.
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { differenceInDays, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronRight, Search, UserPlus, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MemberAvatar } from '@/components/MemberAvatar';
import { NewMemberDialog } from '@/components/NewMemberDialog';
import { useLeaderMembers, type LeaderMemberRow } from '@/hooks/useLeaderMembers';
import { cn } from '@/lib/utils';

const HEALTH_CLASSES = {
  fresh: 'bg-emerald-500',
  warm: 'bg-amber-500',
  cold: 'bg-rose-500',
} as const;

function getHealth(lastIso: string): keyof typeof HEALTH_CLASSES {
  const days = differenceInDays(new Date(), new Date(lastIso));
  if (days <= 7) return 'fresh';
  if (days <= 14) return 'warm';
  return 'cold';
}

export default function LiderPessoasV2() {
  const navigate = useNavigate();
  const { workspace, teams, members, isLoading } = useLeaderMembers();
  const [query, setQuery] = useState('');
  const [teamId, setTeamId] = useState<string>('all');
  const [newMemberOpen, setNewMemberOpen] = useState(false);

  const teamById = useMemo(
    () => Object.fromEntries(teams.map((t) => [t.id, t.name])),
    [teams],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members
      .filter((m) => (teamId === 'all' ? true : m.team_id === teamId))
      .filter((m) =>
        q
          ? m.name.toLowerCase().includes(q) ||
            (m.role ?? '').toLowerCase().includes(q)
          : true,
      )
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [members, query, teamId]);

  return (
    <div className="max-w-5xl mx-auto px-6 lg:px-8 py-8 space-y-6">
      {/* Header editorial */}
      <header className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Versão de teste · /lider/pessoas-v2
        </p>
        <h1 className="font-serif text-3xl font-bold tracking-tight">
          Pessoas
        </h1>
        <p className="text-sm text-muted-foreground">
          Seu time num único clique. Selecione um liderado para abrir a ficha completa.
        </p>
      </header>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Procurar por nome ou cargo"
            className="pl-9 h-10 rounded-xl bg-card border-border/50"
          />
        </div>
        <div className="flex items-center gap-2">
          {teams.length > 1 && (
            <Select value={teamId} onValueChange={setTeamId}>
              <SelectTrigger className="h-10 w-[180px] rounded-xl bg-card border-border/50 text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os times</SelectItem>
                {teams
                  .slice()
                  .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
                  .map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          )}
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {filtered.length} de {members.length}
          </span>
        </div>
      </div>

      {/* Tabela densa */}
      <div className="rounded-2xl border border-border/50 bg-card overflow-hidden shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
        {/* Header row */}
        <div className="grid grid-cols-[1fr_180px_140px_140px_24px] gap-3 px-4 py-2.5 bg-muted/30 border-b border-border/40 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          <div>Nome</div>
          <div>Cargo</div>
          <div>Time</div>
          <div>Último sinal</div>
          <div />
        </div>

        {isLoading ? (
          <div className="px-4 py-12 text-center text-sm text-muted-foreground">
            Carregando liderados…
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <Users className="h-6 w-6 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {members.length === 0
                ? 'Nenhum liderado cadastrado ainda.'
                : 'Nenhum liderado encontrado com esses filtros.'}
            </p>
          </div>
        ) : (
          <ul>
            {filtered.map((m: LeaderMemberRow) => {
              const health = getHealth(m.last_feedback_date);
              const teamName = m.team_id ? teamById[m.team_id] ?? '—' : '—';
              return (
                <li key={m.id} className="border-b border-border/30 last:border-b-0">
                  <button
                    type="button"
                    onClick={() => navigate(`/member/${m.id}`)}
                    className="group w-full grid grid-cols-[1fr_180px_140px_140px_24px] gap-3 px-4 py-2.5 items-center text-left hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative shrink-0">
                        <MemberAvatar
                          memberId={m.id}
                          memberName={m.name}
                          avatarUrl={m.avatar}
                          size="sm"
                        />
                        <span
                          className={cn(
                            'absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full ring-2 ring-card',
                            HEALTH_CLASSES[health],
                          )}
                          aria-label={`Saúde: ${health}`}
                        />
                      </div>
                      <span className="text-[13px] font-medium text-foreground truncate">
                        {m.name}
                      </span>
                    </div>
                    <div className="text-[13px] text-muted-foreground truncate">
                      {m.role || '—'}
                    </div>
                    <div className="text-[13px] text-muted-foreground truncate">
                      {teamName}
                    </div>
                    <div className="text-[12px] text-muted-foreground truncate">
                      {formatDistanceToNow(new Date(m.last_feedback_date), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-foreground transition-colors" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {/* Footer row: novo liderado */}
        {workspace && (
          <button
            type="button"
            onClick={() => setNewMemberOpen(true)}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-[13px] text-muted-foreground hover:text-foreground hover:bg-muted/40 border-t border-border/40 transition-colors"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Novo liderado
          </button>
        )}
      </div>

      {/* Nota de rodapé pra Matheus */}
      <p className="text-[11px] text-muted-foreground/70 text-center pt-2">
        Página de teste · Fase 1 da migração. Sem alteração de sidebar, rota
        antiga (<code className="text-[10px]">/lider/1on1s</code>) segue intacta.
      </p>

      {workspace && (
        <NewMemberDialog
          open={newMemberOpen}
          onOpenChange={setNewMemberOpen}
          workspaceId={workspace.id}
        />
      )}
    </div>
  );
}
