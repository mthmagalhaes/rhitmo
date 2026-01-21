import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Goal } from "./GoalCard";

interface NewGoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberId: string;
  memberName: string;
  editingGoal?: Goal | null;
  onGoalSaved: () => void;
}

export function NewGoalDialog({
  open,
  onOpenChange,
  memberId,
  memberName,
  editingGoal,
  onGoalSaved,
}: NewGoalDialogProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [targetDate, setTargetDate] = useState<Date | undefined>();
  const [metricCurrent, setMetricCurrent] = useState("");
  const [metricTarget, setMetricTarget] = useState("");
  const [metricUnit, setMetricUnit] = useState("");

  useEffect(() => {
    if (editingGoal) {
      setTitle(editingGoal.title);
      setDescription(editingGoal.description || "");
      setStartDate(editingGoal.start_date ? new Date(editingGoal.start_date) : undefined);
      setTargetDate(editingGoal.target_date ? new Date(editingGoal.target_date) : undefined);
      setMetricCurrent(editingGoal.metric_current?.toString() || "");
      setMetricTarget(editingGoal.metric_target?.toString() || "");
      setMetricUnit(editingGoal.metric_unit || "");
    } else {
      resetForm();
    }
  }, [editingGoal, open]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setStartDate(new Date());
    setTargetDate(undefined);
    setMetricCurrent("");
    setMetricTarget("");
    setMetricUnit("");
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast({
        title: "Título obrigatório",
        description: "Por favor, informe o título da meta.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      const goalData = {
        member_id: memberId,
        title: title.trim(),
        description: description || null,
        start_date: startDate ? format(startDate, "yyyy-MM-dd") : null,
        target_date: targetDate ? format(targetDate, "yyyy-MM-dd") : null,
        metric_current: metricCurrent ? parseFloat(metricCurrent) : null,
        metric_target: metricTarget ? parseFloat(metricTarget) : null,
        metric_unit: metricUnit || null,
      };

      if (editingGoal) {
        const { error } = await supabase
          .from("goals")
          .update(goalData)
          .eq("id", editingGoal.id);

        if (error) throw error;

        toast({
          title: "Meta atualizada",
          description: "A meta foi atualizada com sucesso.",
        });
      } else {
        const { error } = await supabase
          .from("goals")
          .insert(goalData);

        if (error) throw error;

        toast({
          title: "Meta criada",
          description: "A nova meta foi criada com sucesso.",
        });
      }

      onGoalSaved();
      handleClose();
    } catch (error: any) {
      console.error("Error saving goal:", error);
      toast({
        title: "Erro ao salvar",
        description: error.message || "Não foi possível salvar a meta.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingGoal ? "Editar Meta" : "Nova Meta"}
          </DialogTitle>
          <DialogDescription>
            {editingGoal 
              ? `Editando meta de ${memberName}`
              : `Definir uma nova meta para ${memberName}`
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="goal-title">Título *</Label>
            <Input
              id="goal-title"
              placeholder="Ex: Aumentar SQLs semanais"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Descrição (opcional)</Label>
            <RichTextEditor
              content={description}
              onChange={setDescription}
              placeholder="Descreva o contexto, estratégias ou detalhes da meta..."
              className="min-h-[150px]"
            />
          </div>

          {/* Metrics */}
          <div className="space-y-2">
            <Label>Métricas (opcional)</Label>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Valor Atual</span>
                <Input
                  type="number"
                  placeholder="15"
                  value={metricCurrent}
                  onChange={(e) => setMetricCurrent(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Meta</span>
                <Input
                  type="number"
                  placeholder="25"
                  value={metricTarget}
                  onChange={(e) => setMetricTarget(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Unidade</span>
                <Input
                  placeholder="SQLs, horas, %"
                  value={metricUnit}
                  onChange={(e) => setMetricUnit(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="space-y-2">
            <Label>Datas</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Início</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      locale={ptBR}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Prazo</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !targetDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {targetDate ? format(targetDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={targetDate}
                      onSelect={setTargetDate}
                      locale={ptBR}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : editingGoal ? "Salvar Alterações" : "Criar Meta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
