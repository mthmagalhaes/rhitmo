import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHRAdmin } from '@/components/HRAdminGuard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Briefcase, BookOpen, Pencil, Trash2, Sparkles, Building2 } from 'lucide-react';
import { EditCompetencyModal, type CompetencyFormData } from '@/components/competency/EditCompetencyModal';
import { CreateJobRoleDialog } from '@/components/competency/CreateJobRoleDialog';
import { AdjustCompetencyDialog } from '@/components/competency/AdjustCompetencyDialog';
import type { Json } from '@/integrations/supabase/types';

interface Competency {
  id: string;
  name: string;
  description: string | null;
  order: number;
  is_active: boolean;
  framework_id: string;
  levels: {
    id: string;
    seniority_level: string;
    description: string;
    examples: Json | null;
  }[];
}

interface JobRoleCompetency {
  competency_id: string;
  name: string;
  description: string | null;
  expected_level: string;
  is_required: boolean;
  weight: number;
}

interface JobRole {
  role_id: string;
  role_title: string;
  role_level: string | null;
  role_department: string | null;
  role_description: string | null;
  competency_count: number;
  competencies: JobRoleCompetency[];
}

const CompetencyFramework = () => {
  const { workspaceId } = useHRAdmin();
  const queryClient = useQueryClient();
  const [editingComp, setEditingComp] = useState<Competency | null>(null);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'roles' | 'library'>('roles');
  const [createJobRoleDialogOpen, setCreateJobRoleDialogOpen] = useState(false);
  const [deletingRoleId, setDeletingRoleId] = useState<string | null>(null);
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [adjustingCompetency, setAdjustingCompetency] = useState<{
    id: string; name: string; description: string | null; roleTitle: string; roleLevel: string;
  } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['competency-framework', workspaceId],
    queryFn: async () => {
      const { data: framework, error: fErr } = await supabase
        .from('competency_frameworks')
        .select('id')
        .eq('workspace_id', workspaceId)
        .single();
      if (fErr) throw fErr;

      const { data: comps, error: cErr } = await supabase
        .from('competencies')
        .select('id, name, description, order, is_active, framework_id')
        .eq('framework_id', framework.id)
        .order('order');
      if (cErr) throw cErr;

      const { data: levels, error: lErr } = await supabase
        .from('competency_level_descriptions')
        .select('id, competency_id, seniority_level, description, examples')
        .in('competency_id', comps.map(c => c.id));
      if (lErr) throw lErr;

      const competencies: Competency[] = comps.map(c => ({
        ...c,
        levels: levels.filter(l => l.competency_id === c.id),
      }));

      return { frameworkId: framework.id, competencies };
    },
  });

  const { data: jobRoles = [], isLoading: jobRolesLoading } = useQuery({
    queryKey: ['job-roles', data?.frameworkId],
    queryFn: async () => {
      const { data: roles, error } = await supabase
        .rpc('get_job_roles_with_competencies', { _framework_id: data!.frameworkId });
      if (error) throw error;
      return (roles || []) as unknown as JobRole[];
    },
    enabled: !!data?.frameworkId,
  });

  // Library view: competencies with usage counts
  const { data: libraryCompetencies = [] } = useQuery({
    queryKey: ['competencies-library', data?.frameworkId],
    queryFn: async () => {
      const { data: comps, error } = await supabase
        .from('competencies')
        .select('id, name, description, order, is_active, role_competencies(count), competency_level_descriptions(count)')
        .eq('framework_id', data!.frameworkId)
        .order('name');
      if (error) throw error;
      return (comps || []).map((c: any) => ({
        ...c,
        usage_count: c.role_competencies?.[0]?.count || 0,
        level_descriptions_count: c.competency_level_descriptions?.[0]?.count || 0,
      })).filter((c: any) => c.usage_count > 0);
    },
    enabled: viewMode === 'library' && !!data?.frameworkId,
  });

  const deleteRoleMutation = useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await supabase.from('job_roles').delete().eq('id', roleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-roles'] });
      toast({ title: 'Cargo removido' });
      setDeletingRoleId(null);
    },
  });

  const handleSave = async (formData: CompetencyFormData) => {
    if (!editingComp) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('competencies')
        .update({ name: formData.name, description: formData.description || null })
        .eq('id', editingComp.id);
      if (error) throw error;

      for (const level of formData.levels) {
        const existing = editingComp.levels.find(l => l.seniority_level === level.seniority_level);
        const examples = level.examples.filter(Boolean);
        if (existing) {
          const { error: lErr } = await supabase
            .from('competency_level_descriptions')
            .update({ description: level.description, examples: examples.length ? examples : null })
            .eq('id', existing.id);
          if (lErr) throw lErr;
        } else {
          const { error: lErr } = await supabase
            .from('competency_level_descriptions')
            .insert({
              competency_id: editingComp.id,
              seniority_level: level.seniority_level,
              description: level.description,
              examples: examples.length ? examples : null,
            });
          if (lErr) throw lErr;
        }
      }

      queryClient.invalidateQueries({ queryKey: ['competency-framework'] });
      queryClient.invalidateQueries({ queryKey: ['competencies-library'] });
      toast({ title: 'Competência atualizada' });
      setEditingComp(null);
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const getEditData = (comp: Competency): CompetencyFormData => ({
    name: comp.name,
    description: comp.description || '',
    levels: ['junior', 'pleno', 'senior', 'especialista'].map(level => {
      const existing = comp.levels.find(l => l.seniority_level === level);
      return {
        seniority_level: level,
        description: existing?.description || '',
        examples: Array.isArray(existing?.examples) ? (existing.examples as string[]) : [],
      };
    }),
  });

  const levelColorMap: Record<string, string> = {
    'Júnior': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
    'Pleno': 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300',
    'Sênior': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    'Especialista': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    'Staff': 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
    'Principal': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Framework de Competências</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Defina cargos e suas competências esperadas
          </p>
        </div>
        <Button onClick={() => setCreateJobRoleDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Adicionar Cargo
        </Button>
      </div>

      {/* Discrete toggle */}
      <div className="flex justify-end">
        <div className="flex gap-1 bg-muted/50 p-1 rounded-lg">
          <Button
            variant={viewMode === 'roles' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('roles')}
            className="text-xs h-7 gap-1.5 rounded-md"
          >
            <Briefcase className="h-3.5 w-3.5" /> Meus Cargos
          </Button>
          <Button
            variant={viewMode === 'library' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('library')}
            className="text-xs h-7 gap-1.5 rounded-md"
          >
            <BookOpen className="h-3.5 w-3.5" /> Biblioteca
          </Button>
        </div>
      </div>

      {/* Roles View */}
      {viewMode === 'roles' && (
        <div className="space-y-4">
          {(isLoading || jobRolesLoading) ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)}
            </div>
          ) : jobRoles.length === 0 ? (
            <Card className="rounded-2xl">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="rounded-full bg-muted/50 p-5 mb-4">
                  <Briefcase className="h-10 w-10 text-muted-foreground" />
                </div>
                <p className="font-semibold text-foreground mb-1">Nenhum cargo definido ainda</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Crie seu primeiro cargo e associe competências
                </p>
                <Button onClick={() => setCreateJobRoleDialogOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" /> Adicionar Cargo
                </Button>
              </CardContent>
            </Card>
          ) : (
            jobRoles.map(role => (
              <Card key={role.role_id} className="rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 transition-transform duration-200">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold text-foreground">{role.role_title}</span>
                        {role.role_level && (
                          <Badge className={`text-xs font-medium border-0 ${levelColorMap[role.role_level] || 'bg-muted text-muted-foreground'}`}>
                            {role.role_level}
                          </Badge>
                        )}
                      </div>
                      {role.role_department && (
                        <p className="text-xs text-muted-foreground">{role.role_department}</p>
                      )}
                      {role.role_description && (
                        <p className="text-sm text-muted-foreground">{role.role_description}</p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8"
                        onClick={() => setDeletingRoleId(role.role_id)}>
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>

                  {role.competency_count > 0 && (
                    <>
                      <p className="text-xs font-medium text-muted-foreground mb-2">
                        {role.competency_count} competência(s)
                      </p>
                      <div className="space-y-1.5">
                        {role.competencies.map((comp, idx) => (
                          <div key={idx} className="flex items-center justify-between py-1.5 px-3 bg-muted/30 rounded-lg">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground">{comp.name}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Button
                                variant="ghost" size="sm"
                                className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-primary"
                                onClick={() => {
                                  setAdjustingCompetency({
                                    id: comp.competency_id, name: comp.name,
                                    description: comp.description ?? null,
                                    roleTitle: role.role_title, roleLevel: role.role_level || '',
                                  });
                                  setAdjustDialogOpen(true);
                                }}
                              >
                                <Sparkles className="h-3 w-3" /> Ajustar
                              </Button>
                              <Badge variant="outline" className="text-xs">{comp.expected_level}</Badge>
                              {comp.is_required && (
                                <Badge className="text-xs bg-primary/10 text-primary border-0">Obrigatória</Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Library View */}
      {viewMode === 'library' && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Sua biblioteca de competências. Competências são criadas ao definir cargos e podem ser reutilizadas.
          </p>
          {libraryCompetencies.length === 0 ? (
            <Card className="rounded-2xl">
              <CardContent className="py-12 text-center">
                <p className="text-sm text-muted-foreground">
                  Nenhuma competência em uso ainda. Crie cargos para popular sua biblioteca.
                </p>
              </CardContent>
            </Card>
          ) : (
            libraryCompetencies.map((comp: any) => {
              const fullComp = data?.competencies.find(c => c.id === comp.id);
              return (
                <Card key={comp.id} className="rounded-2xl">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground">{comp.name}</p>
                        {comp.description && (
                          <p className="text-sm text-muted-foreground mt-0.5">{comp.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            Usada em {comp.usage_count} cargo(s)
                          </Badge>
                          {comp.level_descriptions_count > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {comp.level_descriptions_count} níveis definidos
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {fullComp && (
                          <Button variant="ghost" size="icon" className="h-8 w-8"
                            onClick={() => setEditingComp(fullComp)}>
                            <Pencil className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      <EditCompetencyModal
        open={!!editingComp}
        onClose={() => setEditingComp(null)}
        onSave={handleSave}
        initialData={editingComp ? getEditData(editingComp) : null}
        saving={saving}
      />

      <CreateJobRoleDialog
        open={createJobRoleDialogOpen}
        onOpenChange={setCreateJobRoleDialogOpen}
        frameworkId={data?.frameworkId ?? ''}
        workspaceId={workspaceId}
      />

      <AdjustCompetencyDialog
        open={adjustDialogOpen}
        onOpenChange={setAdjustDialogOpen}
        competency={adjustingCompetency}
        jobTitle={adjustingCompetency?.roleTitle || ''}
        level={adjustingCompetency?.roleLevel || ''}
        onAdjusted={async (adjusted) => {
          if (!adjustingCompetency) return;
          const { error } = await supabase
            .from('competencies')
            .update({ description: adjusted.description, name: adjusted.name })
            .eq('id', adjustingCompetency.id);
          if (error) {
            toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
          } else {
            queryClient.invalidateQueries({ queryKey: ['competency-framework'] });
            queryClient.invalidateQueries({ queryKey: ['job-roles'] });
            toast({ title: 'Competência atualizada!' });
          }
        }}
      />

      <AlertDialog open={!!deletingRoleId} onOpenChange={() => setDeletingRoleId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover cargo?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso removerá o cargo e todas as competências associadas a ele. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingRoleId && deleteRoleMutation.mutate(deletingRoleId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CompetencyFramework;
