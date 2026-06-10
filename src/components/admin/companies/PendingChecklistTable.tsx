import { useMemo, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Users, User, AlertTriangle, ArrowLeft } from 'lucide-react';
import {
  PENDING_LABEL,
  type PendingRow,
  type PendingType,
} from '@/hooks/useAdminCompaniesData';

interface Props {
  rows: PendingRow[];
  workspaceFilter: string;
  onWorkspaceFilterChange: (v: string) => void;
  workspaces: Array<{ id: string; name: string }>;
}

const ALL_TYPES: PendingType[] = [
  'no_account',
  'rhitmo_sync_member',
  'rhitmo_sync_leader',
  'team_no_leader',
];

export const PendingChecklistTable = ({
  rows,
  workspaceFilter,
  onWorkspaceFilterChange,
  workspaces,
}: Props) => {
  const [typeFilter, setTypeFilter] = useState<PendingType | 'all'>('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (workspaceFilter !== 'all' && r.workspaceId !== workspaceFilter) return false;
      if (typeFilter !== 'all' && !r.pendings.includes(typeFilter)) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (
          !r.personName.toLowerCase().includes(q) &&
          !(r.email || '').toLowerCase().includes(q) &&
          !r.workspaceName.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [rows, workspaceFilter, typeFilter, search]);

  const activeWs = workspaceFilter !== 'all'
    ? workspaces.find((w) => w.id === workspaceFilter)
    : null;

  return (
    <div className="space-y-3">
      {activeWs && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onWorkspaceFilterChange('all')}
          className="gap-1.5 -ml-2 text-xs"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar para empresas · filtrando <strong className="ml-1">{activeWs.name}</strong>
        </Button>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Buscar pessoa, e-mail ou empresa…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs rounded-xl"
        />
        <Select value={workspaceFilter} onValueChange={onWorkspaceFilterChange}>
          <SelectTrigger className="w-[200px] rounded-xl">
            <SelectValue placeholder="Empresa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as empresas</SelectItem>
            {workspaces.map((w) => (
              <SelectItem key={w.id} value={w.id}>
                {w.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
          <SelectTrigger className="w-[220px] rounded-xl">
            <SelectValue placeholder="Tipo de pendência" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {ALL_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {PENDING_LABEL[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground ml-auto">
          {filtered.length} pendência{filtered.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="rounded-2xl border overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pessoa / Item</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Papel</TableHead>
              <TableHead>Pendências</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-10">
                  Nada pendente com os filtros atuais — tudo em dia.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => {
                const Icon = r.kind === 'team' ? Users : r.kind === 'leader' ? AlertTriangle : User;
                return (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                        <div className="min-w-0">
                          <div className="font-medium truncate">{r.personName}</div>
                          {r.email && (
                            <div className="text-xs text-muted-foreground truncate">{r.email}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{r.workspaceName}</TableCell>
                    <TableCell className="text-sm">{r.teamName || '—'}</TableCell>
                    <TableCell className="text-sm">{r.role || '—'}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {r.pendings.map((p) => (
                          <Badge key={p} variant="outline" className="text-[10px] rounded-lg">
                            {PENDING_LABEL[p]}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
