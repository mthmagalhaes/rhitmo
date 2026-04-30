import { useAccount } from '@/contexts/AccountContext';
import { PageTabs, type PageTab } from '@/components/PageTabs';
import { BillingContent } from '@/pages/Billing';
import { HelpCenterContent } from '@/pages/HelpCenter';
import { ProfileSettingsDialog } from '@/components/ProfileSettingsDialog';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { User, Building2, CreditCard, Plug, LifeBuoy, Slack, Calendar, Chrome, Pencil } from 'lucide-react';
import { useSlackConnection } from '@/hooks/useSlackConnection';
import { useCalendarIntegration } from '@/hooks/useCalendarIntegration';

function ProfileTab() {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-4">
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
      <ProfileSettingsDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}

function WorkspaceTab() {
  const { workspaceId } = useAccount();
  return (
    <Card className="rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
      <CardHeader>
        <CardTitle className="font-serif tracking-tight">Workspace</CardTitle>
        <CardDescription>Informações da sua organização.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-center justify-between border-b border-border/40 pb-3">
          <span className="text-muted-foreground">ID</span>
          <span className="font-mono text-xs text-muted-foreground">{workspaceId ?? '—'}</span>
        </div>
        <p className="text-xs text-muted-foreground pt-2">
          Para alterar nome ou owner do workspace, acesse o painel administrativo.
        </p>
      </CardContent>
    </Card>
  );
}

function IntegrationsTab() {
  const slack = useSlackConnection();
  const cal = useCalendarIntegration();
  const items = [
    {
      icon: Slack,
      title: 'Slack',
      desc: 'Receba briefs e capture feedbacks direto do Slack.',
      status: slack.isConnected ? 'Conectado' : 'Desconectado',
      ok: slack.isConnected,
    },
    {
      icon: Calendar,
      title: 'Google Calendar',
      desc: 'Sincronize 1:1s e acione transcrição automática.',
      status: cal.isConnected ? 'Conectado' : 'Desconectado',
      ok: cal.isConnected,
    },
    {
      icon: Chrome,
      title: 'Conector Chrome',
      desc: 'Grave reuniões do Google Meet sem clicar em nada.',
      status: 'Disponível',
      ok: true,
    },
  ];
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {items.map((it) => (
        <Card key={it.title} className="rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
          <CardHeader className="flex flex-row items-start gap-3 space-y-0">
            <div className="rounded-xl bg-primary/10 p-2"><it.icon className="w-5 h-5 text-primary" /></div>
            <div className="flex-1">
              <CardTitle className="text-base font-serif tracking-tight">{it.title}</CardTitle>
              <CardDescription className="text-xs mt-1">{it.desc}</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${it.ok ? 'text-primary' : 'text-muted-foreground'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${it.ok ? 'bg-primary' : 'bg-muted-foreground/40'}`} />
              {it.status}
            </span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function LiderConfiguracoes() {
  const tabs: PageTab[] = [
    { value: 'perfil', label: 'Perfil', icon: User, content: <ProfileTab /> },
    { value: 'workspace', label: 'Workspace', icon: Building2, content: <WorkspaceTab /> },
    { value: 'faturamento', label: 'Faturamento', icon: CreditCard, content: <BillingContent /> },
    { value: 'integracoes', label: 'Integrações', icon: Plug, content: <IntegrationsTab /> },
    { value: 'ajuda', label: 'Ajuda', icon: LifeBuoy, content: <HelpCenterContent /> },
  ];
  return (
    <div className="max-w-5xl mx-auto p-6">
      <header className="mb-6">
        <h1 className="font-serif text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground text-sm mt-1">Gerencie seu perfil, workspace, plano e integrações.</p>
      </header>
      <PageTabs tabs={tabs} defaultValue="perfil" />
    </div>
  );
}
