import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Rocket, Mail } from 'lucide-react';

const Billing = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user && !loading) {
      navigate('/auth', { replace: true });
    }
  }, [user, loading, navigate]);

  if (!user) return null;

  return (
    <div className="p-6 min-h-[70vh] flex items-center justify-center">
      <Card className="max-w-lg w-full relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-emerald-500/5 border-2 border-primary/20 shadow-xl">
        {/* Efeito de brilho sutil */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
        
        <CardHeader className="text-center relative z-10 pt-10">
          {/* Ícone grande */}
          <div className="mx-auto mb-4 p-4 rounded-full bg-primary/10 w-fit">
            <Rocket className="h-12 w-12 text-primary" />
          </div>
          
          {/* Badge Beta */}
          <Badge className="mx-auto mb-4 bg-emerald-500 text-white hover:bg-emerald-600">
            Beta Tester
          </Badge>
          
          <CardTitle className="text-2xl md:text-3xl font-bold">
            Acesso Antecipado Ativo 🚀
          </CardTitle>
        </CardHeader>
        
        <CardContent className="text-center relative z-10 pb-10">
          <p className="text-muted-foreground text-lg leading-relaxed mb-8">
            Você é uma das primeiras pessoas a usar Rhitmo! 
            <br /><br />
            Durante o período <strong>Beta</strong>, liberamos acesso total a 
            <span className="text-primary font-semibold"> todas as funcionalidades</span> para 
            você testar sem limites.
            <br /><br />
            Estamos calibrando nossos planos para o lançamento oficial.
          </p>
          
          <Button 
            size="lg"
            asChild
          >
            <a href="mailto:support@rhitmo.co?subject=Feedback%20Beta%20Rhitmo">
              <Mail className="h-5 w-5 mr-2" />
              Entrar em contato
            </a>
          </Button>
          
          <p className="text-xs text-muted-foreground mt-6">
            Dúvidas ou sugestões? Fale conosco!
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Billing;
