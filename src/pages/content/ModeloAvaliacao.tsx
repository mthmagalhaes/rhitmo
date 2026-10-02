import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Copy, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { ContentLayout, TrialCta } from '@/components/content/ContentLayout';
import { LeadGate, hasLead } from '@/components/content/LeadGate';

const URL = 'https://rhitmo.co/modelos/avaliacao-de-desempenho';
const TITLE = 'Modelo de avaliação de desempenho pronto para usar';
const DESC = 'Modelo gratuito de avaliação de desempenho com competências, escala, campo de evidências, plano de desenvolvimento e roteiro de conversa. Bônus: roteiro de 1:1.';

interface Block { title: string; lines: string[] }

const PREVIEW: Block[] = [
  { title: '1. Identificação', lines: ['Pessoa avaliada, cargo, área, líder, período avaliado (de / até).'] },
  { title: '2. Escala', lines: [
    '1. Abaixo do esperado: não atingiu o combinado de forma recorrente.',
    '2. Em desenvolvimento: atinge parte do esperado, com apoio frequente.',
    '3. Atende: entrega o esperado para o cargo com consistência.',
    '4. Supera: vai além do esperado e eleva o resultado do time.',
    '5. Referência: é exemplo para outras pessoas e muda o padrão da área.',
  ] },
];

const FULL: Block[] = [
  { title: '3. Competências (nota + evidência)', lines: [
    'Para cada competência: nota de 1 a 5 e pelo menos um fato com data que justifique a nota.',
    'Entrega de resultados: cumpre prazos e qualidade combinados; prioriza o que gera mais impacto.',
    'Colaboração: compartilha contexto, ajuda colegas, trabalha bem entre áreas.',
    'Comunicação: é clara e objetiva por escrito e em reuniões; traz riscos cedo.',
    'Autonomia e iniciativa: resolve problemas sem esperar instrução; propõe melhorias.',
    'Aprendizado: busca feedback, aprende rápido, aplica o que aprendeu.',
    'Competência técnica do cargo: domina as ferramentas e práticas esperadas para o nível.',
  ] },
  { title: '4. Resumo do período', lines: ['Em 3 a 5 frases: principais entregas, evolução em relação ao ciclo anterior e contexto relevante (mudanças de time, escopo, prioridades).'] },
  { title: '5. Pontos fortes', lines: ['2 a 3 itens. Formato: comportamento observado + exemplo com data + impacto.'] },
  { title: '6. Pontos de desenvolvimento', lines: ['1 a 3 itens. Formato: situação + comportamento atual + comportamento esperado.'] },
  { title: '7. Plano de desenvolvimento (próximos 90 dias)', lines: [
    'Foco | Ação prática no trabalho | Apoio necessário | Como vamos medir | Prazo',
    'Escreva com a pessoa, não para ela. Revise o plano em toda 1:1.',
  ] },
  { title: '8. Autoavaliação da pessoa', lines: ['Espaço para a visão dela sobre o período, antes da conversa.'] },
  { title: '9. Roteiro da conversa de avaliação', lines: [
    'Abertura: objetivo da conversa e como ela vai acontecer.',
    'Visão da pessoa: "Como você enxerga o seu período?"',
    'Pontos fortes, com exemplos específicos.',
    'Pontos de desenvolvimento, como comportamento esperado.',
    'Plano de desenvolvimento, construído junto.',
    'Fechamento: "O que você precisa de mim para isso acontecer?"',
  ] },
  { title: 'Bônus: roteiro de reunião 1:1 (30 minutos)', lines: [
    'Como você está? (5 min)',
    'Prioridades e bloqueios das próximas duas semanas (10 min)',
    'Feedback nos dois sentidos (5 min)',
    'Desenvolvimento e PDI (5 min)',
    'Combinados com responsável e prazo (5 min)',
  ] },
];

const toText = (blocks: Block[]) => blocks.map((b) => `${b.title}\n${b.lines.map((l) => `- ${l}`).join('\n')}`).join('\n\n');

function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <div className="space-y-6">
      {blocks.map((b) => (
        <div key={b.title}>
          <h3 className="font-serif text-lg font-bold tracking-tight">{b.title}</h3>
          <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-foreground/85">
            {b.lines.map((l) => <li key={l} className="flex gap-2"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary" />{l}</li>)}
          </ul>
        </div>
      ))}
    </div>
  );
}

export default function ModeloAvaliacao() {
  const [unlocked, setUnlocked] = useState(hasLead());
  return (
    <ContentLayout>
      <Helmet>
        <title>{TITLE} | Rhitmo</title>
        <meta name="description" content={DESC} />
        <link rel="canonical" href={URL} />
        <meta property="og:title" content={TITLE} />
        <meta property="og:description" content={DESC} />
        <meta property="og:url" content={URL} />
      </Helmet>

      <div className="mx-auto max-w-3xl px-6 pt-14">
        <div className="print:hidden">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Modelo grátis</p>
          <h1 className="mt-2 font-serif text-4xl font-bold leading-tight tracking-tight md:text-5xl">Modelo de avaliação de desempenho</h1>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">{DESC}</p>
        </div>

        <div className="mt-10 rounded-3xl bg-card p-6 shadow-[0_2px_20px_rgba(0,0,0,0.06)] md:p-10 print:shadow-none">
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-serif text-2xl font-bold tracking-tight">Avaliação de desempenho</h2>
            {unlocked && (
              <div className="flex gap-2 print:hidden">
                <Button size="sm" variant="outline" className="rounded-xl" onClick={() => { navigator.clipboard.writeText(toText([...PREVIEW, ...FULL])); toast({ title: 'Modelo copiado' }); }}>
                  <Copy className="mr-1 h-4 w-4" /> Copiar
                </Button>
                <Button size="sm" className="rounded-xl" onClick={() => window.print()}><Printer className="mr-1 h-4 w-4" /> Baixar PDF</Button>
              </div>
            )}
          </div>
          <div className="mt-6"><Blocks blocks={PREVIEW} /></div>
          {unlocked ? (
            <div className="mt-6"><Blocks blocks={FULL} /></div>
          ) : (
            <div className="relative mt-6 max-h-40 overflow-hidden" aria-hidden>
              <div className="blur-[3px]"><Blocks blocks={FULL.slice(0, 2)} /></div>
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-card" />
            </div>
          )}
        </div>

        {!unlocked && (
          <div className="mt-6 print:hidden">
            <LeadGate source="modelo" title="Libere o modelo completo" cta="Liberar modelo" onUnlocked={() => setUnlocked(true)} />
          </div>
        )}

        <div className="mt-16 print:hidden"><TrialCta title="Preencher este modelo pode levar minutos, não horas." body="A Rhitmo junta as evidências das suas 1:1s ao longo do ciclo e monta o rascunho da avaliação com a fonte de cada frase." /></div>
      </div>
    </ContentLayout>
  );
}
