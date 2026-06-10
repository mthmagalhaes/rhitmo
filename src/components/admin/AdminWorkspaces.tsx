import { useState, useMemo } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Loader2, LayoutGrid, Rows3 } from 'lucide-react';
import { useAdminCompaniesData } from '@/hooks/useAdminCompaniesData';
import { CompanyCardsGrid } from './companies/CompanyCardsGrid';
import { CompaniesTable } from './companies/CompaniesTable';
import { CompanyDetailDrawer } from './companies/CompanyDetailDrawer';
import { PendingChecklistTable } from './companies/PendingChecklistTable';
import { NewCompanyWizard } from './wizards/NewCompanyWizard';

type SubTab = 'cards' | 'pending';
type ViewMode = 'table' | 'cards';

export const AdminWorkspaces = () => {
  const data = useAdminCompaniesData();
  const [tab, setTab] = useState<SubTab>('cards');
  const [view, setView] = useState<ViewMode>('table');
  const [search, setSearch] = useState('');
  const [segment, setSegment] = useState('all');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [pendingWsFilter, setPendingWsFilter] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [detailWsId, setDetailWsId] = useState<string | null>(null);

  const filteredWorkspaces = data.workspaces.filter((w) => {
    if (status === 'active' && !w.is_active) return false;
    if (status === 'inactive' && w.is_active) return false;
    if (segment !== 'all' && w.customer_segment !== segment) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (
        !w.name.toLowerCase().includes(q) &&
        !(w.client_account || '').toLowerCase().includes(q) &&
        !(data.getUserLabel(w.owner_id) || '').toLowerCase().includes(q)
      ) return false;
    }
    return true;
  });

  const pendingCountByWorkspace = useMemo(() => {
    const m = new Map<string, number>();
    data.pendingRows.forEach((p) => m.set(p.workspaceId, (m.get(p.workspaceId) || 0) + 1));
    return m;
  }, [data.pendingRows]);

  const handleSeePendings = (wsId: string) => {
    setPendingWsFilter(wsId);
    setTab('pending');
  };

  return (
    <div className="space-y-6">
      <div className="px-6 lg:px-8 pt-6 max-w-7xl mx-auto space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-serif tracking-tight">Empresas</h1>
            <p className="text-sm text-muted-foreground">
              Saúde e pendências de cada empresa cadastrada.
            </p>
          </div>
          <Button onClick={() => setWizardOpen(true)} className="rounded-xl gap-2">
            <Plus className="h-4 w-4" /> Nova empresa
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Buscar empresa, owner ou cliente…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs rounded-xl"
          />
          <Select value={segment} onValueChange={setSegment}>
            <SelectTrigger className="w-[160px] rounded-xl"><SelectValue placeholder="Segmento" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos segmentos</SelectItem>
              <SelectItem value="paid">Pago</SelectItem>
              <SelectItem value="beta">Beta</SelectItem>
              <SelectItem value="trial">Trial</SelectItem>
              <SelectItem value="internal">Interno</SelectItem>
              <SelectItem value="test">Teste</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(v) => setStatus(v as any)}>
            <SelectTrigger className="w-[140px] rounded-xl"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="inactive">Suspensos</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground ml-auto">
            {filteredWorkspaces.length} empresa{filteredWorkspaces.length === 1 ? '' : 's'}
          </span>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as SubTab)}>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <TabsList className="rounded-xl">
              <TabsTrigger value="cards">Empresas</TabsTrigger>
              <TabsTrigger value="pending">O que falta</TabsTrigger>
            </TabsList>
            {tab === 'cards' && (
              <div className="inline-flex rounded-xl border bg-muted/40 p-0.5">
                <button
                  onClick={() => setView('table')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition ${
                    view === 'table' ? 'bg-background shadow-sm' : 'text-muted-foreground'
                  }`}
                >
                  <Rows3 className="h-3.5 w-3.5" /> Tabela
                </button>
                <button
                  onClick={() => setView('cards')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition ${
                    view === 'cards' ? 'bg-background shadow-sm' : 'text-muted-foreground'
                  }`}
                >
                  <LayoutGrid className="h-3.5 w-3.5" /> Cards
                </button>
              </div>
            )}
          </div>

          <TabsContent value="cards" className="mt-4">
            {data.isLoading ? (
              <Loading />
            ) : view === 'table' ? (
              <CompaniesTable
                workspaces={filteredWorkspaces}
                healthByWorkspace={data.healthByWorkspace}
                pendingCountByWorkspace={pendingCountByWorkspace}
                onOpenDetail={(id) => setDetailWsId(id)}
                onOpenPendings={handleSeePendings}
              />
            ) : (
              <CompanyCardsGrid
                workspaces={filteredWorkspaces}
                healthByWorkspace={data.healthByWorkspace}
                onOpenDetail={(id) => setDetailWsId(id)}
                onOpenPendings={handleSeePendings}
              />
            )}
          </TabsContent>

          <TabsContent value="pending" className="mt-4">
            {data.isLoading ? (
              <Loading />
            ) : (
              <PendingChecklistTable
                rows={data.pendingRows.filter((r) =>
                  filteredWorkspaces.some((w) => w.id === r.workspaceId),
                )}
                workspaceFilter={pendingWsFilter || 'all'}
                onWorkspaceFilterChange={(v) => setPendingWsFilter(v === 'all' ? null : v)}
                workspaces={filteredWorkspaces}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>

      <CompanyDetailDrawer
        workspaceId={detailWsId}
        open={!!detailWsId}
        onOpenChange={(o) => { if (!o) setDetailWsId(null); }}
        onSeePendings={handleSeePendings}
      />

      <NewCompanyWizard open={wizardOpen} onOpenChange={setWizardOpen} users={data.users} />
    </div>
  );
};

const Loading = () => (
  <div className="flex justify-center py-12">
    <Loader2 className="h-6 w-6 animate-spin text-primary" />
  </div>
);
