import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Lightbulb, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CohortDrilldownSheet } from './CohortDrilldownSheet';

type Cohort = {
  cohort_month: string;
  cohort_label: string;
  total: number;
  d1_count: number;
  d7_count: number;
  d30_count: number;
  d1_pct: number;
  d7_pct: number;
  d30_pct: number;
};

type CohortsData = {
  cohorts: Cohort[];
  insight: string;
};

const cellClass = (pct: number, total: number) => {
  if (total === 0) return 'text-muted-foreground/50';
  if (pct >= 60) return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium';
  if (pct >= 30) return 'bg-amber-500/10 text-amber-700 dark:text-amber-400 font-medium';
  return 'bg-rose-500/10 text-rose-700 dark:text-rose-400 font-medium';
};

export const ActivationCohorts = () => {
  const [selectedCohort, setSelectedCohort] = useState<{ month: string; label: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-activation-cohorts'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_activation_cohorts');
      if (error) throw error;
      return data as unknown as CohortsData;
    },
  });

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Coortes de Ativação
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <>
            {data?.insight && (
              <div className="flex items-start gap-3 rounded-xl bg-primary/5 border border-primary/10 px-4 py-3">
                <Lightbulb className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <p className="text-sm font-medium text-foreground">{data.insight}</p>
              </div>
            )}

            <div className="rounded-xl border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Coorte</TableHead>
                    <TableHead className="text-center">Workspaces</TableHead>
                    <TableHead className="text-center">D1</TableHead>
                    <TableHead className="text-center">D7</TableHead>
                    <TableHead className="text-center">D30</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.cohorts?.map((c) => (
                    <TableRow
                      key={c.cohort_month}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedCohort({ month: c.cohort_month, label: c.cohort_label })}
                    >
                      <TableCell className="font-medium capitalize">{c.cohort_label}</TableCell>
                      <TableCell className="text-center text-muted-foreground">{c.total}</TableCell>
                      <TableCell className="text-center p-1">
                        <div className={cn('rounded-md py-2', cellClass(c.d1_pct, c.total))}>
                          {c.total === 0 ? '—' : `${c.d1_pct}%`}
                        </div>
                      </TableCell>
                      <TableCell className="text-center p-1">
                        <div className={cn('rounded-md py-2', cellClass(c.d7_pct, c.total))}>
                          {c.total === 0 ? '—' : `${c.d7_pct}%`}
                        </div>
                      </TableCell>
                      <TableCell className="text-center p-1">
                        <div className={cn('rounded-md py-2', cellClass(c.d30_pct, c.total))}>
                          {c.total === 0 ? '—' : `${c.d30_pct}%`}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <p className="text-xs text-muted-foreground">
              Ativação = workspace registra ≥1 anotação, avaliação ou transcrição. D1/D7/D30 são acumulativos. Clique numa coorte para drill-down.
            </p>
          </>
        )}
      </CardContent>

      <CohortDrilldownSheet
        cohortMonth={selectedCohort?.month ?? null}
        cohortLabel={selectedCohort?.label ?? null}
        onClose={() => setSelectedCohort(null)}
      />
    </Card>
  );
};
