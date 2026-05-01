// Sprint 12.2 — Checklist append-only de itens de ação para 1:1.
// Persistido em `feedbacks` como uma única row markdown (`- [ ] item`).
// Não edita registros antigos (mantém o padrão happy-path de AgendaBlock).
import { useState } from 'react';
import { ListChecks, Loader2, Plus, X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface ActionItemsBlockProps {
  memberId: string;
  workspaceId: string | null;
}

interface Item {
  id: string;
  text: string;
  done: boolean;
}

export function ActionItemsBlock({ memberId, workspaceId }: ActionItemsBlockProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [items, setItems] = useState<Item[]>([]);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  function addItem() {
    const text = draft.trim();
    if (!text) return;
    setItems((prev) => [...prev, { id: crypto.randomUUID(), text, done: false }]);
    setDraft('');
  }

  function toggle(id: string) {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, done: !it.done } : it)),
    );
  }

  function remove(id: string) {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }

  async function handleSave() {
    if (items.length === 0) return;
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
      const content = items
        .map((it) => `- [${it.done ? 'x' : ' '}] ${it.text}`)
        .join('\n');
      const { error } = await supabase.from('feedbacks').insert([{
        manager_id: user.id,
        member_id: memberId,
        title: 'Itens de ação 1:1',
        content,
        tags: ['action-items-1on1'],
        visibility: 'shared',
        type: 'manual',
        source: 'manual',
        occurred_at: new Date().toISOString(),
      }]);
      if (error) throw error;
      toast({
        title: 'Itens de ação salvos',
        description: 'O liderado já consegue ver na timeline dele.',
      });
      setItems([]);
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
    <Card className="rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)] p-4 bg-card border-border">
      <header className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-foreground/70" />
          <h3 className="font-serif text-sm font-bold tracking-tight">
            Itens de ação
          </h3>
        </div>
        <span className="inline-flex items-center text-[11px] px-2 py-0.5 rounded-full border font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20">
          Compartilhado
        </span>
      </header>

      {items.length > 0 && (
        <ul className="space-y-1.5 mb-3">
          {items.map((it) => (
            <li
              key={it.id}
              className="group flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-muted/60"
            >
              <Checkbox
                checked={it.done}
                onCheckedChange={() => toggle(it.id)}
                aria-label="Marcar como concluído"
              />
              <span
                className={`flex-1 text-sm ${
                  it.done ? 'line-through text-muted-foreground' : 'text-foreground'
                }`}
              >
                {it.text}
              </span>
              <button
                type="button"
                onClick={() => remove(it.id)}
                className="opacity-0 group-hover:opacity-100 h-6 w-6 rounded-md hover:bg-muted flex items-center justify-center transition-opacity"
                aria-label="Remover item"
              >
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addItem();
            }
          }}
          placeholder="Novo item de ação…"
          className="rounded-xl bg-background h-9 text-sm"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-xl gap-1 h-9"
          onClick={addItem}
          disabled={!draft.trim()}
        >
          <Plus className="h-3.5 w-3.5" />
          Adicionar
        </Button>
      </div>

      <div className="flex justify-end mt-3">
        <Button
          size="sm"
          onClick={handleSave}
          disabled={items.length === 0 || saving}
          className="rounded-xl gap-2"
        >
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Salvar itens de ação
        </Button>
      </div>
    </Card>
  );
}
