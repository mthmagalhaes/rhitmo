import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Clock, FileText } from 'lucide-react';

interface AtRiskMember {
  member_id: string;
  member_name: string;
  member_role: string;
  leader_name: string;
  days_since_feedback: number;
  has_pdi: boolean;
}

interface RiskTableProps {
  members: AtRiskMember[];
  isLoading?: boolean;
}

export function RiskTable({ members, isLoading }: RiskTableProps) {
  if (isLoading) {
    return (
      <Card className="rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)] border-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold tracking-tight flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            Membros em Risco
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
            Carregando...
          </div>
        </CardContent>
      </Card>
    );
  }

  const getSeverity = (days: number) => {
    if (days >= 60) return { label: 'Crítico', variant: 'destructive' as const, color: 'bg-destructive/10 text-destructive' };
    if (days >= 45) return { label: 'Alto', variant: 'secondary' as const, color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' };
    return { label: 'Atenção', variant: 'outline' as const, color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' };
  };

  return (
    <Card className="rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)] border-0">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold tracking-tight flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          Membros em Risco
          {members.length > 0 && (
            <Badge variant="secondary" className="rounded-full text-xs ml-1">
              {members.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {members.length === 0 ? (
          <div className="h-[200px] flex flex-col items-center justify-center text-muted-foreground text-sm gap-2">
            <span className="text-2xl">🎉</span>
            Nenhum membro em risco! Todos receberam feedback recente.
          </div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
            {members.map((m) => {
              const severity = getSeverity(m.days_since_feedback);
              return (
                <div
                  key={m.member_id}
                  className="flex items-center justify-between p-3 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">{m.member_name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {m.member_role} · Líder: {m.leader_name}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-3 shrink-0">
                    {!m.has_pdi && (
                      <Badge variant="outline" className="text-xs gap-1 rounded-lg">
                        <FileText className="h-3 w-3" />
                        Sem PDI
                      </Badge>
                    )}
                    <Badge className={`text-xs gap-1 rounded-lg border-0 ${severity.color}`}>
                      <Clock className="h-3 w-3" />
                      {m.days_since_feedback === 999 ? 'Nunca' : `${m.days_since_feedback}d`}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
