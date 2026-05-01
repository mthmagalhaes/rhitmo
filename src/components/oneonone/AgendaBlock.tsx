// Sprint 12 — Inline note block reused by SharedAgendaBlock and PrivateNoteBlock.
// Persists into `feedbacks` mirroring NewNoteDialog's minimal happy path:
//   - title auto-derived
//   - tags + visibility per variant
//   - workspace_id required for tenant isolation
import { useState, useImperativeHandle, forwardRef } from 'react';
import { Eye, Loader2, Lock } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

export type NoteVariant = 'shared' | 'private';

export interface AgendaBlockRef {
  appendLine: (text: string) => void;
}

interface AgendaBlockProps {
  variant: NoteVariant;
  memberId: string;
  workspaceId: string | null;
  placeholder?: string;
}

const VARIANT_CONFIG: Record<NoteVariant, {
  label: string;
  helper: string;
  icon: typeof Eye;
  badgeClass: string;
  cardClass: string;
  visibility: 'shared' | 'private_leader';
  tag: string;
  defaultTitle: string;
  ctaLabel: string;
}> = {
  shared: {
    label: 'Pauta compartilhada',
    helper: 'Visível para o liderado',
    icon: Eye,
    badgeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
    cardClass: 'border-emerald-500/20 bg-emerald-50/40 dark:bg-emerald-950/10',
    visibility: 'shared',
    tag: 'pauta-1on1',
    defaultTitle: 'Pauta 1:1',
    ctaLabel: 'Salvar na pauta',
  },
  private: {
    label: 'Anotação privada',
    helper: 'Só você vê',
    icon: Lock,
    badgeClass: 'bg-muted text-muted-foreground border-border',
    cardClass: 'border-border bg-card',
    visibility: 'private_leader',
    tag: 'anotacao-privada-1on1',
    defaultTitle: 'Anotação privada 1:1',
    ctaLabel: 'Salvar anotação',
  },
};

export const AgendaBlock = forwardRef<AgendaBlockRef, AgendaBlockProps>(
  ({ variant, memberId, workspaceId, placeholder }, ref) => {
    const cfg = VARIANT_CONFIG[variant];
    const Icon = cfg.icon;
    const { user } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [content, setContent] = useState('');
    const [saving, setSaving] = useState(false);

    useImperativeHandle(ref, () => ({
      appendLine(text: string) {
        setContent((prev) => {
          const trimmed = prev.trimEnd();
          if (!trimmed) return `- ${text}`;
          return `${trimmed}\n- ${text}`;
        });
      },
    }));

    async function handleSave() {
      if (!content.trim()) return;
      if (!user || !workspaceId) {
        toast({
          title: 'Workspace não encontrado',
          description: 'Recarregue a página e tente novamente.',
          variant: 'destructive',
        });
        return;
      }
      setSaving(true);
      try {
        const { error } = await supabase.from('feedbacks').insert([{
          manager_id: user.id,
          member_id: memberId,
          workspace_id: workspaceId,
          title: cfg.defaultTitle,
          content: content.trim(),
          tags: [cfg.tag],
          visibility: cfg.visibility,
          occurred_at: new Date().toISOString(),
        }]);
        if (error) throw error;
        toast({
          title: variant === 'shared' ? 'Pauta salva' : 'Anotação salva',
          description:
            variant === 'shared'
              ? 'O liderado já consegue ver na timeline dele.'
              : 'Apenas você verá esta anotação.',
        });
        setContent('');
        queryClient.invalidateQueries({ queryKey: ['feedbacks', memberId] });
        queryClient.invalidateQueries({ queryKey: ['team-timeline'] });
      } catch (e: any) {
        toast({
          title: 'Erro ao salvar',
          description: e.message ?? 'Tente novamente em instantes.',
          variant: 'destructive',
        });
      } finally {
        setSaving(false);
      }
    }

    return (
      <Card
        className={cn(
          'rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)] p-4',
          cfg.cardClass,
        )}
      >
        <header className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-foreground/70" />
            <h3 className="font-serif text-sm font-bold tracking-tight">
              {cfg.label}
            </h3>
          </div>
          <span
            className={cn(
              'inline-flex items-center text-[11px] px-2 py-0.5 rounded-full border font-medium',
              cfg.badgeClass,
            )}
          >
            {cfg.helper}
          </span>
        </header>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={
            placeholder ??
            (variant === 'shared'
              ? 'Tópicos que você quer alinhar com o liderado…'
              : 'Suas observações pessoais (não compartilhadas)…')
          }
          className="rounded-xl bg-background min-h-[120px] resize-y"
        />
        <div className="flex justify-end mt-3">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!content.trim() || saving}
            className="rounded-xl gap-2"
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {cfg.ctaLabel}
          </Button>
        </div>
      </Card>
    );
  },
);
AgendaBlock.displayName = 'AgendaBlock';
