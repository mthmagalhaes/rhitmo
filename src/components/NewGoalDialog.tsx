import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { RichTextEditor } from '@/components/ui/rich-text-editor';

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
}

interface NewGoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberId: string;
  editingGoal?: Goal | null;
  reactivating?: boolean;
}

export const NewGoalDialog = ({ open, onOpenChange, memberId, editingGoal, reactivating }: NewGoalDialogProps) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [metricCurrent, setMetricCurrent] = useState('');
  const [metricTarget, setMetricTarget] = useState('');
  const [metricUnit, setMetricUnit] = useState('');
  const [saving, setSaving] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Preencher campos no modo edição
  useEffect(() => {
    if (editingGoal) {
      setTitle(editingGoal.title);
      setDescription(editingGoal.description || '');
      setTargetDate(editingGoal.target_date || '');
      setMetricCurrent(editingGoal.metric_current?.toString() || '');
      setMetricTarget(editingGoal.metric_target?.toString() || '');
      setMetricUnit(editingGoal.metric_unit || '');
    } else {
      resetForm();
    }
  }, [editingGoal, open]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setTargetDate('');
    setMetricCurrent('');
    setMetricTarget('');
    setMetricUnit('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast({ title: "Título obrigatório", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const goalData = {
        member_id: memberId,
        title: title.trim(),
        description: description.trim() || null,
        target_date: targetDate || null,
        metric_current: metricCurrent ? parseFloat(metricCurrent) : null,
        metric_target: metricTarget ? parseFloat(metricTarget) : null,
        metric_unit: metricUnit.trim() || null,
        status: reactivating ? 'active' : (editingGoal?.status || 'active'),
        completed_at: reactivating ? null : undefined,
      };

      if (editingGoal) {
        const { error } = await supabase
          .from('goals')
          .update(goalData)
          .eq('id', editingGoal.id);
        if (error) throw error;
        toast({ title: reactivating ? "Meta reativada!" : "Meta atualizada!" });
      } else {
        const { error } = await supabase
          .from('goals')
          .insert(goalData);
        if (error) throw error;
        toast({ title: "Meta criada!" });
      }

      queryClient.invalidateQueries({ queryKey: ['goals', memberId] });
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
      : "Nova Meta";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {reactivating ? "Reativar" : editingGoal ? "Salvar" : "Criar Meta"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
