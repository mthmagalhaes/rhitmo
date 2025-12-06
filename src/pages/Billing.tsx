import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Check, X, Rocket, Gem, BarChart3, Brain, Shield, Sparkles, Users, FileText, Music, Crown } from 'lucide-react';

const Billing = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { limits } = usePlanLimits();
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>('');

  useEffect(() => {
    if (!user && !loading) {
      navigate('/auth', { replace: true });
    }
  }, [user, loading, navigate]);

  const handleUpgrade = (planName: string) => {
    setSelectedPlan(planName);
    setUpgradeDialogOpen(true);
  };

  const handleJoinWaitlist = () => {
    setUpgradeDialogOpen(false);
    toast({
      title: "🎉 Você está na lista!",
      description: `Entraremos em contato em breve com seu acesso ao plano ${selectedPlan}.`
    });
  };

  if (!user) return null;

  const currentPlan = limits.planTier;

  const plans = [
    {
      id: 'pulse',
      name: 'Pulse',
      price: 0,
      description: 'Para líderes começando a estruturar feedbacks',
      popular: false,
      features: [
        { icon: Users, text: 'Até 3 Liderados', included: true },
        { icon: FileText, text: '2 Avaliações IA por mês', included: true },
        { icon: Gem, text: 'Diário de Bordo + Insights', included: true },
        { icon: Music, text: 'Rhitmo Sync', included: false },
        { icon: BarChart3, text: 'Analytics & Tendências', included: false },
        { icon: Brain, text: 'Mentor IA Avançado', included: false },
      ]
    },
    {
      id: 'flow',
      name: 'Flow',
      price: 79,
      description: 'Para líderes que querem escalar com inteligência',
      popular: true,
      features: [
        { icon: Users, text: 'Até 10 Liderados', included: true },
        { icon: FileText, text: 'Avaliações IA Ilimitadas', included: true },
        { icon: Gem, text: 'Diário de Bordo + Insights', included: true },
        { icon: Music, text: 'Rhitmo Sync (Perfil Comportamental)', included: true },
        { icon: BarChart3, text: 'Analytics & Tendências', included: false },
        { icon: Brain, text: 'Mentor IA Avançado', included: false },
      ]
    },
    {
      id: 'maestro',
      name: 'Maestro',
      price: 149,
      description: 'Para líderes executivos com visão estratégica',
      popular: false,
      features: [
        { icon: Users, text: 'Liderados Ilimitados', included: true },
        { icon: FileText, text: 'Avaliações IA Ilimitadas', included: true },
        { icon: Gem, text: 'Diário de Bordo + Insights', included: true },
        { icon: Music, text: 'Rhitmo Sync (Perfil Comportamental)', included: true },
        { icon: BarChart3, text: 'Analytics & Tendências Completo', included: true },
        { icon: Brain, text: 'Mentor IA Avançado (GPT-4o)', included: true },
      ]
    }
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-3">Escolha seu plano</h1>
        <p className="text-lg text-muted-foreground">Comece grátis, faça upgrade quando precisar</p>
      </div>

      {/* Pricing Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {plans.map((plan) => {
          const isCurrentPlan = currentPlan === plan.id;
          const isPopular = plan.popular;
          
          return (
            <Card 
              key={plan.id}
              className={`relative ${
                isPopular 
                  ? 'border-2 border-primary shadow-lg shadow-primary/20' 
                  : 'border border-border'
              }`}
            >
              {/* Badge Popular */}
              {isPopular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                  ⭐ Mais Popular
                </Badge>
              )}
              
              {/* Badge Maestro */}
              {plan.id === 'maestro' && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge variant="secondary" className="bg-amber-500 text-white hover:bg-amber-600">
                    <Crown className="h-3 w-3 mr-1" />
                    Executivo
                  </Badge>
                </div>
              )}
              
              <CardHeader className={isPopular || plan.id === 'maestro' ? 'pt-8' : ''}>
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">
                    R$ {plan.price}
                  </span>
                  <span className="text-lg font-normal text-muted-foreground">/mês</span>
                </div>
                <p className="text-sm text-muted-foreground">{plan.description}</p>
              </CardHeader>
              
              <CardContent>
                {isCurrentPlan ? (
                  <Button variant="outline" className="w-full mb-6" disabled>
                    Seu Plano Atual
                  </Button>
                ) : (
                  <Button 
                    className={`w-full mb-6 ${isPopular ? '' : 'variant-outline'}`}
                    variant={isPopular ? 'default' : 'outline'}
                    onClick={() => handleUpgrade(plan.name)}
                  >
                    {plan.price === 0 ? 'Começar Grátis' : 'Fazer Upgrade'}
                  </Button>
                )}
                
                <ul className="space-y-3">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      {feature.included ? (
                        <feature.icon className={`h-5 w-5 ${isPopular ? 'text-primary' : 'text-emerald-500'}`} />
                      ) : (
                        <X className="h-5 w-5 text-muted-foreground/50" />
                      )}
                      <span className={feature.included ? '' : 'text-muted-foreground/50'}>
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
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
              Estamos liberando o plano <strong>{selectedPlan}</strong> em ondas. Entre na lista VIP para 
              garantir o preço vitalício especial.
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
