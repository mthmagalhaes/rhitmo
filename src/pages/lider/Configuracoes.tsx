import { Navigate, useSearchParams } from 'react-router-dom';
import { useAccount } from '@/contexts/AccountContext';
import { PageTabs, type PageTab } from '@/components/PageTabs';
import { BillingContent } from '@/pages/Billing';
import V2Billing from '@/pages/v2/Billing';
import { useBillingStatus } from '@/hooks/useBillingStatus';
import { HelpCenterContent } from '@/pages/HelpCenter';
import { ProfileSettingsDialog } from '@/components/ProfileSettingsDialog';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { User, CreditCard, LifeBuoy, Pencil, Shield, ShieldCheck } from 'lucide-react';

import { AccessTab } from '@/components/settings/AccessTab';
import { SecurityTab } from '@/components/settings/SecurityTab';

function ProfileTab() {
  const [open, setOpen] = useState(false);
  const { workspaceId } = useAccount();
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
        <CardHeader>
          <CardTitle className="font-serif tracking-tight">Seu perfil</CardTitle>
          <CardDescription>Foto, nome de exibição, idioma e preferências pessoais.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setOpen(true)} className="rounded-xl gap-2">
            <Pencil className="w-4 h-4" /> Editar perfil
          </Button>
        </CardContent>
      </Card>
      <Card className="rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
        <CardHeader>
          <CardTitle className="font-serif tracking-tight">Workspace</CardTitle>
          <CardDescription>Informações da sua organização.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between border-b border-border/40 pb-3">
            <span className="text-muted-foreground">ID</span>
            <span className="font-mono text-xs text-muted-foreground truncate ml-2">{workspaceId ?? '—'}</span>
          </div>
          <p className="text-xs text-muted-foreground pt-1">
            Para alterar nome ou owner, acesse o painel administrativo.
          </p>
        </CardContent>
      </Card>
      <ProfileSettingsDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}

export default function LiderConfiguracoes() {
  const { isHRAdmin, isWorkspaceOwner } = useAccount();
  const canManageAccess = isHRAdmin || isWorkspaceOwner;
  const { data: billingStatus } = useBillingStatus();
  const [params] = useSearchParams();
  const billingTab = billingStatus?.billingModel === 'v3' ? <V2Billing /> : <BillingContent />;
  if (params.get('tab') === 'integracoes') return <Navigate to="/lider/conectores" replace />;

  const tabs: PageTab[] = [
    { value: 'perfil', label: 'Perfil', icon: User, content: <ProfileTab /> },
    { value: 'faturamento', label: 'Faturamento', icon: CreditCard, content: billingTab },
    {
      value: 'acessos',
      label: 'Acessos',
      icon: Shield,
      hidden: !canManageAccess,
      content: <AccessTab />,
    },
    { value: 'seguranca', label: 'Segurança', icon: ShieldCheck, content: <SecurityTab /> },
    { value: 'ajuda', label: 'Ajuda', icon: LifeBuoy, content: <HelpCenterContent /> },
  ];
  return (
    <div className="max-w-5xl mx-auto p-6">
      <header className="mb-6">
        <h1 className="font-serif text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground text-sm mt-1">Gerencie seu perfil, workspace, plano e integrações.</p>
      </header>
      <PageTabs tabs={tabs} defaultValue="perfil" syncParam="tab" />
    </div>
  );
}
