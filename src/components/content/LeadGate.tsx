import { useState } from 'react';
import { Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const KEY = 'rhitmo_content_lead';

export function hasLead(): boolean {
  try { return !!localStorage.getItem(KEY); } catch { return false; }
}

function utm(): Record<string, string> {
  const p = new URLSearchParams(window.location.search);
  const out: Record<string, string> = {};
  ['utm_source', 'utm_medium', 'utm_campaign'].forEach((k) => { const v = p.get(k); if (v) out[k] = v.slice(0, 200); });
  return out;
}

/** Formulário curto (nome, e-mail, empresa) que libera um material. */
export function LeadGate({
  source, title, onUnlocked, cta = 'Liberar agora',
}: {
  source: 'gerador' | 'modelo' | 'guia-avaliacao' | 'guia-1on1' | 'guia-pdi';
  title: string;
  onUnlocked: () => void;
  cta?: string;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.functions.invoke('content-lead', {
      body: { name, email, company, source, utm: utm() },
    });
    setLoading(false);
    if (error || data?.error) {
      let msg = data?.error as string | undefined;
      try { msg = msg ?? (await (error as { context?: Response })?.context?.json())?.error; } catch { /* ignore */ }
      toast({ title: 'Não deu certo', description: msg ?? 'Tente de novo.', variant: 'destructive' });
      return;
    }
    try { localStorage.setItem(KEY, email); } catch { /* ignore */ }
    onUnlocked();
  };

  return (
    <form onSubmit={submit} className="rounded-3xl bg-card p-6 shadow-[0_2px_20px_rgba(0,0,0,0.06)] md:p-8">
      <p className="flex items-center gap-2 font-serif text-xl font-bold tracking-tight">
        <Lock className="h-4 w-4 text-primary" /> {title}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">Também enviamos uma cópia para o seu e-mail.</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Input required minLength={2} placeholder="Seu nome" value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl" aria-label="Seu nome" />
        <Input required type="email" placeholder="E-mail de trabalho" value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-xl" aria-label="E-mail" />
        <Input placeholder="Empresa" value={company} onChange={(e) => setCompany(e.target.value)} className="rounded-xl" aria-label="Empresa" />
      </div>
      <Button type="submit" disabled={loading} className="mt-4 w-full rounded-xl sm:w-auto">
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {cta}
      </Button>
      <p className="mt-3 text-xs text-muted-foreground">
        Ao continuar, você concorda com a nossa <a href="/privacy-policy" className="underline">política de privacidade</a>. Sem spam.
      </p>
    </form>
  );
}
