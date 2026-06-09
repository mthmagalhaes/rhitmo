import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Loader2 } from 'lucide-react';
import { AdminStructure } from './AdminStructure';
import { HRAdminInviteCard, HRAdminsListCard } from './AdminAccessParts';
import { useAdminCompaniesData } from '@/hooks/useAdminCompaniesData';
import { CompanyCardsGrid } from './companies/CompanyCardsGrid';
import { CompanyOrgChart } from './companies/CompanyOrgChart';
import { PendingChecklistTable } from './companies/PendingChecklistTable';
import { NewCompanyWizard } from './wizards/NewCompanyWizard';
import { WorkspaceAccessAudit } from './companies/WorkspaceAccessAudit';

type SubTab = 'cards' | 'orgchart' | 'pending' | 'access' | 'legacy';

export const AdminWorkspaces = () => {
  const data = useAdminCompaniesData();
  const [tab, setTab] = useState<SubTab>('cards');
  const [search, setSearch] = useState('');
  const [segment, setSegment] = useState('all');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [orgChartWs, setOrgChartWs] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);

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

  return (
    <div className="space-y-6">
      <div className="px-6 lg:px-8 pt-6 max-w-7xl mx-auto space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-serif tracking-tight">Empresas</h1>
            <p className="text-sm text-muted-foreground">
              Cards, organograma e pendências de cada empresa cadastrada.
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
          <TabsList className="rounded-xl">
            <TabsTrigger value="cards">Cards</TabsTrigger>
            <TabsTrigger value="orgchart">Organograma</TabsTrigger>
            <TabsTrigger value="pending">O que falta</TabsTrigger>
            <TabsTrigger value="legacy">Estrutura (legado)</TabsTrigger>
          </TabsList>

          <TabsContent value="cards" className="mt-4">
            {data.isLoading ? (
              <Loading />
            ) : (
              <CompanyCardsGrid
                workspaces={filteredWorkspaces}
                healthByWorkspace={data.healthByWorkspace}
                onOpenOrgChart={(id) => { setOrgChartWs(id); setTab('orgchart'); }}
              />
            )}
          </TabsContent>

          <TabsContent value="orgchart" className="mt-4">
            {data.isLoading ? (
              <Loading />
            ) : (
              <CompanyOrgChart
                workspaces={filteredWorkspaces}
                teams={data.teams}
                members={data.members}
                getUserLabel={data.getUserLabel}
                initialWorkspaceId={orgChartWs}
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
                workspaceFilter={orgChartWs || 'all'}
                onWorkspaceFilterChange={(v) => setOrgChartWs(v === 'all' ? null : v)}
                workspaces={filteredWorkspaces}
              />
            )}
          </TabsContent>

          <TabsContent value="legacy" className="mt-4">
            <AdminStructure />
          </TabsContent>
        </Tabs>
      </div>

      <div className="px-6 lg:px-8 max-w-5xl mx-auto space-y-6 pb-10">
        <HRAdminInviteCard />
        <HRAdminsListCard />
      </div>

      <NewCompanyWizard open={wizardOpen} onOpenChange={setWizardOpen} users={data.users} />
    </div>
  );
};

const Loading = () => (
  <div className="flex justify-center py-12">
    <Loader2 className="h-6 w-6 animate-spin text-primary" />
  </div>
);
