import { useState } from 'react';
import { Shield, Megaphone, Lock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { SLACK_PRIVATE_COMMANDS } from '@/lib/slackCommands';

interface SlackPrivacyOnboardingProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SlackPrivacyOnboarding({ open, onOpenChange }: SlackPrivacyOnboardingProps) {
  const { user } = useAuth();
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleClose = async () => {
    if (dontShowAgain && user) {
      await supabase
        .from('user_preferences')
        .upsert(
          { user_id: user.id, hide_slack_privacy_tips: true },
          { onConflict: 'user_id' }
        );
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl tracking-tight font-serif">
            Como a Rhitmo cuida da sua privacidade no Slack
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Você decide */}
          <div className="rounded-2xl border bg-muted/30 p-4 shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <Shield className="h-[18px] w-[18px] text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm tracking-tight">Você decide o que vira nota</p>
                <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                  A Rhitmo só lê o que você manda direto: comandos como{' '}
                  {SLACK_PRIVATE_COMMANDS.slice(0, 3).map((cmd) => (
                    <code key={cmd} className="bg-muted px-1.5 py-0.5 rounded text-[11px] font-mono mx-0.5">{cmd}</code>
                  ))}, DMs com a @Rhitmo ou menções explícitas.
                </p>
              </div>
            </div>
          </div>

          {/* Reconhecimento privado */}
          <div className="rounded-2xl border bg-muted/30 p-4 shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0 mt-0.5">
                <Megaphone className="h-[18px] w-[18px] text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="font-semibold text-sm tracking-tight">Reconhecimento sempre privado</p>
                <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                  <code className="bg-muted px-1.5 py-0.5 rounded text-[11px] font-mono">/kudos</code>{' '}
                  vira DM direta para o liderado e entra no Diário de Bordo dele. Nunca expõe nada em canal público.
                </p>
              </div>
            </div>
          </div>

          {/* Promessa */}
          <div className="rounded-2xl border bg-muted/30 p-4 shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5">
                <Lock className="h-[18px] w-[18px] text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="font-semibold text-sm tracking-tight">Você está no controle</p>
                <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                  Nunca lemos canais, threads ou DMs em que você não nos invocou. Sem varredura silenciosa, sem leitura passiva.
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col gap-3 sm:flex-col">
          <div className="flex items-center gap-2">
            <Checkbox
              id="dontShowAgain"
              checked={dontShowAgain}
              onCheckedChange={(v) => setDontShowAgain(!!v)}
            />
            <Label htmlFor="dontShowAgain" className="text-xs text-muted-foreground cursor-pointer">
              Não mostrar novamente
            </Label>
          </div>
          <Button onClick={handleClose} className="w-full">
            Entendi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
