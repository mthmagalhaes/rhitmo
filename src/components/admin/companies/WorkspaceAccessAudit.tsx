import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertTriangle, RefreshCw, Loader2 } from 'lucide-react';
import type { CompanyWorkspace } from '@/hooks/useAdminCompaniesData';

interface AuditRow {
  user_id: string;
  email: string;
  name: string;
  expected_persona: string;
  resolved_persona: string;
  resolved_role: string;
  is_workspace_owner: boolean;
  is_team_leader: boolean;
  has_linked_member: boolean;
  is_consistent: boolean;
  notes: string | null;
}

const personaLabel: Record<string, string> = {
  leader: 'Líder',
  hr_admin: 'RH',
  direct_report: 'Liderado',
  user: 'Sem vínculo',
};

interface Props {
  workspaces: CompanyWorkspace[];
  initialWorkspaceId?: string | null;
}

export const WorkspaceAccessAudit = ({ workspaces, initialWorkspaceId }: Props) => {
  const [workspaceId, setWorkspaceId] = useState<string | null>(initialWorkspaceId ?? workspaces[0]?.id ?? null);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['admin-access-audit', workspaceId],
    queryFn: async (): Promise<AuditRow[]> => {
      if (!workspaceId) return [];
      const { data, error } = await supabase.rpc('admin_workspace_access_audit', { p_workspace_id: workspaceId });
      if (error) throw error;
      return (data ?? []) as AuditRow[];
    },
    enabled: !!workspaceId,
    staleTime: 30_000,
  });

  const inconsistent = (data ?? []).filter((r) => !r.is_consistent);

  return (
    <div className="rounded-2xl border border-border bg-card shadow-[0_2px_20px_rgba(0,0,0,0.04)] p-5 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-base font-semibold tracking-tight">Conferência de acessos</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Mostra, para cada pessoa cadastrada, qual tela ela vai ver hoje e se isso bate com o cadastro.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={workspaceId ?? ''} onValueChange={(v) => setWorkspaceId(v || null)}>
            <SelectTrigger className="w-[240px] rounded-xl"><SelectValue placeholder="Workspace" /></SelectTrigger>
            <SelectContent>
              {workspaces.map((w) => (
                <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="rounded-xl gap-2" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : !data?.length ? (
        <p className="text-sm text-muted-foreground py-6 text-center">Nenhuma pessoa cadastrada neste workspace.</p>
      ) : (
        <>
          <div className="flex items-center gap-4 text-xs">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              {data.length - inconsistent.length} OK
            </span>
            {inconsistent.length > 0 && (
              <span className="inline-flex items-center gap-1.5 text-amber-700">
                <AlertTriangle className="h-3.5 w-3.5" />
                {inconsistent.length} para revisar
              </span>
            )}
          </div>

          <div className="overflow-x-auto -mx-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                  <th className="px-5 py-2 font-medium">Pessoa</th>
                  <th className="px-3 py-2 font-medium">Esperado</th>
                  <th className="px-3 py-2 font-medium">Tela atual</th>
                  <th className="px-3 py-2 font-medium">Sinais</th>
                  <th className="px-5 py-2 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.map((r) => (
                  <tr key={r.user_id} className="border-b border-border/50 last:border-0">
                    <td className="px-5 py-2.5">
                      <div className="font-medium">{r.name}</div>
                      <div className="text-xs text-muted-foreground">{r.email}</div>
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge variant="outline" className="rounded-md font-normal">{personaLabel[r.expected_persona] ?? r.expected_persona}</Badge>
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge variant="outline" className="rounded-md font-normal">{personaLabel[r.resolved_persona] ?? r.resolved_persona}</Badge>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">
                      {[
                        r.is_workspace_owner && 'owner',
                        r.is_team_leader && 'líder',
                        r.has_linked_member && 'liderado',
                      ].filter(Boolean).join(' · ') || '—'}
                    </td>
                    <td className="px-5 py-2.5 text-right">
                      {r.is_consistent ? (
                        <CheckCircle2 className="inline h-4 w-4 text-emerald-600" />
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-700 text-xs">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          Revisar
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};
