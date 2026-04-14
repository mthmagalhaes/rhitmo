import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { AVATAR_VARIANTS } from './avatarData';
import { CustomAvatar } from './CustomAvatar';
import { useTranslation } from 'react-i18next';

interface LeaderAvatarLibraryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentAvatar?: string | null;
}

export function LeaderAvatarLibrary({ open, onOpenChange, currentAvatar }: LeaderAvatarLibraryProps) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { avatar: selected }
      });
      if (error) throw error;
      toast.success(t('settings.avatarUpdated', 'Avatar atualizado! 🎉'));
      queryClient.invalidateQueries({ queryKey: ['workspace'] });
      onOpenChange(false);
      setSelected(null);
    } catch (err) {
      console.error('Error updating avatar:', err);
      toast.error(t('common.error', 'Erro ao atualizar avatar.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('settings.chooseAvatar', 'Escolha seu avatar')}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 mt-4">
          {AVATAR_VARIANTS.map((variant) => {
            const isSelected = selected === variant.id;
            const isCurrent = currentAvatar === variant.id;
            return (
              <button
                key={variant.id}
                onClick={() => setSelected(variant.id)}
                className={cn(
                  "relative rounded-2xl p-2 border-2 transition-all hover:-translate-y-0.5 hover:shadow-md",
                  isSelected
                    ? "border-primary bg-primary/5 shadow-md"
                    : isCurrent
                      ? "border-primary/30 bg-primary/5"
                      : "border-border bg-card hover:border-primary/30"
                )}
              >
                <CustomAvatar variant={variant} size={60} className="w-full h-auto" />
                {isCurrent && !isSelected && (
                  <span className="absolute -top-1 -right-1 text-[10px] bg-primary text-primary-foreground rounded-full px-1.5 py-0.5">
                    {t('common.current', 'Atual')}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="flex justify-end gap-3 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={!selected || saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {t('common.save')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
