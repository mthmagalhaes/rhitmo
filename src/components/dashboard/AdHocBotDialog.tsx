// Resgate manual: chamar o bot em uma reunião que não apareceu na sincronização
// da agenda (evento de time, convite externo, sala criada na hora).
import { useState } from 'react';
import { Mic, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLeaderMembers } from '@/hooks/useLeaderMembers';

interface AdHocBotDialogProps {
  onSubmit: (params: { meeting_url: string; member_id: string | null }) => void;
  isPending?: boolean;
  disabled?: boolean;
  disabledReason?: string;
}

const isValidMeetingUrl = (url: string) =>
  /^https?:\/\/(meet\.google\.com|[\w.-]*zoom\.us|teams\.(microsoft|live)\.com)\//i.test(url.trim());

export const AdHocBotDialog = ({ onSubmit, isPending, disabled, disabledReason }: AdHocBotDialogProps) => {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [memberId, setMemberId] = useState<string>('none');
  const { members = [] } = useLeaderMembers();

  const valid = isValidMeetingUrl(url);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          title={disabled ? disabledReason : 'Colar um link de reunião e enviar o bot agora'}
          className="text-xs font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-1 disabled:opacity-50"
        >
          <Mic className="h-3 w-3" />
          Chamar bot em outra reunião
        </button>
      </DialogTrigger>
      <DialogContent className="rounded-3xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Chamar bot em outra reunião</DialogTitle>
          <DialogDescription>
            Cole o link da reunião que já está acontecendo. O bot entra imediatamente e grava a partir
            deste momento.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="adhoc-url">Link da reunião</Label>
            <Input
              id="adhoc-url"
              placeholder="https://meet.google.com/abc-defg-hij"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="rounded-xl"
            />
            {url && !valid && (
              <p className="text-xs text-destructive">
                Use um link do Google Meet, Zoom ou Microsoft Teams.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="adhoc-member">Liderado (opcional)</Label>
            <Select value={memberId} onValueChange={setMemberId}>
              <SelectTrigger id="adhoc-member" className="rounded-xl">
                <SelectValue placeholder="Definir depois" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="none">Definir depois</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              A anotação vai para Anotações &amp; Evidências deste liderado. Se ficar em branco, você
              atribui depois.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" className="rounded-xl" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            className="rounded-xl gap-2"
            disabled={!valid || isPending || disabled}
            onClick={() => {
              onSubmit({ meeting_url: url.trim(), member_id: memberId === 'none' ? null : memberId });
              setOpen(false);
              setUrl('');
            }}
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
            Enviar bot agora
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
