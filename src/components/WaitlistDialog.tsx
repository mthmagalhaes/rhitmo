import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface WaitlistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const WaitlistDialog = ({ open, onOpenChange }: WaitlistDialogProps) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [teamSize, setTeamSize] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: "E-mail obrigatório",
        description: "Por favor, insira seu e-mail.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('waitlist_leads')
        .insert({
          email,
          name: name || null,
          phone: phone || null,
          team_size: teamSize || null
        });

      if (error) {
        if (error.code === '23505') {
          toast({
            title: "E-mail já cadastrado",
            description: "Este e-mail já está na lista de espera.",
            variant: "destructive"
          });
        } else {
          throw error;
        }
        return;
      }

      toast({
        title: "Você está na fila!",
        description: "Avisaremos em breve quando sua conta estiver pronta."
      });
      
      // Reset form and close
      setName('');
      setEmail('');
      setPhone('');
      setTeamSize('');
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível completar o cadastro.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Entrar na Lista de Espera</DialogTitle>
          <DialogDescription>
            Seja um dos primeiros a usar o Rhitmo.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome completo</Label>
            <Input
              id="name"
              type="text"
              placeholder="Seu nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-mail corporativo *</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">WhatsApp / Telefone</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="(11) 99999-9999"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="team_size">Você possui quantos reports diretos?</Label>
            <Select value={teamSize} onValueChange={setTeamSize}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1-5">1-5 pessoas</SelectItem>
                <SelectItem value="6-10">6-10 pessoas</SelectItem>
                <SelectItem value="11-30">11-30 pessoas</SelectItem>
                <SelectItem value="30+">30+ pessoas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Garantir meu lugar
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
