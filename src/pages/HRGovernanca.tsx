import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHRAdmin } from '@/components/HRAdminGuard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Download, ShieldCheck, FileClock, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { downloadCsv } from '@/lib/csvExport';

interface AuditRow {
  id: string;
  actor_email: string | null;
  action: string;
  resource_type: string;
  member_id: string | null;
  created_at: string;
}

const ACTION_LABEL: Record<string, string> = {
  view_member_profile: 'Abriu a ficha de um liderado',
  view_review: 'Abriu uma avaliação',
  export_csv: 'Exportou dados em planilha',
  view_network: 'Abriu o mapa de colaboração',
  view_transcript: 'Abriu uma transcrição',
};

const RESOURCE_LABEL: Record<string, string> = {
  team_member: 'Pessoa',
  performance_review: 'Avaliação',
  network: 'Mapa de colaboração',
  meeting_transcript: 'Transcrição',
  workspace: 'Empresa',
};

const RETENTION_OPTIONS = [
  { value: '90', label: '90 dias' },
  { value: '180', label: '180 dias' },
  { value: '365', label: '365 dias (padrão)' },
  { value: '730', label: '2 anos' },
];

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

export default function HRGovernanca() {
  const { workspaceId, workspaceName } = useHRAdmin();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  const { data: audit = [], isLoading } = useQuery({
    queryKey: ['access-audit-log', workspaceId],
    queryFn: async (): Promise<AuditRow[]> => {
      const { data, error } = await supabase
        .from('access_audit_log')
        .select('id, actor_email, action, resource_type, member_id, created_at')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as AuditRow[];
    },
    enabled: !!workspaceId,
    staleTime: 60 * 1000,
  });

  const { data: workspace } = useQuery({
    queryKey: ['workspace-retention', workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workspaces')
        .select('id, name, transcript_retention_days')
        .eq('id', workspaceId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!workspaceId,
  });

  const saveRetention = async (value: string) => {
    setSaving(true);
    const { error } = await supabase
      .from('workspaces')
      .update({ transcript_retention_days: Number(value) })
      .eq('id', workspaceId);
    setSaving(false);
    if (error) {
      toast.error('Não foi possível salvar o prazo agora.');
      return;
    }
    toast.success('Prazo de guarda atualizado.');
    queryClient.invalidateQueries({ queryKey: ['workspace-retention', workspaceId] });
  };

  const exportPeople = async () => {
    setExporting(true);
    const { data, error } = await supabase.rpc('get_workspace_people', {
      p_workspace_id: workspaceId,
    });
    setExporting(false);
    if (error) {
      toast.error('Não foi possível gerar o arquivo agora.');
      return;
    }
    const rows = (data ?? []) as Array<Record<string, unknown>>;
    if (!rows.length) {
      toast.info('Não há pessoas para exportar.');
      return;
    }
    downloadCsv(
      `rhitmo-pessoas-${new Date().toISOString().slice(0, 10)}`,
      rows.map((r) => ({
        nome: String(r.name ?? r.member_name ?? ''),
        email: String(r.email ?? ''),
        cargo: String(r.role ?? ''),
        time: String(r.team_name ?? ''),
        situacao: String(r.invite_status ?? ''),
      })),
    );
    void supabase.rpc('log_access_event', {
      _workspace_id: workspaceId,
      _action: 'export_csv',
      _resource_type: 'workspace',
      _metadata: { rows: rows.length },
    });
    toast.success('Planilha gerada.');
  };

  return (
    <div data-tour="hr-governance" className="max-w-5xl mx-auto p-6 space-y-6">
      <header>
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Governança de dados
        </p>
        <h1 className="font-serif text-3xl font-bold tracking-tight mt-1">
          Confiança e dados de {workspace?.name ?? workspaceName}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Quem acessou o quê, por quanto tempo guardamos e como levar seus dados embora.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
          <CardHeader>
            <CardTitle className="font-serif tracking-tight flex items-center gap-2">
              <FileClock className="h-4 w-4 text-primary" /> Prazo de guarda das transcrições
            </CardTitle>
            <CardDescription>
              Depois desse prazo, as transcrições de reunião deixam de ser guardadas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Label htmlFor="retention" className="text-xs text-muted-foreground">
              Guardar por
            </Label>
            <div className="flex items-center gap-2">
              <Select
                value={String(workspace?.transcript_retention_days ?? 365)}
                onValueChange={saveRetention}
              >
                <SelectTrigger id="retention" className="rounded-xl max-w-[220px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RETENTION_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {saving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
          <CardHeader>
            <CardTitle className="font-serif tracking-tight flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" /> Levar seus dados
            </CardTitle>
            <CardDescription>
              Exporte a lista de pessoas da empresa ou peça a exclusão completa da conta.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button className="rounded-xl gap-2" onClick={exportPeople} disabled={exporting}>
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Exportar pessoas
            </Button>
            <Button variant="outline" className="rounded-xl gap-2" asChild>
              <a
                href={`mailto:privacidade@rhitmo.co?subject=${encodeURIComponent(
                  'Pedido de exclusão de dados',
                )}&body=${encodeURIComponent(
                  `Solicito a exclusão dos dados da empresa ${workspace?.name ?? workspaceName}.`,
                )}`}
              >
                <Trash2 className="h-4 w-4" /> Pedir exclusão
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
        <CardHeader>
          <CardTitle className="font-serif tracking-tight">Registro de acessos</CardTitle>
          <CardDescription>
            Últimos 200 acessos a dados sensíveis de pessoas nesta empresa.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
            </div>
          ) : audit.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6">
              Nada registrado ainda. Assim que alguém abrir ou exportar dados de pessoas, aparece aqui.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[640px] divide-y divide-border/50">
                <div className="grid grid-cols-[minmax(180px,1.4fr)_minmax(200px,1.6fr)_minmax(120px,0.8fr)_minmax(140px,0.8fr)] gap-3 pb-2 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                  <span>Quem</span>
                  <span>O que fez</span>
                  <span>Onde</span>
                  <span>Quando</span>
                </div>
                {audit.map((row) => (
                  <div
                    key={row.id}
                    className="grid grid-cols-[minmax(180px,1.4fr)_minmax(200px,1.6fr)_minmax(120px,0.8fr)_minmax(140px,0.8fr)] gap-3 py-3 text-sm items-center"
                  >
                    <span className="truncate" title={row.actor_email ?? ''}>
                      {row.actor_email ?? '—'}
                    </span>
                    <span className="truncate">{ACTION_LABEL[row.action] ?? row.action}</span>
                    <Badge variant="secondary" className="rounded-full w-fit font-normal">
                      {RESOURCE_LABEL[row.resource_type] ?? row.resource_type}
                    </Badge>
                    <span className="text-muted-foreground">{fmtDateTime(row.created_at)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
