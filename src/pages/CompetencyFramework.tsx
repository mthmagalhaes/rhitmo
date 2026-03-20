import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHRAdmin } from '@/components/HRAdminGuard';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { Plus } from 'lucide-react';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CompetencyCard } from '@/components/competency/CompetencyCard';
import { EditCompetencyModal, type CompetencyFormData } from '@/components/competency/EditCompetencyModal';
import { CompetencyPreviewTable } from '@/components/competency/CompetencyPreviewTable';
import { AICompetencyDialog } from '@/components/competency/AICompetencyDialog';
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

const CompetencyFramework = () => {
  const { workspaceId, workspaceName } = useHRAdmin();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editingComp, setEditingComp] = useState<Competency | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

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

  const reorderMutation = useMutation({
    mutationFn: async (items: { id: string; order: number }[]) => {
      for (const item of items) {
        const { error } = await supabase
          .from('competencies')
          .update({ order: item.order })
          .eq('id', item.id);
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['competency-framework'] }),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('competencies')
        .update({ is_active: !isActive })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competency-framework'] });
      toast({ title: 'Competência atualizada com sucesso' });
    },
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !data) return;

    const oldIndex = data.competencies.findIndex(c => c.id === active.id);
    const newIndex = data.competencies.findIndex(c => c.id === over.id);
    const reordered = arrayMove(data.competencies, oldIndex, newIndex);

    const updates = reordered.map((c, i) => ({ id: c.id, order: i + 1 }));
    reorderMutation.mutate(updates);
  };

  const handleSave = async (formData: CompetencyFormData) => {
    setSaving(true);
    try {
      if (editingComp) {
        // Update existing
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
      } else {
        // Create new
        const maxOrder = data?.competencies.length
          ? Math.max(...data.competencies.map(c => c.order))
          : 0;

        const { data: newComp, error } = await supabase
          .from('competencies')
          .insert({
            framework_id: data!.frameworkId,
            name: formData.name,
            description: formData.description || null,
            order: maxOrder + 1,
          })
          .select('id')
          .single();
        if (error) throw error;

        const levelInserts = formData.levels.map(level => {
          const examples = level.examples.filter(Boolean);
          return {
            competency_id: newComp.id,
            seniority_level: level.seniority_level,
            description: level.description,
            examples: examples.length ? examples : null,
          };
        });

        const { error: lErr } = await supabase
          .from('competency_level_descriptions')
          .insert(levelInserts);
        if (lErr) throw lErr;
      }

      queryClient.invalidateQueries({ queryKey: ['competency-framework'] });
      toast({ title: editingComp ? 'Competência atualizada' : 'Competência criada com sucesso' });
      setEditingComp(null);
      setShowCreateModal(false);
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

  const previewData = (data?.competencies || [])
    .filter(c => c.is_active)
    .map(c => ({
      name: c.name,
      levels: c.levels.map(l => ({
        seniority_level: l.seniority_level,
        description: l.description,
        examples: Array.isArray(l.examples) ? (l.examples as string[]) : null,
      })),
    }));

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Framework de Competências</h1>
        <Button onClick={() => setShowCreateModal(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Adicionar Competência
        </Button>
      </div>
        <p className="text-sm text-muted-foreground">
          Defina as competências comportamentais usadas para avaliar liderados em toda a empresa.
        </p>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-3xl" />)}
          </div>
        ) : !data?.competencies.length ? (
          <div className="text-center py-16 text-muted-foreground">
            Nenhuma competência encontrada. Clique em "Adicionar Competência" para começar.
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={data.competencies.map(c => c.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-4">
                {data.competencies.map(comp => (
                  <CompetencyCard
                    key={comp.id}
                    id={comp.id}
                    name={comp.name}
                    description={comp.description}
                    isActive={comp.is_active}
                    levelCount={comp.levels.length}
                    onEdit={() => setEditingComp(comp)}
                    onToggleActive={() => toggleActiveMutation.mutate({ id: comp.id, isActive: comp.is_active })}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        <CompetencyPreviewTable competencies={previewData} />
      

      <EditCompetencyModal
        open={showCreateModal || !!editingComp}
        onClose={() => { setShowCreateModal(false); setEditingComp(null); }}
        onSave={handleSave}
        initialData={editingComp ? getEditData(editingComp) : null}
        saving={saving}
      />
    </div>
  );
};

export default CompetencyFramework;
