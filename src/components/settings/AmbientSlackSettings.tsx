// Configuração do "Ambient Mode" do Slack — observação passiva de canais
// públicos para gerar rollups semanais consumidos pelo Mentor + brief.
// Editável por HR Admin OU Owner do workspace (líder solo é dono e pode mexer).
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Eye, ShieldCheck, Hash, Loader2, CalendarClock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSlackChannels, useSlackChannelMutations } from '@/hooks/useSlackChannels';
import { useAccount } from '@/contexts/AccountContext';

interface Props {
  variant?: 'card' | 'embedded';
}

export function AmbientSlackSettings({ variant = 'card' }: Props) {
  const { isHRAdmin, isWorkspaceOwner } = useAccount();
  const canEdit = Boolean(isHRAdmin || isWorkspaceOwner);
  const { data, isLoading } = useSlackChannels();
  const { updateAutojoin, updateAmbientEnabled, updateRollupFrequency } = useSlackChannelMutations();

  const settings = data?.settings;
  const busy =
    updateAutojoin.isPending ||
    updateAmbientEnabled.isPending ||
    updateRollupFrequency.isPending;


  const readOnlyBadge = !canEdit && (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 cursor-help">
            Somente leitura
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[240px] text-xs">
          Apenas o owner do workspace ou um HR Admin pode alterar o Ambient Mode.
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  const body = isLoading ? (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando preferências…
    </div>
  ) : (
    <>
      <div className="flex items-start justify-between gap-4 rounded-xl border border-border/40 p-3">
        <div className="flex-1 min-w-0">
          <Label htmlFor="ambient-enabled" className="text-sm font-medium">
            Capturar sinais de canais públicos
          </Label>
          <p className="text-xs text-muted-foreground mt-1">
            Quando ligado, geramos rollups semanais usados pelo Mentor e pelo brief de 1:1.
          </p>
        </div>
        <Switch
          id="ambient-enabled"
          checked={settings?.ambient_mode_enabled ?? false}
          disabled={!canEdit || busy}
          onCheckedChange={(v) => updateAmbientEnabled.mutate(v)}
        />
      </div>

      <div className="flex items-start justify-between gap-4 rounded-xl border border-border/40 p-3">
        <div className="flex-1 min-w-0">
          <Label htmlFor="autojoin" className="text-sm font-medium">
            Entrar automaticamente em novos canais públicos
          </Label>
          <p className="text-xs text-muted-foreground mt-1">
            Recomendado. Caso contrário, o bot só monitora canais onde foi convidado.
          </p>
        </div>
        <Switch
          id="autojoin"
          checked={settings?.autojoin_public_channels ?? false}
          disabled={!canEdit || busy}
          onCheckedChange={(v) => updateAutojoin.mutate(v)}
        />
      </div>

      <div className="flex items-center justify-between gap-3 pt-1 flex-wrap">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
          Rollups visíveis só para o líder direto. Sem texto bruto.
        </div>
        <Link to="/slack/channels">
          <Button variant="outline" size="sm" className="rounded-xl gap-2 text-xs">
            <Hash className="h-3.5 w-3.5" />
            Gerenciar canais
          </Button>
        </Link>
      </div>
    </>
  );

  if (variant === 'embedded') {
    return (
      <div className="border-t border-border/40 pt-4 mt-4 space-y-4">
        <div className="flex items-start gap-2">
          <div className="rounded-lg bg-primary/10 p-1.5 mt-0.5">
            <Eye className="w-3.5 h-3.5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium">Ambient Mode</span>
              {readOnlyBadge}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Resumo semanal por liderado a partir de canais públicos onde o bot está. Nunca DMs nem privados.
            </p>
          </div>
        </div>
        {body}
      </div>
    );
  }

  return (
    <Card className="rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
      <CardHeader className="flex flex-row items-start gap-3 space-y-0">
        <div className="rounded-xl bg-primary/10 p-2">
          <Eye className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <CardTitle className="text-base font-serif tracking-tight">Ambient Mode</CardTitle>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Slack</Badge>
            {readOnlyBadge}
          </div>
          <CardDescription className="text-xs mt-1">
            A Rhitmo observa canais públicos onde o bot está e gera um resumo semanal por liderado
            (temas, com quem mais conversou, canais ativos). Nunca DMs nem privados.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">{body}</CardContent>
    </Card>
  );
}
