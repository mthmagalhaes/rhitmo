import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Compass, RefreshCw, Loader2, AlertTriangle, Target, MessageCircle, Sparkles } from 'lucide-react';

interface SkillsMapCardProps {
  aiAnalysis: {
    alignment_score?: number;
    analysis_summary?: string;
    key_gaps?: string[];
    suggested_focus?: string[];
    analyzed_at?: string;
  } | null;
  memberId: string;
  onReanalyze: () => void;
  isReanalyzing: boolean;
  onSuggestOneOnOne?: (focusArea: string) => void;
  onOpenMeuRhitmo?: (focusArea: string) => void;
}

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

const isOlderThan90Days = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  return diff > 90 * 24 * 60 * 60 * 1000;
};

export default function SkillsMapCard({ aiAnalysis, memberId, onReanalyze, isReanalyzing, onSuggestOneOnOne, onOpenMeuRhitmo }: SkillsMapCardProps) {
  const focusArea = aiAnalysis?.suggested_focus?.[0];
  const hasActions = focusArea && (onSuggestOneOnOne || onOpenMeuRhitmo);

  return (
    <Card className="p-6 rounded-2xl border-0 shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Compass className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold tracking-tight text-foreground">Bússola de Carreira</h2>
        </div>
        {aiAnalysis && (
          <Button
            variant="outline"
            size="sm"
            onClick={onReanalyze}
            disabled={isReanalyzing}
            className="gap-2 text-xs"
          >
            {isReanalyzing ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3" />
            )}
            {isReanalyzing ? 'Analisando...' : 'Re-analisar'}
          </Button>
        )}
      </div>

      {/* Empty state */}
      {!aiAnalysis ? (
        <div className="text-center py-8">
          <Compass className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-sm font-medium mb-1 text-foreground">Análise não disponível</p>
          <p className="text-xs text-muted-foreground mb-4 max-w-xs mx-auto">
            Complete seu perfil de função para gerar sua Bússola de Carreira.
          </p>
          <Button size="sm" onClick={onReanalyze} disabled={isReanalyzing}>
            {isReanalyzing ? 'Analisando...' : 'Gerar análise'}
          </Button>
        </div>
      ) : (
        <>
          {/* Data da análise */}
          {aiAnalysis.analyzed_at && (
            <p className="text-xs text-muted-foreground mb-4">
              Análise de {formatDate(aiAnalysis.analyzed_at)}
              {isOlderThan90Days(aiAnalysis.analyzed_at) && (
                <span className="text-amber-500 ml-1">· Pode estar desatualizada</span>
              )}
            </p>
          )}

          {/* Resumo narrativo */}
          {aiAnalysis.analysis_summary && (
            <div className="bg-muted/40 rounded-xl p-4 mb-6">
              <p className="text-sm text-foreground/80 italic leading-relaxed">
                &ldquo;{aiAnalysis.analysis_summary}&rdquo;
              </p>
            </div>
          )}

          {/* Grid: Pontos de Atenção + Foco Recomendado */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {aiAnalysis.key_gaps && aiAnalysis.key_gaps.length > 0 && (
              <div className="bg-orange-50 dark:bg-orange-950/20 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  <p className="text-sm font-semibold text-orange-700 dark:text-orange-400">Pontos de Atenção</p>
                </div>
                <ul className="space-y-2">
                  {aiAnalysis.key_gaps.map((gap, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-1.5 shrink-0" />
                      <p className="text-xs text-orange-800 dark:text-orange-300 leading-relaxed">{gap}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {aiAnalysis.suggested_focus && aiAnalysis.suggested_focus.length > 0 && (
              <div className="bg-primary/5 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold text-primary">Foco Recomendado</p>
                </div>
                <ul className="space-y-2">
                  {aiAnalysis.suggested_focus.map((focus, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary/60 mt-1.5 shrink-0" />
                      <p className="text-xs text-foreground/80 leading-relaxed">{focus}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Action buttons */}
          {hasActions && (
            <div className="mt-6 pt-4 border-t border-border space-y-2">
              <p className="text-xs text-muted-foreground mb-3">📋 Próximos passos para desenvolver esta competência:</p>
              {onSuggestOneOnOne && (
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => onSuggestOneOnOne(focusArea)}
                >
                  <MessageCircle className="h-4 w-4" />
                  Conversar com meu líder sobre isso
                </Button>
              )}
              {onOpenMeuRhitmo && (
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => onOpenMeuRhitmo(focusArea)}
                >
                  <Sparkles className="h-4 w-4" />
                  Pedir ajuda ao Meu Rhitmo
                </Button>
              )}
              <div className="mt-4 rounded-lg bg-blue-50 dark:bg-blue-900/10 p-3 border-l-4 border-blue-500">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  💡 <strong>Próximo passo:</strong> Adicione esta competência ao seu PDI 
                  usando o botão "Propor Ação de Desenvolvimento" abaixo.
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
}