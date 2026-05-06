import { useAccount } from '@/contexts/AccountContext';
import { PageTabs, type PageTab } from '@/components/PageTabs';
import { BillingContent } from '@/pages/Billing';
import { HelpCenterContent } from '@/pages/HelpCenter';
import { ProfileSettingsDialog } from '@/components/ProfileSettingsDialog';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { User, CreditCard, Plug, LifeBuoy, Slack, Calendar, Pencil } from 'lucide-react';
import { useSlackConnection } from '@/hooks/useSlackConnection';
import { useCalendarIntegration } from '@/hooks/useCalendarIntegration';

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

function ChromeInstallButton() {
  const handleDownload = () => {
    fetch('/rhitmo-recorder-extension.zip')
      .then((res) => {
        if (!res.ok) throw new Error(`Download falhou: ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'rhitmo-recorder-extension.zip';
        a.click();
        URL.revokeObjectURL(a.href);
        toast.success('Download iniciado', {
          description: 'Veja as instruções de instalação ao lado.',
        });
      })
      .catch((err) => toast.error(err.message ?? 'Erro ao baixar a extensão.'));
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button onClick={handleDownload} size="sm" variant="outline" className="rounded-xl gap-2">
        <Download className="w-3.5 h-3.5" /> Instalar extensão
      </Button>
      <Popover>
        <PopoverTrigger asChild>
          <Button size="sm" variant="ghost" className="rounded-xl text-xs">
            Como instalar?
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 rounded-2xl text-xs space-y-2">
          <p className="font-medium text-sm">Instalação manual (Chrome / Edge / Brave):</p>
          <ol className="list-decimal pl-4 space-y-1 text-muted-foreground">
            <li>Descompacte o arquivo baixado.</li>
            <li>Abra <code className="bg-muted px-1 rounded">chrome://extensions</code>.</li>
            <li>Ative o <strong>Modo desenvolvedor</strong> (canto superior direito).</li>
            <li>Clique em <strong>Carregar sem compactação</strong> e selecione a pasta.</li>
          </ol>
        </PopoverContent>
      </Popover>
    </div>
  );
}

type IntegrationItem = {
  icon: typeof Slack;
  title: string;
  desc: string;
  status: string;
  ok: boolean;
  action?: React.ReactNode;
};

function IntegrationsTab() {
  const slack = useSlackConnection();
  const cal = useCalendarIntegration();
  const items: IntegrationItem[] = [
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
      action: <ChromeInstallButton />,
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
          <CardContent className="space-y-3">
            <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${it.ok ? 'text-primary' : 'text-muted-foreground'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${it.ok ? 'bg-primary' : 'bg-muted-foreground/40'}`} />
              {it.status}
            </span>
            {it.action}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function LiderConfiguracoes() {
  const tabs: PageTab[] = [
    { value: 'perfil', label: 'Perfil', icon: User, content: <ProfileTab /> },
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
