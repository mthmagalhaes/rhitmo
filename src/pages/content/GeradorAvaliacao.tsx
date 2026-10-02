import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import ReactMarkdown from 'react-markdown';
import { Copy, Loader2, Plus, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ContentLayout, TrialCta } from '@/components/content/ContentLayout';
import { LeadGate, hasLead } from '@/components/content/LeadGate';

const URL = 'https://rhitmo.co/ferramentas/gerador-avaliacao-desempenho';
const TITLE = 'Gerador de avaliação de desempenho grátis com IA';
const DESC = 'Não sabe o que escrever na avaliação de desempenho? Informe o cargo e alguns fatos e receba um rascunho estruturado, específico e sem vieses.';

const TONES = [
  { id: 'desenvolvimento', label: 'Desenvolvimento' },
  { id: 'reconhecimento', label: 'Reconhecimento' },
  { id: 'correcao', label: 'Correção de rota' },
] as const;

export default function GeradorAvaliacao() {
  const [role, setRole] = useState('');
  const [facts, setFacts] = useState<string[]>(['', '', '']);
  const [tone, setTone] = useState<(typeof TONES)[number]['id']>('desenvolvimento');
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState('');
  const [unlocked, setUnlocked] = useState(hasLead());

  const generate = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = facts.map((f) => f.trim()).filter((f) => f.length >= 3);
    if (!clean.length) { toast({ title: 'Informe pelo menos um fato', variant: 'destructive' }); return; }
    setLoading(true);
    const { data, error } = await supabase.functions.invoke('generate-review-draft-public', { body: { role, facts: clean, tone } });
    setLoading(false);
    if (error || !data?.draft) {
      let msg = data?.error as string | undefined;
      try { msg = msg ?? (await (error as { context?: Response })?.context?.json())?.error; } catch { /* ignore */ }
      toast({ title: 'Não consegui gerar', description: msg ?? 'Tente de novo.', variant: 'destructive' });
      return;
    }
    setDraft(data.draft as string);
    setTimeout(() => document.getElementById('resultado')?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  const preview = draft.split(/\n(?=## )/).slice(0, 2).join('\n');

  return (
    <ContentLayout>
      <Helmet>
        <title>{TITLE} | Rhitmo</title>
        <meta name="description" content={DESC} />
        <link rel="canonical" href={URL} />
        <meta property="og:title" content={TITLE} />
        <meta property="og:description" content={DESC} />
        <meta property="og:url" content={URL} />
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: TITLE, applicationCategory: 'BusinessApplication',
          operatingSystem: 'Web', url: URL, inLanguage: 'pt-BR', offers: { '@type': 'Offer', price: '0', priceCurrency: 'BRL' },
        })}</script>
      </Helmet>

      <div className="mx-auto max-w-3xl px-6 pt-14">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Ferramenta grátis</p>
        <h1 className="mt-2 font-serif text-4xl font-bold leading-tight tracking-tight md:text-5xl">Gerador de texto para avaliação de desempenho</h1>
        <p className="mt-5 text-lg leading-relaxed text-muted-foreground">{DESC}</p>

        <form onSubmit={generate} className="mt-10 space-y-6 rounded-3xl bg-card p-6 shadow-[0_2px_20px_rgba(0,0,0,0.06)] md:p-8">
          <div>
            <label className="text-sm font-semibold" htmlFor="role">Cargo da pessoa avaliada</label>
            <Input id="role" required minLength={2} maxLength={120} value={role} onChange={(e) => setRole(e.target.value)} placeholder="Ex.: Analista de dados pleno" className="mt-2 rounded-xl" />
          </div>
          <div>
            <p className="text-sm font-semibold">Fatos que você observou no período</p>
            <p className="text-xs text-muted-foreground">Seja concreto: o que aconteceu, quando e qual foi o impacto. Não use nomes.</p>
            <div className="mt-3 space-y-2">
              {facts.map((f, i) => (
                <div key={i} className="flex gap-2">
                  <Textarea rows={2} maxLength={500} value={f} aria-label={`Fato ${i + 1}`}
                    onChange={(e) => setFacts(facts.map((x, j) => (j === i ? e.target.value : x)))}
                    placeholder={['Ex.: Em maio, automatizou o relatório semanal e o time ganhou um dia de trabalho por semana.', 'Ex.: Nas reuniões com clientes, costuma atrasar o envio da ata.', 'Ex.: Ajudou dois colegas novos a entender o sistema de cobrança.'][i] ?? 'Outro fato'}
                    className="rounded-xl" />
                  {facts.length > 1 && (
                    <button type="button" aria-label="Remover fato" onClick={() => setFacts(facts.filter((_, j) => j !== i))} className="self-start rounded-lg p-2 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
                  )}
                </div>
              ))}
            </div>
            {facts.length < 5 && (
              <button type="button" onClick={() => setFacts([...facts, ''])} className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary"><Plus className="h-4 w-4" /> Adicionar fato</button>
            )}
          </div>
          <div>
            <p className="text-sm font-semibold">Tom da avaliação</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {TONES.map((t) => (
                <button key={t.id} type="button" onClick={() => setTone(t.id)}
                  className={cn('rounded-full px-4 py-2 text-sm font-medium transition-colors', tone === t.id ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:text-foreground')}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <Button type="submit" size="lg" disabled={loading} className="w-full rounded-xl">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            {loading ? 'Escrevendo...' : 'Gerar rascunho'}
          </Button>
        </form>

        {draft && (
          <section id="resultado" className="mt-10 scroll-mt-24 space-y-6">
            <div className="rounded-3xl bg-card p-6 shadow-[0_2px_20px_rgba(0,0,0,0.06)] md:p-8">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-serif text-2xl font-bold tracking-tight">Seu rascunho</h2>
                {unlocked && (
                  <Button size="sm" variant="outline" className="rounded-xl" onClick={() => { navigator.clipboard.writeText(draft); toast({ title: 'Copiado' }); }}>
                    <Copy className="mr-1 h-4 w-4" /> Copiar
                  </Button>
                )}
              </div>
              <div className="prose prose-sm mt-4 max-w-none prose-headings:font-serif prose-headings:tracking-tight">
                <ReactMarkdown>{unlocked ? draft : preview}</ReactMarkdown>
              </div>
              {!unlocked && <div className="mt-2 h-16 rounded-b-2xl bg-gradient-to-b from-transparent to-card" aria-hidden />}
            </div>
            {!unlocked && (
              <LeadGate source="gerador" title="Veja o rascunho completo e copie" cta="Ver rascunho completo" onUnlocked={() => setUnlocked(true)} />
            )}
            <p className="text-xs text-muted-foreground">É um rascunho. Revise, acrescente exemplos com data e ajuste ao modelo da sua empresa.</p>
          </section>
        )}

        <div className="mt-16"><TrialCta /></div>
      </div>
    </ContentLayout>
  );
}
