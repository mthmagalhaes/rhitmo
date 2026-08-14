import { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import { Plus, X } from 'lucide-react';

const LEVELS = [
  { key: 'junior', label: 'Júnior', hint: '0-2 anos' },
  { key: 'pleno', label: 'Pleno', hint: '2-5 anos' },
  { key: 'senior', label: 'Sênior', hint: '5-8 anos' },
  { key: 'especialista', label: 'Especialista', hint: '8+ anos' },
] as const;

export interface LevelData {
  seniority_level: string;
  description: string;
  examples: string[];
}

export interface CompetencyFormData {
  name: string;
  description: string;
  levels: LevelData[];
}

interface EditCompetencyModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: CompetencyFormData) => Promise<void>;
  initialData?: CompetencyFormData | null;
  saving?: boolean;
}

const emptyLevels: LevelData[] = LEVELS.map(l => ({
  seniority_level: l.key,
  description: '',
  examples: [],
}));

export const EditCompetencyModal = ({
  open, onClose, onSave, initialData, saving,
}: EditCompetencyModalProps) => {
  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<CompetencyFormData>({
    defaultValues: initialData || { name: '', description: '', levels: emptyLevels },
  });

  useEffect(() => {
    if (open) {
      reset(initialData || { name: '', description: '', levels: emptyLevels });
    }
  }, [open, initialData, reset]);

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Editar Competência' : 'Nova Competência'}</DialogTitle>
          <DialogDescription>
            Defina o nome, descrição e comportamentos esperados por nível de senioridade.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSave)} className="space-y-6">
          <div className="space-y-3">
            <div>
              <Label htmlFor="comp-name">Nome da competência *</Label>
              <Input
                id="comp-name"
                {...register('name', { required: 'Nome é obrigatório' })}
                placeholder="Ex: Comunicação"
              />
              {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <Label htmlFor="comp-desc">Descrição curta</Label>
              <Textarea
                id="comp-desc"
                {...register('description', { maxLength: { value: 200, message: 'Máximo 200 caracteres' } })}
                placeholder="Breve descrição da competência"
                rows={2}
              />
              {errors.description && <p className="text-sm text-destructive mt-1">{errors.description.message}</p>}
            </div>
          </div>

          <Accordion type="multiple" defaultValue={LEVELS.map(l => l.key)} className="w-full">
            {LEVELS.map((level, idx) => (
              <AccordionItem key={level.key} value={level.key}>
                <AccordionTrigger className="text-sm font-medium">
                  {level.label} <span className="text-muted-foreground ml-1 font-normal">({level.hint})</span>
                </AccordionTrigger>
                <AccordionContent className="space-y-3 pt-2">
                  <div>
                    <Label>Comportamento esperado *</Label>
                    <Textarea
                      {...register(`levels.${idx}.description`, {
                        required: 'Descrição do nível é obrigatória',
                        minLength: { value: 20, message: 'Mínimo 20 caracteres' },
                      })}
                      placeholder="Descreva o comportamento esperado neste nível..."
                      rows={3}
                    />
                    {errors.levels?.[idx]?.description && (
                      <p className="text-sm text-destructive mt-1">{errors.levels[idx].description?.message}</p>
                    )}
                  </div>
                  <ExamplesField control={control} levelIndex={idx} />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar Competência'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const ExamplesField = ({ control, levelIndex }: { control: any; levelIndex: number }) => {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `levels.${levelIndex}.examples`,
  });

  return (
    <div>
      <Label className="mb-1 block">Exemplos práticos (opcional, máx. 3)</Label>
      <div className="space-y-2">
        {fields.map((field, i) => (
          <div key={field.id} className="flex gap-2">
            <Input
              {...control.register(`levels.${levelIndex}.examples.${i}`)}
              placeholder={`Exemplo ${i + 1}`}
            />
            <Button type="button" variant="ghost" size="icon" aria-label="Remover exemplo" onClick={() => remove(i)} className="flex-shrink-0">
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      {fields.length < 3 && (
        <Button type="button" variant="outline" size="sm" className="mt-2 gap-1" onClick={() => append('')}>
          <Plus className="h-3.5 w-3.5" /> Adicionar exemplo
        </Button>
      )}
    </div>
  );
};
