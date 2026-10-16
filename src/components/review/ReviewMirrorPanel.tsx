// Espelho de coerência e viés: aponta, não decide. Usado nos dois caminhos da avaliação.
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ScanSearch, CheckCircle2, EyeOff, Quote } from 'lucide-react';
import { CitationChip } from '@/components/context/CitationChip';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface MirrorFinding {
  type: 'bias' | 'unsupported' | 'scale_mismatch' | 'history_conflict' | 'recency' | 'coverage';
  severity: 'low' | 'medium' | 'high';
  excerpt?: string;
  explanation: string;
  suggestion: string;
  doc_id?: string;
  dismissed?: boolean;
}
export interface MirrorResult { findings: MirrorFinding[]; checked_at?: string }

const TYPE_LABEL: Record<MirrorFinding['type'], string> = {
  bias: 'Viés de linguagem',
  unsupported: 'Sem evidência',
  scale_mismatch: 'Incoerente com a régua',
  history_conflict: 'Contradiz o histórico',
  recency: 'Viés de recência',
  coverage: 'Cobertura',
};
const SEV: Record<MirrorFinding['severity'], { label: string; variant: 'destructive' | 'default' | 'secondary' }> = {
  high: { label: 'Alta', variant: 'destructive' },
  medium: { label: 'Média', variant: 'default' },
  low: { label: 'Baixa', variant: 'secondary' },
};
const UUID_RE = /^[0-9a-f-]{32,36}$/i;

export function ReviewMirrorPanel({
  result, running, readOnly, onRun, onDismiss, onApplySuggestion,
}: {
  result: MirrorResult | null;
  running: boolean;
  readOnly: boolean;
  onRun: () => void;
  onDismiss: (index: number) => void;
  onApplySuggestion: (finding: MirrorFinding) => void;
}) {
  const open = (result?.findings ?? []).map((f, i) => ({ f, i })).filter(({ f }) => !f.dismissed);
  const dismissed = (result?.findings ?? []).filter((f) => f.dismissed).length;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-muted/40 p-4 flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm font-semibold tracking-tight">Espelho antes de compartilhar</p>
          <p className="text-xs text-muted-foreground">
            A Rhitmo procura viés de linguagem, afirmações sem evidência, incoerência com a régua, contradições com o histórico, recência e cobertura. Você decide o que mudar.
          </p>
          {result?.checked_at && (
            <p className="text-[11px] text-muted-foreground">
              Última revisão: {format(new Date(result.checked_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
              {dismissed > 0 && ` · ${dismissed} alerta(s) ignorado(s)`}
            </p>
          )}
        </div>
        {!readOnly && (
          <Button size="sm" className="rounded-xl shrink-0" onClick={onRun} disabled={running}>
            {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ScanSearch className="h-4 w-4 mr-2" />}
            {result ? 'Revisar de novo' : 'Revisar agora'}
          </Button>
        )}
      </div>

      {running && !result && (
        <div className="py-8 flex justify-center text-sm text-muted-foreground gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Lendo a avaliação e as evidências…</div>
      )}

      {result && open.length === 0 && (
        <div className="rounded-2xl border p-5 flex items-center gap-3 text-sm">
          <CheckCircle2 className="h-5 w-5 text-primary" />
          Nenhum alerta aberto. A avaliação parece coerente com as evidências.
        </div>
      )}

      {open.map(({ f, i }) => (
        <div key={i} className="rounded-2xl border border-border/60 bg-card p-4 space-y-2 shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline">{TYPE_LABEL[f.type] ?? f.type}</Badge>
            <Badge variant={SEV[f.severity]?.variant ?? 'secondary'}>{SEV[f.severity]?.label ?? f.severity}</Badge>
          </div>
          {f.excerpt && (
            <p className="text-sm italic text-muted-foreground flex gap-1.5"><Quote className="h-3.5 w-3.5 shrink-0 mt-0.5" />{f.excerpt}</p>
          )}
          <p className="text-sm">{f.explanation}</p>
          <p className="text-sm text-foreground/80"><span className="font-medium">Sugestão:</span> {f.suggestion}</p>
          {f.doc_id && UUID_RE.test(f.doc_id) && <div><CitationChip docId={f.doc_id} /></div>}
          {!readOnly && (
            <div className="flex gap-2 pt-1">
              {f.excerpt && (
                <Button size="sm" variant="outline" className="rounded-xl" onClick={() => onApplySuggestion(f)}>Usar sugestão no texto</Button>
              )}
              <Button size="sm" variant="ghost" className="rounded-xl" onClick={() => onDismiss(i)}>
                <EyeOff className="h-3.5 w-3.5 mr-1" /> Ignorar
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
