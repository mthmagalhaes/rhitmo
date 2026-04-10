import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useExtensionToken() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const { toast } = useToast();

  const generateToken = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: 'Faça login novamente', variant: 'destructive' });
        return null;
      }

      const res = await supabase.functions.invoke('generate-extension-token', {
        body: { action: 'generate' },
      });

      if (res.error) throw new Error(res.error.message);

      const newToken = res.data?.token;
      if (!newToken) throw new Error('No token returned');

      setToken(newToken);
      setShowToken(true);
      return newToken;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      toast({ title: 'Erro ao gerar token', description: msg, variant: 'destructive' });
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const copyToken = useCallback(async (tokenToCopy?: string) => {
    const t = tokenToCopy || token;
    if (!t) return false;

    let success = false;

    // Try modern clipboard API
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(t);
        success = true;
      } catch {
        // fallback below
      }
    }

    // Legacy fallback
    if (!success) {
      const textarea = document.createElement('textarea');
      textarea.value = t;
      textarea.setAttribute('readonly', 'true');
      textarea.style.cssText = 'position:fixed;opacity:0;pointer-events:none;inset:0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      textarea.setSelectionRange(0, textarea.value.length);
      try {
        success = document.execCommand('copy');
      } catch {
        success = false;
      }
      document.body.removeChild(textarea);
    }

    if (success) {
      setCopied(true);
      toast({ title: 'Token copiado!' });
      setTimeout(() => setCopied(false), 3000);
    } else {
      // Token is visible in the field so user can copy manually
      setShowToken(true);
      toast({
        title: 'Copie manualmente',
        description: 'Selecione o token no campo abaixo e copie.',
      });
    }

    return success;
  }, [token, toast]);

  const revokeTokens = useCallback(async () => {
    try {
      await supabase.functions.invoke('generate-extension-token', {
        body: { action: 'revoke' },
      });
      setToken(null);
      setShowToken(false);
      toast({ title: 'Tokens revogados' });
    } catch {
      toast({ title: 'Erro ao revogar', variant: 'destructive' });
    }
  }, [toast]);

  const maskedToken = token
    ? `${token.substring(0, 16)}${'•'.repeat(20)}${token.substring(token.length - 8)}`
    : null;

  return {
    token,
    maskedToken,
    loading,
    copied,
    showToken,
    setShowToken,
    generateToken,
    copyToken,
    revokeTokens,
  };
}
