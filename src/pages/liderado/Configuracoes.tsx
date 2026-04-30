import { PageTabs, type PageTab } from '@/components/PageTabs';
import { HelpCenterContent } from '@/pages/HelpCenter';
import { ProfileSettingsDialog } from '@/components/ProfileSettingsDialog';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { User, Bell, ShieldCheck, LifeBuoy, Pencil } from 'lucide-react';

function ProfileTab() {
  const [open, setOpen] = useState(false);
  return (
    <>
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
    </>
  );
}

function NotificationsTab() {
  return (
    <Card className="rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
      <CardHeader>
        <CardTitle className="font-serif tracking-tight">Notificações</CardTitle>
        <CardDescription>Em breve: controle de e-mails sobre devolutivas compartilhadas.</CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        Por enquanto, todos os e-mails seguem o padrão do Rhitmo. Em breve você poderá ajustar a frequência.
      </CardContent>
    </Card>
  );
}

function PrivacyTab() {
  return (
    <Card className="rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
      <CardHeader>
        <CardTitle className="font-serif tracking-tight">Privacidade</CardTitle>
        <CardDescription>Visibilidade de dados e direitos do liderado.</CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground space-y-2">
        <p>Você só vê devolutivas explicitamente compartilhadas pelo seu líder.</p>
        <p>Notas privadas, briefings e transcrições brutas nunca são acessíveis ao liderado.</p>
        <p>Para solicitar exclusão de dados, fale com seu RH ou líder.</p>
      </CardContent>
    </Card>
  );
}

export default function LideradoConfiguracoes() {
  const tabs: PageTab[] = [
    { value: 'perfil', label: 'Perfil', icon: User, content: <ProfileTab /> },
    { value: 'notificacoes', label: 'Notificações', icon: Bell, content: <NotificationsTab /> },
    { value: 'privacidade', label: 'Privacidade', icon: ShieldCheck, content: <PrivacyTab /> },
    { value: 'ajuda', label: 'Ajuda', icon: LifeBuoy, content: <HelpCenterContent /> },
  ];
  return (
    <div className="max-w-5xl mx-auto p-6">
      <header className="mb-6">
        <h1 className="font-serif text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground text-sm mt-1">Seu perfil, notificações e privacidade.</p>
      </header>
      <PageTabs tabs={tabs} defaultValue="perfil" />
    </div>
  );
}
