import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { SlackPrivacyOnboarding } from '@/components/slack/SlackPrivacyOnboarding';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, RefreshCw, Compass, MessageSquare, Unlink, ExternalLink } from 'lucide-react';
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
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(false);
  const [batchSyncOpen, setBatchSyncOpen] = useState(false);
  const [leaderSyncOpen, setLeaderSyncOpen] = useState(false);
  // Slack linking is now handled via OAuth flow, no manual inputs needed

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

  const { data: slackIntegration, refetch: refetchSlack } = useQuery({
    queryKey: ['slack-integration', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('slack_integrations')
        .select('*')
        .eq('user_id', user.id)
        .limit(1)
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

  const SLACK_CLIENT_ID = '590136271282.10821512589809';
  const slackOAuthUrl = `https://slack.com/oauth/v2/authorize?client_id=${SLACK_CLIENT_ID}&scope=commands,chat:write&user_scope=&redirect_uri=${encodeURIComponent(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/slack-oauth-callback`)}`;

  const handleSlackUnlink = async () => {
    if (!slackIntegration) return;
    const { error } = await supabase
      .from('slack_integrations')
      .delete()
      .eq('id', slackIntegration.id);
    if (!error) {
      toast({ title: "Slack desconectado" });
      refetchSlack();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
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
          
          {/* Seção de Aparência */}
          <div className="border-t pt-4">
            <ThemeSelector />
          </div>

          {/* Seção Slack */}
          <div className="border-t pt-4">
            <Label className="text-muted-foreground text-xs uppercase tracking-wide mb-2 block">
              <MessageSquare className="h-3 w-3 inline mr-1" />
              Slack
            </Label>
            {slackIntegration ? (
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="text-sm">
                    Conectado como <span className="font-medium">{slackIntegration.slack_user_id}</span>
                  </span>
                </div>
                <Button variant="ghost" size="sm" onClick={handleSlackUnlink}>
                  <Unlink className="h-4 w-4 mr-1" />
                  Desconectar
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Vincule sua conta Slack para usar comandos como <code className="bg-muted px-1 py-0.5 rounded text-xs">/rhitmo</code>, <code className="bg-muted px-1 py-0.5 rounded text-xs">/nota</code> e <code className="bg-muted px-1 py-0.5 rounded text-xs">/kudos</code>.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  asChild
                >
                  <a href={slackOAuthUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Adicionar ao Slack
                  </a>
                </Button>
                <p className="text-xs text-muted-foreground">
                  Já tem o bot instalado? Execute <code className="bg-muted px-1 py-0.5 rounded text-xs">/rhitmo</code> no Slack e clique em "Conectar Conta".
                </p>
              </div>
            )}
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
