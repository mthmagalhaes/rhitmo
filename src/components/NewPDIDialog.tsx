import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface PDIItem {
  title: string;
  category: string;
  description: string;
  due_date: string;
}

interface NewPDIDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberId: string;
}

const emptyItem = (): PDIItem => ({ title: '', category: 'aprender', description: '', due_date: '' });

export function NewPDIDialog({ open, onOpenChange, memberId }: NewPDIDialogProps) {
  const queryClient = useQueryClient();
  const [periodLabel, setPeriodLabel] = useState('');
  const [items, setItems] = useState<PDIItem[]>([emptyItem()]);
  const [isLoading, setIsLoading] = useState(false);

  const addItem = () => {
    if (items.length >= 5) return;
    setItems([...items, emptyItem()]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof PDIItem, value: string) => {
    setItems(items.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const validItems = items.filter(i => i.title.trim());

  const handleSubmit = async () => {
    if (validItems.length === 0) return;
    setIsLoading(true);
    try {
      // 1. Create the plan
      const { data: plan, error: planError } = await supabase
        .from('development_plans')
        .insert({
          member_id: memberId,
          status: 'active',
          proposed_at: new Date().toISOString(),
          period_label: periodLabel || null,
          created_by_member: true,
        } as any)
        .select('id')
        .single();

      if (planError) throw planError;

      // 2. Create items
      const itemsToInsert = validItems.map(item => ({
        plan_id: plan.id,
        title: item.title.trim(),
        category: item.category,
        description: item.description.trim() || null,
        due_date: item.due_date || null,
        status: 'pending',
      }));

      const { error: itemsError } = await supabase
        .from('development_items')
        .insert(itemsToInsert as any);

      if (itemsError) throw itemsError;

      toast.success('PDI criado! Seu líder foi notificado.');
      queryClient.invalidateQueries({ queryKey: ['my-dev-plan'] });
      onOpenChange(false);
      setPeriodLabel('');
      setItems([emptyItem()]);
    } catch (err: any) {
      console.error('Error creating PDI:', err);
      toast.error('Erro ao criar PDI. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const categoryLabels: Record<string, string> = {
    aprender: '🎓 Aprender',
    praticar: '🏋️ Praticar',
    entregar: '🚀 Entregar',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Propor Ação de Desenvolvimento</DialogTitle>
          <DialogDescription>
            O que você quer desenvolver nos próximos meses? Seja específico e objetivo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          <div>
            <Label htmlFor="period">Período</Label>
            <Input
              id="period"
              value={periodLabel}
              onChange={e => setPeriodLabel(e.target.value)}
              placeholder="Ex: Q2 2026, Próximos 3 meses"
            />
          </div>

          {items.map((item, index) => (
            <div key={index} className="p-4 rounded-xl border border-border bg-muted/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">Objetivo {index + 1}</span>
                {items.length > 1 && (
                  <Button variant="ghost" size="icon" aria-label="Remover item" onClick={() => removeItem(index)} className="h-8 w-8">
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                )}
              </div>

              <Input
                value={item.title}
                onChange={e => updateItem(index, 'title', e.target.value)}
                placeholder="Ex: Aprofundar em métricas financeiras"
              />

              <Select value={item.category} onValueChange={v => updateItem(index, 'category', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aprender">🎓 Aprender (curso, leitura, estudo)</SelectItem>
                  <SelectItem value="praticar">🏋️ Praticar (aplicar no trabalho)</SelectItem>
                  <SelectItem value="entregar">🚀 Entregar (projeto, meta tangível)</SelectItem>
                </SelectContent>
              </Select>

              <Textarea
                value={item.description}
                onChange={e => updateItem(index, 'description', e.target.value)}
                placeholder="Como você pretende fazer isso?"
                rows={2}
                className="resize-none"
              />

              <div>
                <Label className="text-xs text-muted-foreground">Prazo (opcional)</Label>
                <Input
                  type="date"
                  value={item.due_date}
                  onChange={e => updateItem(index, 'due_date', e.target.value)}
                />
              </div>
            </div>
          ))}

          {items.length < 5 && (
            <Button variant="outline" onClick={addItem} className="w-full gap-2">
              <Plus className="h-4 w-4" />
              Adicionar objetivo
            </Button>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={validItems.length === 0 || isLoading} className="gap-2">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Criar meu PDI
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
