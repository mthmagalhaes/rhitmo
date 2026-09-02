// Reaproveita o fluxo de envio do Rhitmo Sync usado em MemberAdminSheet.
// Centraliza para que tanto o líder (/lider/pessoas) quanto o HR Admin (/hr/members)
// disparem a pesquisa de forma idêntica — mesmo template, mesmo idempotency key.
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ResendSyncTarget {
  id: string;
  name: string;
  email: string | null;
}

export function buildSyncUrl(memberId: string) {
  return `${window.location.origin}/sync/${memberId}`;
}

export function useResendRhitmoSync() {
  const [pending, setPending] = useState(false);

  const resend = async (target: ResendSyncTarget): Promise<boolean> => {
    if (!target.email) {
      toast.error(`${target.name}: sem e-mail cadastrado.`);
      return false;
    }
    setPending(true);
    try {
      const { error } = await supabase.functions.invoke('send-sync-invite', {
        body: { memberId: target.id },
      });
      if (error) throw error;
      return true;
    } catch (err) {
      toast.error(`Falha ao enviar para ${target.name}: ${err instanceof Error ? err.message : String(err)}`);
      return false;
    } finally {
      setPending(false);
    }
  };

  const resendMany = async (targets: ResendSyncTarget[]): Promise<{ sent: number; errors: number }> => {
    let sent = 0;
    let errors = 0;
    setPending(true);
    try {
      for (const t of targets) {
        if (!t.email) {
          errors++;
          continue;
        }
        try {
          const { error } = await supabase.functions.invoke('send-sync-invite', {
            body: { memberId: t.id },
          });
          if (error) throw error;
          sent++;
        } catch {
          errors++;
        }
      }
    } finally {
      setPending(false);
    }
    return { sent, errors };
  };

  return { resend, resendMany, pending };
}
