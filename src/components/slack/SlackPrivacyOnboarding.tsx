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
          <DialogTitle className="text-xl tracking-tight">
            💡 Boas Práticas de Privacidade no Slack
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Private Commands */}
          <div className="rounded-2xl border bg-muted/30 p-4 shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <Shield className="h-4.5 w-4.5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm tracking-tight">Comandos Privados</p>
                <div className="flex flex-wrap gap-1.5 mt-1.5 mb-1.5">
                  {['/nota', '/brief', '/review'].map(cmd => (
                    <code key={cmd} className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">{cmd}</code>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Use em DM com @Rhitmo ou canais privados do seu time.
                </p>
              </div>
            </div>
          </div>

          {/* Public Commands */}
          <div className="rounded-2xl border bg-muted/30 p-4 shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0 mt-0.5">
                <Megaphone className="h-4.5 w-4.5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="font-semibold text-sm tracking-tight">Comandos Públicos</p>
                <div className="flex flex-wrap gap-1.5 mt-1.5 mb-1.5">
                  <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">/kudos</code>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Use em canais públicos para reconhecimento do time.
                </p>
              </div>
            </div>
          </div>

          {/* Why */}
          <div className="rounded-2xl border bg-muted/30 p-4 shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5">
                <Lock className="h-4.5 w-4.5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="font-semibold text-sm tracking-tight">Por quê?</p>
                <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                  Mesmo com respostas privadas, o preview do comando pode ser visível enquanto você digita em canais públicos.
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
