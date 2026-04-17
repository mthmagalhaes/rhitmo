import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MessageSquare, FileText, Mic } from 'lucide-react';
import { cn } from '@/lib/utils';

type Workspace = {
  workspace_id: string;
  workspace_name: string;
  created_at: string;
  owner_email: string | null;
  first_activation_at: string | null;
  activation_bucket: 'd1' | 'd7' | 'd30' | 'late' | 'not_activated';
  feedbacks_count: number;
  reviews_count: number;
  transcripts_count: number;
};

type Props = {
  cohortMonth: string | null;
  cohortLabel: string | null;
  onClose: () => void;
};

const bucketLabels: Record<Workspace['activation_bucket'], string> = {
  d1: 'D1 — 24h',
  d7: 'D7 — até 7d',
  d30: 'D30 — até 30d',
  late: 'Atrasado (>30d)',
  not_activated: 'Não ativado',
};

const bucketClass: Record<Workspace['activation_bucket'], string> = {
  d1: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  d7: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  d30: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  late: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
  not_activated: 'bg-muted text-muted-foreground border-border',
};

const formatDate = (s: string) =>
  new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });

export const CohortDrilldownSheet = ({ cohortMonth, cohortLabel, onClose }: Props) => {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-cohort-workspaces', cohortMonth],
    queryFn: async () => {
      if (!cohortMonth) return [];
      const { data, error } = await supabase.rpc('admin_cohort_workspaces', { p_cohort_month: cohortMonth });
      if (error) throw error;
      return (data as unknown as Workspace[]) || [];
    },
    enabled: !!cohortMonth,
  });

  const open = !!cohortMonth;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="sm:max-w-2xl w-full overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="capitalize">Coorte de {cohortLabel}</SheetTitle>
          <SheetDescription>
            {isLoading ? 'Carregando workspaces...' : `${data?.length ?? 0} workspaces — não-ativados primeiro`}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : data && data.length > 0 ? (
            <div className="rounded-xl border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Workspace</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Criado</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ativações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((w) => (
                    <TableRow key={w.workspace_id}>
                      <TableCell className="font-medium max-w-[180px] truncate">{w.workspace_name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[180px] truncate">
                        {w.owner_email || '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatDate(w.created_at)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn('font-medium whitespace-nowrap', bucketClass[w.activation_bucket])}>
                          {bucketLabels[w.activation_bucket]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1" title="Feedbacks">
                            <MessageSquare className="h-3 w-3" />
                            {w.feedbacks_count}
                          </span>
                          <span className="flex items-center gap-1" title="Reviews">
                            <FileText className="h-3 w-3" />
                            {w.reviews_count}
                          </span>
                          <span className="flex items-center gap-1" title="Transcrições">
                            <Mic className="h-3 w-3" />
                            {w.transcripts_count}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-12 text-sm">
              Nenhum workspace nessa coorte.
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
