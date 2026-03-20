import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import { Sparkles, PenLine, Loader2, Trash2, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface LevelData {
  seniority_level: string;
  description: string;
  examples: string[];
}

interface GeneratedCompetency {
  name: string;
  description: string;
  levels: LevelData[];
}

interface AICompetencyDialogProps {
  open: boolean;
  onClose: () => void;
  frameworkId: string;
  workspaceId: string;
  currentMaxOrder: number;
  onCreatedManually: () => void;
  onSaved: () => void;
}

const LEVEL_LABELS: Record<string, string> = {
  junior: 'Júnior',
  pleno: 'Pleno',
  senior: 'Sênior',
  especialista: 'Especialista',
};

const JOB_TITLES = [
  'Product Manager', 'Engineering Manager', 'Software Engineer', 'Designer',
  'Customer Success Manager', 'Sales Executive', 'Marketing Manager',
  'Data Analyst', 'HR Business Partner', 'Product Owner',
];

export const AICompetencyDialog = ({
  open, onClose, frameworkId, workspaceId, currentMaxOrder, onCreatedManually, onSaved,
}: AICompetencyDialogProps) => {
  const [mode, setMode] = useState<'select' | 'input' | 'preview'>('select');
  const [jobTitle, setJobTitle] = useState('');
  const [level, setLevel] = useState('Pleno');
  const [industry, setIndustry] = useState('');
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [competencies, setCompetencies] = useState<GeneratedCompetency[]>([]);

  const reset = () => {
    setMode('select');
    setJobTitle('');
    setLevel('Pleno');
    setIndustry('');
    setCompetencies([]);
    setGenerating(false);
    setSaving(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const generate = async () => {
    if (!jobTitle.trim()) {
      toast({ title: 'Digite um cargo', variant: 'destructive' });
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-competencies', {
        body: { job_title: jobTitle, level, industry: industry || undefined },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.competencies?.length) throw new Error('Nenhuma competência gerada');
      setCompetencies(data.competencies);
      setMode('preview');
    } catch (err: any) {
      toast({ title: 'Erro ao gerar', description: err.message, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const removeCompetency = (idx: number) => {
    setCompetencies(prev => prev.filter((_, i) => i !== idx));
  };

  const editField = (idx: number, field: 'name' | 'description', value: string) => {
    setCompetencies(prev =>
      prev.map((c, i) => i === idx ? { ...c, [field]: value } : c)
    );
  };

  const editLevel = (compIdx: number, levelIdx: number, field: 'description', value: string) => {
    setCompetencies(prev =>
      prev.map((c, ci) =>
        ci === compIdx
          ? { ...c, levels: c.levels.map((l, li) => li === levelIdx ? { ...l, [field]: value } : l) }
          : c
      )
    );
  };

  const saveAll = async () => {
    if (!competencies.length) return;
    setSaving(true);
    try {
      for (let i = 0; i < competencies.length; i++) {
        const comp = competencies[i];
        const { data: newComp, error } = await supabase
          .from('competencies')
          .insert({
            framework_id: frameworkId,
            name: comp.name,
            description: comp.description || null,
            order: currentMaxOrder + i + 1,
          })
          .select('id')
          .single();
        if (error) throw error;

        const levelInserts = comp.levels.map(l => ({
          competency_id: newComp.id,
          seniority_level: l.seniority_level,
          description: l.description,
          examples: l.examples?.filter(Boolean).length ? l.examples.filter(Boolean) : null,
        }));

        const { error: lErr } = await supabase
          .from('competency_level_descriptions')
          .insert(levelInserts);
        if (lErr) throw lErr;
      }

      toast({ title: `${competencies.length} competências criadas com sucesso` });
      handleClose();
      onSaved();
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'select' && 'Adicionar Competências'}
            {mode === 'input' && 'Gerar com IA'}
            {mode === 'preview' && `${competencies.length} competências geradas`}
          </DialogTitle>
          <DialogDescription>
            {mode === 'select' && 'Escolha como deseja criar as competências'}
            {mode === 'input' && 'Informe o cargo e a IA gerará competências comportamentais'}
            {mode === 'preview' && 'Revise, edite ou remova antes de salvar'}
          </DialogDescription>
        </DialogHeader>

        {/* Mode selection */}
        {mode === 'select' && (
          <div className="grid gap-4 py-4 sm:grid-cols-2">
            <button
              onClick={() => setMode('input')}
              className="group flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-muted-foreground/20 p-8 text-center transition-all hover:border-primary/40 hover:bg-primary/5 active:scale-[0.98]"
            >
              <Sparkles className="h-8 w-8 text-primary transition-transform group-hover:scale-110" />
              <span className="text-base font-semibold text-foreground">Gerar com IA</span>
              <span className="text-sm text-muted-foreground">
                Informe o cargo e receba 7 competências em 30 segundos
              </span>
            </button>
            <button
              onClick={() => { handleClose(); onCreatedManually(); }}
              className="group flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-muted-foreground/20 p-8 text-center transition-all hover:border-muted-foreground/40 hover:bg-accent active:scale-[0.98]"
            >
              <PenLine className="h-8 w-8 text-muted-foreground transition-transform group-hover:scale-110" />
              <span className="text-base font-semibold text-foreground">Criar manualmente</span>
              <span className="text-sm text-muted-foreground">
                Preencha nome, descrição e comportamentos por nível
              </span>
            </button>
          </div>
        )}

        {/* AI input */}
        {mode === 'input' && (
          <div className="space-y-5 py-4">
            <div>
              <Label htmlFor="ai-job-title">Cargo *</Label>
              <Input
                id="ai-job-title"
                value={jobTitle}
                onChange={e => setJobTitle(e.target.value)}
                placeholder="Ex: Product Manager"
                list="job-titles-list"
                autoFocus
              />
              <datalist id="job-titles-list">
                {JOB_TITLES.map(t => <option key={t} value={t} />)}
              </datalist>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Nível de senioridade</Label>
                <Select value={level} onValueChange={setLevel}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Júnior">Júnior</SelectItem>
                    <SelectItem value="Pleno">Pleno</SelectItem>
                    <SelectItem value="Sênior">Sênior</SelectItem>
                    <SelectItem value="Especialista">Especialista</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="ai-industry">Indústria (opcional)</Label>
                <Input
                  id="ai-industry"
                  value={industry}
                  onChange={e => setIndustry(e.target.value)}
                  placeholder="Ex: Tecnologia, Saúde..."
                />
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={generate} disabled={generating} className="gap-2">
                {generating ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Gerando...</>
                ) : (
                  <><Sparkles className="h-4 w-4" /> Gerar Competências</>
                )}
              </Button>
              <Button variant="ghost" onClick={() => setMode('select')}>Voltar</Button>
            </div>
          </div>
        )}

        {/* Preview */}
        {mode === 'preview' && (
          <div className="space-y-4 py-2">
            {competencies.length === 0 && (
              <div className="flex items-center gap-2 rounded-xl bg-destructive/10 p-4 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                Todas as competências foram removidas. Gere novamente ou crie manualmente.
              </div>
            )}

            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
              {competencies.map((comp, idx) => (
                <div key={idx} className="rounded-2xl border bg-card p-4 space-y-3 shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 space-y-2">
                      <Input
                        value={comp.name}
                        onChange={e => editField(idx, 'name', e.target.value)}
                        className="font-semibold text-base"
                      />
                      <Textarea
                        value={comp.description}
                        onChange={e => editField(idx, 'description', e.target.value)}
                        rows={2}
                        className="text-sm"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeCompetency(idx)}
                      className="flex-shrink-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <Accordion type="single" collapsible className="w-full">
                    {comp.levels.map((lvl, li) => (
                      <AccordionItem key={lvl.seniority_level} value={lvl.seniority_level}>
                        <AccordionTrigger className="text-sm py-2">
                          {LEVEL_LABELS[lvl.seniority_level] || lvl.seniority_level}
                        </AccordionTrigger>
                        <AccordionContent className="space-y-2 pt-1">
                          <Textarea
                            value={lvl.description}
                            onChange={e => editLevel(idx, li, 'description', e.target.value)}
                            rows={2}
                            className="text-sm"
                          />
                          {lvl.examples?.length > 0 && (
                            <div className="space-y-1">
                              <span className="text-xs font-medium text-muted-foreground">Exemplos:</span>
                              {lvl.examples.map((ex, ei) => (
                                <p key={ei} className="text-xs text-muted-foreground pl-2">• {ex}</p>
                              ))}
                            </div>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-2">
              <Button onClick={saveAll} disabled={saving || !competencies.length} className="gap-2">
                {saving ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Salvando...</>
                ) : (
                  `Salvar ${competencies.length} Competências`
                )}
              </Button>
              <Button variant="outline" onClick={() => { setCompetencies([]); setMode('input'); }}>
                Gerar novamente
              </Button>
              <Button variant="ghost" onClick={handleClose}>Descartar</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
