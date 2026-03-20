import { useState, useEffect } from 'react';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface SelectedCompetency {
  id: string;
  name: string;
  description: string | null;
  expected_level: string;
  is_required: boolean;
}

interface CreateJobRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  frameworkId: string;
}

export function CreateJobRoleDialog({ open, onOpenChange, frameworkId }: CreateJobRoleDialogProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<'details' | 'competencies'>('details');
  const [title, setTitle] = useState('');
  const [level, setLevel] = useState('');
  const [department, setDepartment] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCompetencies, setSelectedCompetencies] = useState<SelectedCompetency[]>([]);

  const { data: availableCompetencies } = useQuery({
    queryKey: ['competencies-for-role', frameworkId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('competencies')
        .select('id, name, description')
        .eq('framework_id', frameworkId)
        .eq('is_active', true)
        .order('order');
      if (error) throw error;
      return data;
    },
    enabled: open && !!frameworkId,
  });

  useEffect(() => {
    if (!open) {
      setTitle('');
      setLevel('');
      setDepartment('');
      setDescription('');
      setSelectedCompetencies([]);
      setStep('details');
    }
  }, [open]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data: role, error: roleError } = await supabase
        .from('job_roles')
        .insert({
          framework_id: frameworkId,
          title,
          level: level || null,
          department: department || null,
          description: description || null,
        })
        .select('id')
        .single();
      if (roleError) throw roleError;

      if (selectedCompetencies.length > 0) {
        const inserts = selectedCompetencies.map(c => ({
          job_role_id: role.id,
          competency_id: c.id,
          expected_level: c.expected_level,
          is_required: c.is_required,
          weight: 1,
        }));
        const { error } = await supabase.from('role_competencies').insert(inserts);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-roles'] });
      toast({ title: 'Cargo criado com sucesso!' });
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao criar cargo', description: err.message, variant: 'destructive' });
    },
  });

  const toggleCompetency = (comp: { id: string; name: string; description: string | null }) => {
    const exists = selectedCompetencies.find(c => c.id === comp.id);
    if (exists) {
      setSelectedCompetencies(prev => prev.filter(c => c.id !== comp.id));
    } else {
      setSelectedCompetencies(prev => [...prev, {
        id: comp.id,
        name: comp.name,
        description: comp.description,
        expected_level: 'Pleno',
        is_required: true,
      }]);
    }
  };

  const updateLevel = (compId: string, newLevel: string) => {
    setSelectedCompetencies(prev =>
      prev.map(c => c.id === compId ? { ...c, expected_level: newLevel } : c)
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Adicionar Cargo</DialogTitle>
        </DialogHeader>

        {step === 'details' && (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Título do Cargo *</Label>
              <Input
                placeholder="Ex: Product Manager"
                value={title}
                onChange={e => setTitle(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nível</Label>
                <Select value={level} onValueChange={setLevel}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {['Júnior', 'Pleno', 'Sênior', 'Especialista', 'Staff', 'Principal'].map(l => (
                      <SelectItem key={l} value={l}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Departamento</Label>
                <Input
                  placeholder="Ex: Product"
                  value={department}
                  onChange={e => setDepartment(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                placeholder="Descrição do cargo..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button onClick={() => setStep('competencies')} disabled={!title.trim()}>
                Próximo: Competências
              </Button>
            </div>
          </div>
        )}

        {step === 'competencies' && (
          <div className="space-y-4 py-2">
            <p className="text-sm font-medium">Selecione as competências para este cargo</p>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {availableCompetencies?.map(comp => {
                const selected = selectedCompetencies.find(c => c.id === comp.id);
                return (
                  <div key={comp.id} className="border rounded-xl p-3 space-y-2">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={!!selected}
                        onCheckedChange={() => toggleCompetency(comp)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{comp.name}</p>
                        {comp.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">{comp.description}</p>
                        )}
                      </div>
                    </div>
                    {selected && (
                      <div className="ml-7 flex items-center gap-2">
                        <Label className="text-xs text-muted-foreground">Nível esperado:</Label>
                        <Select value={selected.expected_level} onValueChange={val => updateLevel(comp.id, val)}>
                          <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {['Júnior', 'Pleno', 'Sênior', 'Especialista'].map(l => (
                              <SelectItem key={l} value={l}>{l}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <Separator />

            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">
                {selectedCompetencies.length} competência(s) selecionada(s)
              </p>
              <div className="flex flex-wrap gap-1.5">
                {selectedCompetencies.map(c => (
                  <Badge key={c.id} variant="outline" className="text-xs">
                    {c.name} · {c.expected_level}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep('details')}>Voltar</Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                <Button
                  onClick={() => createMutation.mutate()}
                  disabled={createMutation.isPending || selectedCompetencies.length === 0}
                >
                  {createMutation.isPending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</>
                  ) : 'Salvar Cargo'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
