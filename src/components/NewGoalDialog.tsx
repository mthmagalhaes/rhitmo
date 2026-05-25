import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { cn } from '@/lib/utils';

interface Goal {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  start_date?: string | null;
  target_date?: string | null;
  metric_current?: number | null;
  metric_target?: number | null;
  metric_unit?: string | null;
  metric_baseline?: number | null;
  metric_direction?: string | null;
}

interface NewGoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Modo single member (criação ou edição). */
  memberId?: string;
  /** Modo bulk: cria a mesma meta para vários liderados de uma vez. */
  memberIds?: string[];
  editingGoal?: Goal | null;
  reactivating?: boolean;
}

export const NewGoalDialog = ({
  open, onOpenChange, memberId, memberIds, editingGoal, reactivating,
}: NewGoalDialogProps) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [metricCurrent, setMetricCurrent] = useState('');
  const [metricTarget, setMetricTarget] = useState('');
  const [metricUnit, setMetricUnit] = useState('');
  const [direction, setDirection] = useState<'up' | 'down'>('up');
  const [directionTouched, setDirectionTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isBulk = !!memberIds && memberIds.length > 0;
  const bulkCount = memberIds?.length ?? 0;

  // Preencher campos no modo edição / resetar ao abrir
  useEffect(() => {
    if (editingGoal) {
      setTitle(editingGoal.title);
      setDescription(editingGoal.description || '');
      setTargetDate(editingGoal.target_date || '');
      setMetricCurrent(editingGoal.metric_current?.toString() || '');
      setMetricTarget(editingGoal.metric_target?.toString() || '');
      setMetricUnit(editingGoal.metric_unit || '');
      setDirection((editingGoal.metric_direction as 'up' | 'down') || 'up');
      setDirectionTouched(true);
    } else {
      resetForm();
    }
  }, [editingGoal, open]);

  // Auto-detect direction: se atual > alvo e o usuário não escolheu manualmente,
  // assume meta decrescente (ex.: reduzir churn, atingir 87% partindo de 91%).
  useEffect(() => {
    if (directionTouched || editingGoal) return;
    const cur = parseFloat(metricCurrent);
    const tgt = parseFloat(metricTarget);
    if (!isNaN(cur) && !isNaN(tgt) && tgt < cur) setDirection('down');
    else if (!isNaN(cur) && !isNaN(tgt) && tgt > cur) setDirection('up');
  }, [metricCurrent, metricTarget, directionTouched, editingGoal]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setTargetDate('');
    setMetricCurrent('');
    setMetricTarget('');
    setMetricUnit('');
    setDirection('up');
    setDirectionTouched(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast({ title: "Título obrigatório", variant: "destructive" });
      return;
    }
    if (!editingGoal && !isBulk && !memberId) {
      toast({ title: "Selecione ao menos um liderado", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const cur = metricCurrent ? parseFloat(metricCurrent) : null;
      const basePayload = {
        title: title.trim(),
        description: description.trim() || null,
        target_date: targetDate || null,
        metric_current: cur,
        metric_target: metricTarget ? parseFloat(metricTarget) : null,
        metric_unit: metricUnit.trim() || null,
        metric_direction: direction,
        status: reactivating ? 'active' : (editingGoal?.status || 'active'),
        completed_at: reactivating ? null : undefined,
      };

      if (editingGoal) {
        const { error } = await supabase
          .from('goals')
          .update(basePayload)
          .eq('id', editingGoal.id);
        if (error) throw error;
        toast({ title: reactivating ? "Meta reativada!" : "Meta atualizada!" });
      } else if (isBulk) {
        const rows = memberIds!.map((mid) => ({
          ...basePayload,
          member_id: mid,
          metric_baseline: cur,
        }));
        const { error } = await supabase.from('goals').insert(rows);
        if (error) throw error;
        toast({ title: `Meta criada para ${bulkCount} liderado${bulkCount !== 1 ? 's' : ''}!` });
      } else {
        const { error } = await supabase.from('goals').insert({
          ...basePayload,
          member_id: memberId!,
          metric_baseline: cur,
        });
        if (error) throw error;
        toast({ title: "Meta criada!" });
      }

      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['team-goals-summary'] });
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const dialogTitle = reactivating
    ? "Reativar Meta"
    : editingGoal
      ? "Editar Meta"
      : isBulk
        ? `Nova Meta para ${bulkCount} liderado${bulkCount !== 1 ? 's' : ''}`
        : "Nova Meta";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Aumentar SQLs semanais"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <RichTextEditor
              content={description}
              onChange={setDescription}
              placeholder="Detalhes adicionais sobre a meta..."
              minHeight="100px"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetDate" className={reactivating ? "text-primary font-semibold" : ""}>
              Data Alvo {reactivating && "⚡ (defina novo prazo)"}
            </Label>
            <Input
              id="targetDate"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              min={format(new Date(), 'yyyy-MM-dd')}
              className={reactivating ? "ring-2 ring-primary" : ""}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="metricCurrent">Atual</Label>
              <Input
                id="metricCurrent"
                type="number"
                value={metricCurrent}
                onChange={(e) => setMetricCurrent(e.target.value)}
                placeholder="15"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="metricTarget">Meta</Label>
              <Input
                id="metricTarget"
                type="number"
                value={metricTarget}
                onChange={(e) => setMetricTarget(e.target.value)}
                placeholder="25"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="metricUnit">Unidade</Label>
              <Input
                id="metricUnit"
                value={metricUnit}
                onChange={(e) => setMetricUnit(e.target.value)}
                placeholder="SQLs"
              />
            </div>
          </div>

          {/* Direção da meta */}
          {(metricCurrent || metricTarget || editingGoal) && (
            <div className="space-y-2">
              <Label>Direção</Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setDirection('up'); setDirectionTouched(true); }}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors",
                    direction === 'up'
                      ? "bg-primary/10 border-primary text-primary"
                      : "bg-background border-input text-muted-foreground hover:bg-muted/50",
                  )}
                >
                  <TrendingUp className="h-4 w-4" />
                  Subir (maior é melhor)
                </button>
                <button
                  type="button"
                  onClick={() => { setDirection('down'); setDirectionTouched(true); }}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors",
                    direction === 'down'
                      ? "bg-primary/10 border-primary text-primary"
                      : "bg-background border-input text-muted-foreground hover:bg-muted/50",
                  )}
                >
                  <TrendingDown className="h-4 w-4" />
                  Descer (menor é melhor)
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                {direction === 'down'
                  ? 'Ex.: reduzir churn, atingir 87% partindo de 91%.'
                  : 'Ex.: aumentar SQLs, atingir 25 partindo de 15.'}
              </p>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {reactivating
                ? "Reativar"
                : editingGoal
                  ? "Salvar"
                  : isBulk
                    ? `Criar para ${bulkCount}`
                    : "Criar Meta"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
