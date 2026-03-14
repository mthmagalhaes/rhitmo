import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { Loader2, RefreshCw, Compass } from 'lucide-react';
import { ThemeSelector } from '@/components/ThemeSelector';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BatchSyncDialog } from '@/components/BatchSyncDialog';
import { LeaderSyncWizard } from '@/components/LeaderSyncWizard';

interface ProfileSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfileSettingsDialog({ open, onOpenChange }: ProfileSettingsDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(false);
  const [batchSyncOpen, setBatchSyncOpen] = useState(false);
  const [leaderSyncOpen, setLeaderSyncOpen] = useState(false);

  const { data: workspace } = useQuery({
    queryKey: ['workspace', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('workspaces')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user && open,
  });

  useEffect(() => {
    if (user) {
      setName(user.user_metadata?.full_name || user.user_metadata?.name || '');
      setRole(user.user_metadata?.role || '');
    }
  }, [user]);

  const handleSave = async () => {
    setLoading(true);
    const { error } = await supabase.auth.updateUser({
      data: { full_name: name, role }
    });
    
    if (!error) {
      toast({ 
        title: "Perfil atualizado!",
        description: "Suas informações foram salvas com sucesso."
      });
      onOpenChange(false);
    } else {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive"
      });
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Configurações do Perfil</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="role">Cargo</Label>
            <Input
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="Ex: Tech Lead, PM, etc."
            />
          </div>
          
          {/* Seção de Manutenção */}
          <div className="border-t pt-4">
            <Label className="text-muted-foreground text-xs uppercase tracking-wide mb-2 block">
              Manutenção
            </Label>
            {workspace && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setLeaderSyncOpen(true)}
                className="w-full justify-start gap-2 mb-2"
              >
                <Compass className="h-4 w-4" />
                {(workspace as Record<string, unknown>).leader_sync_data ? 'Atualizar Perfil de Liderança' : 'Configurar Perfil de Liderança'}
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => setBatchSyncOpen(true)}
              className="w-full justify-start gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Sincronizar Inteligência do Sistema
            </Button>
            <p className="text-xs text-muted-foreground mt-1">
              Processa notas antigas sem classificação por IA
            </p>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
      
      <BatchSyncDialog 
        open={batchSyncOpen} 
        onOpenChange={setBatchSyncOpen} 
      />
      {workspace && (
        <LeaderSyncWizard
          open={leaderSyncOpen}
          onOpenChange={setLeaderSyncOpen}
          workspaceId={workspace.id}
          existingData={(workspace as Record<string, unknown>).leader_sync_data as Record<string, unknown> | null}
        />
      )}
    </Dialog>
  );
}
