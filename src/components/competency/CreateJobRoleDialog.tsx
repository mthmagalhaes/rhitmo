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
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Sparkles, Building2, Pencil, Plus, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface SelectedCompetency {
  id: string;
  name: string;
  description: string | null;
  expected_level: string;
  is_required: boolean;
  isNew?: boolean; // AI-generated or manually created (needs DB insert)
  levels?: any[]; // AI-generated level descriptions
}

interface CreateJobRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  frameworkId: string;
  workspaceId: string;
  onOpenTemplateGallery?: () => void;
}

export function CreateJobRoleDialog({ open, onOpenChange, frameworkId, workspaceId, onOpenTemplateGallery }: CreateJobRoleDialogProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<'details' | 'source' | 'competencies'>('details');
  const [title, setTitle] = useState('');
  const [level, setLevel] = useState('');
  const [department, setDepartment] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCompetencies, setSelectedCompetencies] = useState<SelectedCompetency[]>([]);
  const [competencySource, setCompetencySource] = useState<'ai' | 'template' | 'manual' | null>(null);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isCreatingNewCompetency, setIsCreatingNewCompetency] = useState(false);
  const [newCompetencyName, setNewCompetencyName] = useState('');
  const [newCompetencyDescription, setNewCompetencyDescription] = useState('');
  const [newCompetencyExpectedLevel, setNewCompetencyExpectedLevel] = useState('Pleno');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const { data: availableCompetencies } = useQuery({
    queryKey: ['competencies-for-role', frameworkId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('competencies')
        .select('id, name, description, role_competencies(count)')
        .eq('framework_id', frameworkId)
        .eq('is_active', true)
        .order('order');
      if (error) throw error;
      return (data || []).filter((c: any) => (c.role_competencies?.[0]?.count || 0) > 0);
    },
    enabled: open && !!frameworkId,
  });

  useEffect(() => {
    if (!open) {
      setTitle(''); setLevel(''); setDepartment(''); setDescription('');
      setSelectedCompetencies([]); setStep('details');
      setCompetencySource(null); setIsGeneratingAI(false);
      setIsCreatingNewCompetency(false);
      setNewCompetencyName(''); setNewCompetencyDescription('');
      setNewCompetencyExpectedLevel('Pleno');
      setEditingIndex(null);
    }
  }, [open]);

  const handleSourceChoice = async () => {
    if (competencySource === 'ai') {
      setStep('competencies');
      setIsGeneratingAI(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-competencies`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session?.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              job_title: title,
              level: level || undefined,
              industry: department || undefined,
            }),
          }
        );
        if (!response.ok) throw new Error('Failed to generate');
        const { competencies } = await response.json();
        const mapped: SelectedCompetency[] = competencies.map((comp: any) => ({
          id: crypto.randomUUID(),
          name: comp.name,
          description: comp.description,
          expected_level: level || 'Pleno',
          is_required: true,
          isNew: true,
          levels: comp.levels,
        }));
        setSelectedCompetencies(mapped);
        toast({ title: `${competencies.length} competências geradas com IA!` });
      } catch {
        toast({ title: 'Erro ao gerar competências', variant: 'destructive' });
        setStep('source');
      } finally {
        setIsGeneratingAI(false);
      }
    } else if (competencySource === 'template') {
      onOpenChange(false);
      onOpenTemplateGallery?.();
    } else if (competencySource === 'manual') {
      setStep('competencies');
    }
  };

  const handleCreateAndAddCompetency = async () => {
    if (!newCompetencyName.trim()) return;
    // Add as a new competency that will be inserted on save
    setSelectedCompetencies(prev => [...prev, {
      id: crypto.randomUUID(),
      name: newCompetencyName,
      description: newCompetencyDescription || null,
      expected_level: newCompetencyExpectedLevel,
      is_required: true,
      isNew: true,
    }]);
    setIsCreatingNewCompetency(false);
    setNewCompetencyName('');
    setNewCompetencyDescription('');
    setNewCompetencyExpectedLevel('Pleno');
    toast({ title: 'Competência adicionada!' });
  };

  const toggleCompetency = (comp: { id: string; name: string; description: string | null }) => {
    const exists = selectedCompetencies.find(c => c.id === comp.id);
    if (exists) {
      setSelectedCompetencies(prev => prev.filter(c => c.id !== comp.id));
    } else {
      setSelectedCompetencies(prev => [...prev, {
        id: comp.id, name: comp.name, description: comp.description,
        expected_level: 'Pleno', is_required: true,
      }]);
    }
  };

  const updateLevel = (compId: string, newLevel: string) => {
    setSelectedCompetencies(prev =>
      prev.map(c => c.id === compId ? { ...c, expected_level: newLevel } : c)
    );
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      let fwId = frameworkId;

      // Auto-create framework if none exists
      if (!fwId) {
        const { data: fw, error: fwErr } = await supabase
          .from('competency_frameworks')
          .insert({ workspace_id: workspaceId })
          .select('id')
          .single();
        if (fwErr) throw fwErr;
        fwId = fw.id;
      }

      // Get current max order
      const { data: existingComps } = await supabase
        .from('competencies')
        .select('order')
        .eq('framework_id', fwId)
        .order('order', { ascending: false })
        .limit(1);
      let nextOrder = (existingComps?.[0]?.order ?? 0) + 1;

      // Insert the job role
      const { data: role, error: roleError } = await supabase
        .from('job_roles')
        .insert({
          framework_id: fwId,
          title, level: level || null,
          department: department || null,
          description: description || null,
        })
        .select('id')
        .single();
      if (roleError) throw roleError;

      // Process competencies
      for (const comp of selectedCompetencies) {
        let competencyId = comp.id;

        if (comp.isNew) {
          // Insert new competency into DB
          const { data: newComp, error: compErr } = await supabase
            .from('competencies')
            .insert({
              framework_id: fwId,
              name: comp.name,
              description: comp.description,
              order: nextOrder++,
            })
            .select('id')
            .single();
          if (compErr) throw compErr;
          competencyId = newComp.id;

          // Insert level descriptions if AI-generated
          if (comp.levels?.length) {
            const levelInserts = comp.levels.map((l: any) => ({
              competency_id: competencyId,
              seniority_level: l.seniority_level,
              description: l.description,
              examples: l.examples?.length ? l.examples : null,
            }));
            const { error: levelErr } = await supabase
              .from('competency_level_descriptions')
              .insert(levelInserts);
            if (levelErr) throw levelErr;
          }
        }

        // Create role-competency association
        const { error } = await supabase.from('role_competencies').insert({
          job_role_id: role.id,
          competency_id: competencyId,
          expected_level: comp.expected_level,
          is_required: comp.is_required,
          weight: 1,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-roles'] });
      queryClient.invalidateQueries({ queryKey: ['competency-framework'] });
      toast({ title: 'Cargo criado com sucesso!' });
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao criar cargo', description: err.message, variant: 'destructive' });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar Cargo</DialogTitle>
        </DialogHeader>

        {/* Step 1: Details */}
        {step === 'details' && (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Título do Cargo *</Label>
              <Input placeholder="Ex: Product Manager" value={title} onChange={e => setTitle(e.target.value)} />
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
                <Input placeholder="Ex: Product" value={department} onChange={e => setDepartment(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea placeholder="Descrição do cargo..." value={description} onChange={e => setDescription(e.target.value)} rows={3} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button onClick={() => setStep('source')} disabled={!title.trim()}>
                Próximo: Competências
              </Button>
            </div>
          </div>
        )}

        {/* Step 1.5: Source selection */}
        {step === 'source' && (
          <div className="space-y-4 py-2">
            <p className="text-sm font-medium">Como você quer definir as competências para {title}?</p>
            <div className="space-y-3">
              {[
                { key: 'ai' as const, icon: Sparkles, label: 'Gerar com IA', desc: `IA gera 3-5 competências relevantes para ${title} ${level || ''} com 4 níveis de senioridade` },
                { key: 'template' as const, icon: Building2, label: 'Importar de Template', desc: 'Escolha frameworks de empresas referência (Spotify, Google, Nubank)' },
                { key: 'manual' as const, icon: Pencil, label: 'Selecionar/Criar Manualmente', desc: 'Escolha competências da sua biblioteca ou crie novas' },
              ].map(({ key, icon: Icon, label, desc }) => (
                <Card
                  key={key}
                  className={`cursor-pointer transition-colors hover:border-primary ${competencySource === key ? 'border-primary bg-accent' : ''}`}
                  onClick={() => setCompetencySource(key)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{label}</p>
                        <p className="text-xs text-muted-foreground">{desc}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep('details')}>Voltar</Button>
              <Button onClick={handleSourceChoice} disabled={!competencySource}>
                {competencySource === 'ai' && 'Gerar Competências'}
                {competencySource === 'template' && 'Escolher Template'}
                {competencySource === 'manual' && 'Selecionar Competências'}
                {!competencySource && 'Selecione uma opção'}
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Competencies */}
        {step === 'competencies' && (
          <div className="space-y-4 py-2">
            {isGeneratingAI ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-sm font-medium">Gerando competências com IA...</p>
                <p className="text-xs text-muted-foreground">Isso pode levar alguns segundos</p>
              </div>
            ) : (
              <>
                {competencySource === 'manual' && (
                  <>
                    <Button
                      variant="outline"
                      className="w-full justify-start border-dashed"
                      onClick={() => setIsCreatingNewCompetency(true)}
                    >
                      <Plus className="mr-2 h-4 w-4" /> Criar Nova Competência
                    </Button>

                    {isCreatingNewCompetency && (
                      <Card className="border-primary">
                        <CardContent className="pt-4 space-y-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Nome *</Label>
                            <Input placeholder="Ex: Visão de Produto" value={newCompetencyName} onChange={e => setNewCompetencyName(e.target.value)} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Descrição</Label>
                            <Textarea placeholder="Capacidade de..." value={newCompetencyDescription} onChange={e => setNewCompetencyDescription(e.target.value)} rows={2} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Nível esperado</Label>
                            <Select value={newCompetencyExpectedLevel} onValueChange={setNewCompetencyExpectedLevel}>
                              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {['Júnior', 'Pleno', 'Sênior', 'Especialista'].map(l => (
                                  <SelectItem key={l} value={l}>{l}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => { setIsCreatingNewCompetency(false); setNewCompetencyName(''); setNewCompetencyDescription(''); }}>
                              Cancelar
                            </Button>
                            <Button size="sm" onClick={handleCreateAndAddCompetency} disabled={!newCompetencyName.trim()}>
                              <Plus className="mr-1 h-3 w-3" /> Adicionar
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    <Separator />
                    <p className="text-xs font-medium text-muted-foreground">Ou selecione competências existentes</p>
                  </>
                )}

                {competencySource === 'ai' && (
                  <>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">Revise e ajuste as competências geradas:</p>
                      <Button
                        variant="outline" size="sm" className="gap-1 text-xs"
                        onClick={() => {
                          const newComp: SelectedCompetency = {
                            id: crypto.randomUUID(), name: '', description: '',
                            expected_level: level || 'Pleno', is_required: true, isNew: true,
                          };
                          setSelectedCompetencies(prev => [...prev, newComp]);
                          setEditingIndex(selectedCompetencies.length);
                        }}
                      >
                        <Plus className="h-3 w-3" /> Adicionar
                      </Button>
                    </div>
                  </>
                )}

                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {competencySource === 'manual' ? (
                    availableCompetencies?.map(comp => {
                      const selected = selectedCompetencies.find(c => c.id === comp.id);
                      return (
                        <div key={comp.id} className="border rounded-xl p-3 space-y-2">
                          <div className="flex items-start gap-3">
                            <Checkbox checked={!!selected} onCheckedChange={() => toggleCompetency(comp)} className="mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm">{comp.name}</p>
                              {comp.description && <p className="text-xs text-muted-foreground line-clamp-2">{comp.description}</p>}
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
                    })
                  ) : (
                    selectedCompetencies.map((comp, idx) => (
                      <Card key={comp.id}>
                        <CardContent className="p-3">
                          {editingIndex === idx ? (
                            <div className="space-y-2">
                              <div>
                                <Label className="text-xs">Nome *</Label>
                                <Input
                                  value={comp.name}
                                  onChange={e => setSelectedCompetencies(prev =>
                                    prev.map((c, i) => i === idx ? { ...c, name: e.target.value } : c)
                                  )}
                                  placeholder="Nome da competência"
                                  className="mt-1"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Descrição</Label>
                                <Textarea
                                  value={comp.description || ''}
                                  onChange={e => setSelectedCompetencies(prev =>
                                    prev.map((c, i) => i === idx ? { ...c, description: e.target.value } : c)
                                  )}
                                  placeholder="Descrição da competência"
                                  rows={2}
                                  className="mt-1"
                                />
                              </div>
                              <div className="flex gap-2">
                                <Button size="sm" variant="outline" onClick={() => {
                                  if (!comp.name.trim()) {
                                    setSelectedCompetencies(prev => prev.filter((_, i) => i !== idx));
                                  }
                                  setEditingIndex(null);
                                }}>
                                  {comp.name.trim() ? 'OK' : 'Cancelar'}
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm">{comp.name}</p>
                                {comp.description && <p className="text-xs text-muted-foreground mt-0.5">{comp.description}</p>}
                              </div>
                              <div className="flex gap-0.5 shrink-0">
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                                  onClick={() => setEditingIndex(idx)}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                                  onClick={() => setSelectedCompetencies(prev => prev.filter((_, i) => i !== idx))}>
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))
                  )}
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
                  <Button variant="outline" onClick={() => setStep('source')}>Voltar</Button>
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
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
