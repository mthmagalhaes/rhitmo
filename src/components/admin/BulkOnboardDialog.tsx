import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Upload, Download, Loader2, CheckCircle2, XCircle, AlertTriangle, FileSpreadsheet } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

interface ParsedRow {
  email: string;
  name: string;
  role: 'leader' | 'member' | 'hr_admin';
  workspace: string;
  team: string;
  leader_email: string;
  errors: string[];
}

interface ResultRow {
  email: string;
  status: 'ok' | 'error' | 'skipped';
  message: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceNames: string[];
}

const TEMPLATE_CSV = `email,nome,papel,workspace,time,lider_email
joao@empresa.com,João Silva,leader,Minha Empresa,Produto,
maria@empresa.com,Maria Santos,member,Minha Empresa,Produto,joao@empresa.com
ana@empresa.com,Ana Costa,hr_admin,Minha Empresa,,`;

type Step = 'upload' | 'preview' | 'processing' | 'results';

export const BulkOnboardDialog = ({ open, onOpenChange, workspaceNames }: Props) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>('upload');
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [summary, setSummary] = useState<{ total: number; ok: number; skipped: number; errors: number } | null>(null);
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setStep('upload');
    setRows([]);
    setResults([]);
    setSummary(null);
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  const downloadTemplate = () => {
    const blob = new Blob([TEMPLATE_CSV], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'rhitmo_import_template.csv';
    link.click();
  };

  const parseCSV = (text: string): ParsedRow[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];

    const header = lines[0].toLowerCase().split(',').map(h => h.trim());
    const emailIdx = header.findIndex(h => h === 'email');
    const nameIdx = header.findIndex(h => h === 'nome' || h === 'name');
    const roleIdx = header.findIndex(h => h === 'papel' || h === 'role');
    const wsIdx = header.findIndex(h => h === 'workspace');
    const teamIdx = header.findIndex(h => h === 'time' || h === 'team');
    const leaderIdx = header.findIndex(h => h.includes('lider') || h.includes('leader'));

    const wsNamesLower = workspaceNames.map(n => n.toLowerCase().trim());

    return lines.slice(1).filter(l => l.trim()).map(line => {
      // Simple CSV parsing (handles basic cases)
      const cols = line.split(',').map(c => c.trim());
      const email = (cols[emailIdx] || '').toLowerCase().trim();
      const name = cols[nameIdx] || '';
      const roleRaw = (cols[roleIdx] || '').toLowerCase().trim();
      const workspace = cols[wsIdx] || '';
      const team = cols[teamIdx] || '';
      const leaderEmail = (cols[leaderIdx] || '').toLowerCase().trim();

      const errors: string[] = [];

      // Validate email
      if (!email || !email.includes('@')) errors.push('Email inválido');

      // Validate role
      const roleMap: Record<string, 'leader' | 'member' | 'hr_admin'> = {
        'leader': 'leader', 'líder': 'leader', 'lider': 'leader',
        'member': 'member', 'liderado': 'member',
        'hr_admin': 'hr_admin', 'hr': 'hr_admin', 'rh': 'hr_admin',
      };
      const role = roleMap[roleRaw];
      if (!role) errors.push(`Papel "${roleRaw}" inválido`);

      // Validate workspace exists
      if (workspace && !wsNamesLower.includes(workspace.toLowerCase().trim())) {
        errors.push(`Workspace "${workspace}" não encontrado`);
      }

      // Validate team required for leader/member
      if ((role === 'leader' || role === 'member') && !team) {
        errors.push('Time obrigatório para líder/liderado');
      }

      return { email, name, role: role || 'member', workspace, team, leader_email: leaderEmail, errors };
    });
  };

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCSV(text);
      if (parsed.length === 0) {
        toast({ title: 'Arquivo vazio', description: 'Nenhuma linha válida encontrada', variant: 'destructive' });
        return;
      }
      // Check duplicates
      const emails = parsed.map(r => r.email);
      const dupes = emails.filter((e, i) => emails.indexOf(e) !== i);
      if (dupes.length > 0) {
        parsed.forEach(r => {
          if (dupes.includes(r.email)) r.errors.push('Email duplicado');
        });
      }
      setRows(parsed);
      setStep('preview');
    };
    reader.readAsText(file);
    e.target.value = '';
  }, [workspaceNames]);

  const handleSubmit = async () => {
    const validRows = rows.filter(r => r.errors.length === 0);
    if (validRows.length === 0) {
      toast({ title: 'Nenhuma linha válida', variant: 'destructive' });
      return;
    }

    setStep('processing');
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('bulk-onboard', {
        body: {
          users: validRows.map(r => ({
            email: r.email,
            name: r.name,
            role: r.role,
            workspace: r.workspace,
            team: r.team,
            leader_email: r.leader_email,
          })),
        },
      });

      if (error) throw error;

      setResults(data.results || []);
      setSummary(data.summary || null);
      setStep('results');

      queryClient.invalidateQueries({ queryKey: ['admin-structure-workspaces'] });
      queryClient.invalidateQueries({ queryKey: ['admin-structure-teams'] });
      queryClient.invalidateQueries({ queryKey: ['admin-structure-members'] });
      queryClient.invalidateQueries({ queryKey: ['admin-users-metadata'] });
    } catch (err: any) {
      toast({ title: 'Erro na importação', description: err.message, variant: 'destructive' });
      setStep('preview');
    } finally {
      setLoading(false);
    }
  };

  const validCount = rows.filter(r => r.errors.length === 0).length;
  const errorCount = rows.filter(r => r.errors.length > 0).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar em Massa
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'Cadastra usuários, times e papéis em lote — SEM enviar email. Você dispara os convites manualmente em Estrutura → "Disparar convites" no card do workspace.'}
            {step === 'preview' && `${validCount} válidos, ${errorCount} com erros. Revise antes de confirmar. Nenhum email será enviado nesta etapa.`}
            {step === 'processing' && 'Criando usuários e estrutura (modo silencioso)...'}
            {step === 'results' && 'Importação concluída! Próximo passo: dispare os convites em Estrutura.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-6 py-4">
            <div className="border-2 border-dashed border-border rounded-2xl p-8 text-center space-y-4">
              <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
              <div>
                <p className="font-medium">Arraste um arquivo CSV ou clique para selecionar</p>
                <p className="text-sm text-muted-foreground mt-1">Formato: email, nome, papel, workspace, time, líder_email</p>
              </div>
              <label>
                <input type="file" accept=".csv,.txt" onChange={handleFileUpload} className="hidden" />
                <Button variant="outline" className="cursor-pointer" asChild>
                  <span>Selecionar arquivo</span>
                </Button>
              </label>
            </div>

            <Button variant="ghost" onClick={downloadTemplate} className="gap-2 w-full">
              <Download className="h-4 w-4" />
              Baixar template CSV
            </Button>
          </div>
        )}

        {step === 'preview' && (
          <ScrollArea className="max-h-[50vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Papel</TableHead>
                  <TableHead>Workspace</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, i) => (
                  <TableRow key={i} className={row.errors.length > 0 ? 'bg-destructive/5' : ''}>
                    <TableCell>
                      {row.errors.length > 0 ? (
                        <XCircle className="h-4 w-4 text-destructive" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{row.email}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {row.role === 'leader' ? 'Líder' : row.role === 'hr_admin' ? 'HR Admin' : 'Liderado'}
                      </Badge>
                    </TableCell>
                    <TableCell>{row.workspace}</TableCell>
                    <TableCell>{row.team || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {rows.some(r => r.errors.length > 0) && (
              <div className="p-3 mt-2 rounded-xl bg-destructive/10 text-sm space-y-1">
                {rows.filter(r => r.errors.length > 0).map((r, i) => (
                  <p key={i} className="text-destructive">
                    <strong>{r.email || `Linha ${i + 2}`}:</strong> {r.errors.join(', ')}
                  </p>
                ))}
              </div>
            )}
          </ScrollArea>
        )}

        {step === 'processing' && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-muted-foreground">Criando usuários e configurando papéis (sem email)...</p>
            <p className="text-xs text-muted-foreground">Processando {validCount} usuários</p>
          </div>
        )}

        {step === 'results' && (
          <div className="space-y-4">
            {summary && (
              <div className="grid grid-cols-4 gap-3">
                <div className="text-center p-3 rounded-xl bg-muted">
                  <p className="text-2xl font-bold">{summary.total}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-green-500/10">
                  <p className="text-2xl font-bold text-green-600">{summary.ok}</p>
                  <p className="text-xs text-muted-foreground">Sucesso</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-yellow-500/10">
                  <p className="text-2xl font-bold text-yellow-600">{summary.skipped}</p>
                  <p className="text-xs text-muted-foreground">Já existiam</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-destructive/10">
                  <p className="text-2xl font-bold text-destructive">{summary.errors}</p>
                  <p className="text-xs text-muted-foreground">Erros</p>
                </div>
              </div>
            )}
            <ScrollArea className="max-h-[40vh]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Detalhes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        {r.status === 'ok' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                        {r.status === 'error' && <XCircle className="h-4 w-4 text-destructive" />}
                        {r.status === 'skipped' && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{r.email}</TableCell>
                      <TableCell className="text-sm">{r.message}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        )}

        <DialogFooter>
          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={reset}>Voltar</Button>
              <Button onClick={handleSubmit} disabled={validCount === 0} className="gap-2">
                <Upload className="h-4 w-4" />
                Importar {validCount} usuário{validCount !== 1 ? 's' : ''}
              </Button>
            </>
          )}
          {step === 'results' && (
            <Button onClick={handleClose}>Fechar</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
