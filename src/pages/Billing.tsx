import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Check, X, AlertCircle, Rocket, Gem, BarChart3, Brain, Shield, Sparkles } from 'lucide-react';

const Billing = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);

  useEffect(() => {
    if (!user && !loading) {
      navigate('/auth', { replace: true });
    }
  }, [user, loading, navigate]);

  const handleJoinWaitlist = () => {
    setUpgradeDialogOpen(false);
    toast({
      title: "🎉 Você está na lista!",
      description: "Entraremos em contato em breve com seu acesso exclusivo.",
    });
  };

  if (!user) return null;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-3">Escolha seu plano</h1>
        <p className="text-lg text-muted-foreground">Comece grátis, faça upgrade quando precisar</p>
      </div>

      {/* Pricing Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {/* Starter Card */}
        <Card className="border border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl">Starter</CardTitle>
            <div className="text-4xl font-bold">
              R$ 0 <span className="text-lg font-normal text-muted-foreground">/mês</span>
            </div>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full mb-6" disabled>
              Seu Plano Atual
            </Button>
            <ul className="space-y-3">
              <li className="flex items-center gap-2">
                <Check className="h-5 w-5 text-emerald-500" />
                <span>Até 5 Liderados</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-5 w-5 text-emerald-500" />
                <span>Diário de Bordo (Notas Ilimitadas)</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-5 w-5 text-emerald-500" />
                <span>Rhitmo Sync Básico</span>
              </li>
              <li className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-500" />
                <span className="text-muted-foreground">1 Avaliação PDF por mês</span>
              </li>
              <li className="flex items-center gap-2">
                <X className="h-5 w-5 text-slate-400" />
                <span className="text-muted-foreground line-through">Analytics Dashboard</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Rhitmo Pro Card */}
        <Card className="border-2 border-primary bg-card shadow-lg shadow-primary/20 relative">
          {/* Badge Recomendado */}
          <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
            ⭐ Recomendado
          </Badge>
          
          <CardHeader className="pt-8">
            <CardTitle className="text-xl">Rhitmo Pro</CardTitle>
            <div className="flex items-baseline gap-2">
              <span className="text-lg text-muted-foreground line-through">R$ 97</span>
              <span className="text-4xl font-bold text-primary">R$ 49,90</span>
              <span className="text-lg font-normal text-muted-foreground">/mês</span>
            </div>
            <p className="text-sm text-emerald-600 font-medium">💎 Preço de Fundador (Vitalício)</p>
          </CardHeader>
          
          <CardContent>
            <Button className="w-full mb-6" onClick={() => setUpgradeDialogOpen(true)}>
              Fazer Upgrade
            </Button>
            <ul className="space-y-3">
              <li className="flex items-center gap-2">
                <Rocket className="h-5 w-5 text-primary" />
                <span className="font-medium">Liderados Ilimitados</span>
              </li>
              <li className="flex items-center gap-2">
                <Gem className="h-5 w-5 text-primary" />
                <span className="font-medium">Avaliações de Performance Ilimitadas</span>
              </li>
              <li className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                <span className="font-medium">Analytics Dashboard Completo</span>
              </li>
              <li className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                <span className="font-medium">Mentor Chat Avançado (GPT-4o)</span>
              </li>
              <li className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <span className="font-medium">Suporte Prioritário</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Upgrade Dialog */}
      <Dialog open={upgradeDialogOpen} onOpenChange={setUpgradeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Seja um Membro Fundador
            </DialogTitle>
            <DialogDescription>
              Estamos liberando o plano Pro em ondas. Entre na lista VIP para 
              garantir o preço vitalício de <strong>R$ 49,90/mês</strong>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={handleJoinWaitlist} className="w-full">
              Entrar na Lista VIP
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Billing;
