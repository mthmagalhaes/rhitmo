import { useAccount } from '@/contexts/AccountContext';
import { PageTabs, type PageTab } from '@/components/PageTabs';
import { BillingContent } from '@/pages/Billing';
import { HelpCenterContent } from '@/pages/HelpCenter';
import { ProfileSettingsDialog } from '@/components/ProfileSettingsDialog';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { User, CreditCard, Plug, LifeBuoy, Slack, Calendar, Pencil, Loader2, Link as LinkIcon, Unlink, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useSlackConnection } from '@/hooks/useSlackConnection';
import { useCalendarIntegration } from '@/hooks/useCalendarIntegration';
import { AmbientSlackSettings } from '@/components/settings/AmbientSlackSettings';

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

type IntegrationItem = {
  icon: typeof Slack;
  title: string;
  desc: string;
  connected: boolean;
  loading: boolean;
  meta?: string | null;
  onConnect: () => void;
  onDisconnect?: () => void;
  disconnecting?: boolean;
};

function IntegrationsTab() {
  const slack = useSlackConnection();
  const cal = useCalendarIntegration();
  const items: IntegrationItem[] = [
    {
      icon: Slack,
      title: 'Slack',
      desc: 'Receba briefs e capture feedbacks direto do Slack.',
      connected: slack.isConnected,
      loading: slack.isLoading,
      meta: slack.slackUserId ? `ID: ${slack.slackUserId}` : null,
      onConnect: slack.connectSlack,
      onDisconnect: slack.disconnectSlack,
      disconnecting: slack.isDisconnecting,
    },
    {
      icon: Calendar,
      title: 'Google Calendar',
      desc: 'Sincronize 1:1s e acione transcrição automática.',
      connected: cal.isConnected,
      loading: cal.checkingConnection,
      meta: cal.connectionData?.calendar_email ?? null,
      onConnect: cal.connectCalendar,
      onDisconnect: cal.disconnectCalendar,
    },
  ];
  return (
    <div className="space-y-6">
      <div data-tour="integrations" className="grid gap-4 md:grid-cols-2">
        {items.map((it) => (
          <Card key={it.title} className="rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
            <CardHeader className="flex flex-row items-start gap-3 space-y-0">
              <div className="rounded-xl bg-primary/10 p-2"><it.icon className="w-5 h-5 text-primary" /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle className="text-base font-serif tracking-tight">{it.title}</CardTitle>
                  {it.loading ? (
                    <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                  ) : it.connected ? (
                    <Badge className="text-[10px] px-1.5 py-0 bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/10">
                      <Check className="h-3 w-3 mr-0.5" /> Conectado
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Disponível</Badge>
                  )}
                </div>
                <CardDescription className="text-xs mt-1">{it.desc}</CardDescription>
                {it.connected && it.meta && (
                  <p className="text-[10px] text-muted-foreground truncate mt-1">{it.meta}</p>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {it.connected ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full rounded-xl text-xs"
                  onClick={() => it.onDisconnect?.()}
                  disabled={it.disconnecting || !it.onDisconnect}
                >
                  {it.disconnecting ? (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <Unlink className="h-3 w-3 mr-1" />
                  )}
                  Desconectar
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="w-full rounded-xl text-xs"
                  onClick={it.onConnect}
                  disabled={it.loading}
                >
                  {it.loading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <LinkIcon className="h-3 w-3 mr-1" />}
                  Conectar
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {slack.isConnected && <AmbientSlackSettings />}
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
      <PageTabs tabs={tabs} defaultValue="perfil" syncParam="tab" />
    </div>
  );
}
