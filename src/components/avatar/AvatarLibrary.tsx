import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

const AVATAR_SEEDS = [
  { style: 'avataaars', seed: 'Alex' },
  { style: 'avataaars', seed: 'Sam' },
  { style: 'avataaars', seed: 'Jordan' },
  { style: 'avataaars', seed: 'Taylor' },
  { style: 'avataaars', seed: 'Casey' },
  { style: 'avataaars', seed: 'Riley' },
  { style: 'avataaars', seed: 'Morgan' },
  { style: 'avataaars', seed: 'Quinn' },
  { style: 'avataaars', seed: 'Avery' },
  { style: 'avataaars', seed: 'Blake' },
  { style: 'avataaars', seed: 'Drew' },
  { style: 'avataaars', seed: 'Charlie' },
  { style: 'notionists', seed: 'Felix' },
  { style: 'notionists', seed: 'Luna' },
  { style: 'notionists', seed: 'Mia' },
  { style: 'notionists', seed: 'Oliver' },
  { style: 'notionists', seed: 'Zara' },
  { style: 'notionists', seed: 'Leo' },
  { style: 'notionists', seed: 'Iris' },
  { style: 'notionists', seed: 'Sage' },
  { style: 'notionists', seed: 'Kai' },
  { style: 'notionists', seed: 'Nora' },
  { style: 'notionists', seed: 'Theo' },
  { style: 'notionists', seed: 'Ava' },
];

const getAvatarUrl = (style: string, seed: string) =>
  `https://api.dicebear.com/7.x/${style}/svg?seed=${seed}`;

interface AvatarLibraryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberId: string;
  currentAvatar?: string | null;
}

export function AvatarLibrary({ open, onOpenChange, memberId, currentAvatar }: AvatarLibraryProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('team_members')
        .update({ avatar: selected })
        .eq('id', memberId);
      if (error) throw error;
      toast.success('Avatar atualizado! 🎉');
      queryClient.invalidateQueries({ queryKey: ['linked-member'] });
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      onOpenChange(false);
      setSelected(null);
    } catch (err) {
      console.error('Error updating avatar:', err);
      toast.error('Erro ao atualizar avatar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Escolha seu avatar</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 mt-4">
          {AVATAR_SEEDS.map(({ style, seed }) => {
            const url = getAvatarUrl(style, seed);
            const isSelected = selected === url;
            const isCurrent = currentAvatar === url;
            return (
              <button
                key={`${style}-${seed}`}
                onClick={() => setSelected(url)}
                className={cn(
                  "relative rounded-2xl p-2 border-2 transition-all hover:-translate-y-0.5 hover:shadow-md",
                  isSelected
                    ? "border-primary bg-primary/5 shadow-md"
                    : isCurrent
                      ? "border-primary/30 bg-primary/5"
                      : "border-border bg-card hover:border-primary/30"
                )}
              >
                <img src={url} alt={seed} className="w-full aspect-square rounded-xl" />
                {isCurrent && !isSelected && (
                  <span className="absolute -top-1 -right-1 text-[10px] bg-primary text-primary-foreground rounded-full px-1.5 py-0.5">Atual</span>
                )}
              </button>
            );
          })}
        </div>
        <div className="flex justify-end gap-3 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!selected || saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Salvar Avatar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
