import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Building2, Briefcase, ChevronRight, ChevronLeft, Loader2,
  Monitor, ShoppingCart, Headphones, Megaphone, Palette, Users, BarChart3,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import type { Json } from '@/integrations/supabase/types';

interface TemplateCompetency {
  name: string;
  description: string;
  levels?: {
    seniority_level: string;
    description: string;
    examples?: string[];
  }[];
}

interface Template {
  id: string;
  name: string;
  company: string;
  job_title: string;
  level: string | null;
  description: string | null;
  competencies: TemplateCompetency[];
}

interface TemplateMarketplaceProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  frameworkId: string;
  workspaceId: string;
}

const industryIcons: Record<string, typeof Monitor> = {
  'Tech Industry': Monitor,
  'Product Industry': Briefcase,
  'Sales Industry': ShoppingCart,
  'CS Industry': Headphones,
  'Marketing Industry': Megaphone,
  'Design Industry': Palette,
  'People Industry': Users,
  'Data Industry': BarChart3,
};

const industryLabels: Record<string, string> = {
  'Tech Industry': 'Tecnologia',
  'Product Industry': 'Produto',
  'Sales Industry': 'Vendas',
  'CS Industry': 'Customer Success',
  'Marketing Industry': 'Marketing',
  'Design Industry': 'Design',
  'People Industry': 'People/RH',
  'Data Industry': 'Dados',
};

export function TemplateMarketplace({ open, onOpenChange, frameworkId, workspaceId }: TemplateMarketplaceProps) {
  const queryClient = useQueryClient();
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['competency-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('competency_templates')
        .select('*')
        .eq('is_public', true)
        .order('name');
      if (error) throw error;
      return (data || []).map(t => ({
        ...t,
        competencies: (t.competencies as unknown as TemplateCompetency[]) || [],
      })) as Template[];
    },
    enabled: open,
  });

  const importMutation = useMutation({
    mutationFn: async (template: Template) => {
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

      // Insert job role
      const { data: role, error: roleError } = await supabase
        .from('job_roles')
        .insert({
          framework_id: fwId,
          title: template.job_title,
          level: template.level || null,
          department: industryLabels[template.company] || template.company,
          description: template.description || null,
        })
        .select('id')
        .single();
      if (roleError) throw roleError;

      // Insert each competency
      for (const comp of template.competencies) {
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

        // Insert level descriptions
        if (comp.levels?.length) {
          const levelInserts = comp.levels.map(l => ({
            competency_id: newComp.id,
            seniority_level: l.seniority_level,
            description: l.description,
            examples: l.examples?.length ? (l.examples as unknown as Json) : null,
          }));
          const { error: levelErr } = await supabase
            .from('competency_level_descriptions')
            .insert(levelInserts);
          if (levelErr) throw levelErr;
        }

        // Create role-competency association
        const { error: rcErr } = await supabase.from('role_competencies').insert({
          job_role_id: role.id,
          competency_id: newComp.id,
          expected_level: template.level || 'Pleno',
          is_required: true,
          weight: 1,
        });
        if (rcErr) throw rcErr;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-roles'] });
      queryClient.invalidateQueries({ queryKey: ['competency-framework'] });
      queryClient.invalidateQueries({ queryKey: ['competencies-library'] });
      toast({ title: 'Template importado com sucesso!', description: 'Cargo e competências foram adicionados ao seu framework.' });
      setSelectedTemplate(null);
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao importar template', description: err.message, variant: 'destructive' });
    },
  });

  const levelLabels: Record<string, string> = {
    junior: 'Júnior',
    pleno: 'Pleno',
    senior: 'Sênior',
    especialista: 'Especialista',
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) setSelectedTemplate(null); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {selectedTemplate ? (
              <Button variant="ghost" size="icon" className="h-7 w-7 -ml-1" onClick={() => setSelectedTemplate(null)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
            ) : (
              <Building2 className="h-5 w-5 text-primary" />
            )}
            {selectedTemplate ? selectedTemplate.name : 'Marketplace de Templates'}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          {isLoading ? (
            <div className="grid grid-cols-2 gap-3 pb-4">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-36 rounded-2xl" />)}
            </div>
          ) : selectedTemplate ? (
            /* Template Detail View */
            <div className="space-y-4 pb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs">{selectedTemplate.job_title}</Badge>
                {selectedTemplate.level && <Badge variant="secondary" className="text-xs">{selectedTemplate.level}</Badge>}
                <Badge className="text-xs bg-primary/10 text-primary border-0">
                  {selectedTemplate.competencies.length} competências
                </Badge>
              </div>
              {selectedTemplate.description && (
                <p className="text-sm text-muted-foreground">{selectedTemplate.description}</p>
              )}

              <div className="space-y-3">
                {selectedTemplate.competencies.map((comp, idx) => (
                  <Card key={idx} className="rounded-xl">
                    <CardContent className="p-4 space-y-2">
                      <p className="font-medium text-sm text-foreground">{comp.name}</p>
                      <p className="text-xs text-muted-foreground">{comp.description}</p>
                      {comp.levels && comp.levels.length > 0 && (
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          {comp.levels.map((level, lIdx) => (
                            <div key={lIdx} className="p-2 bg-muted/30 rounded-lg">
                              <p className="text-xs font-medium text-foreground mb-0.5">
                                {levelLabels[level.seniority_level] || level.seniority_level}
                              </p>
                              <p className="text-xs text-muted-foreground leading-relaxed">{level.description}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="sticky bottom-0 pt-4 bg-background">
                <Button
                  className="w-full gap-2"
                  onClick={() => importMutation.mutate(selectedTemplate)}
                  disabled={importMutation.isPending}
                >
                  {importMutation.isPending ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Importando...</>
                  ) : (
                    'Usar este template'
                  )}
                </Button>
              </div>
            </div>
          ) : (
            /* Grid View */
            <div className="grid grid-cols-2 gap-3 pb-4">
              {templates.map(template => {
                const Icon = industryIcons[template.company] || Building2;
                const label = industryLabels[template.company] || template.company;
                return (
                  <Card
                    key={template.id}
                    className="rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group"
                    onClick={() => setSelectedTemplate(template)}
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-foreground leading-tight">{template.job_title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {template.level && (
                          <Badge variant="outline" className="text-[10px] h-5">{template.level}</Badge>
                        )}
                        <Badge variant="secondary" className="text-[10px] h-5">
                          {template.competencies.length} competências
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
