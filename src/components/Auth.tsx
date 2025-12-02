import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { RhitmoLogo } from '@/components/RhitmoLogo';

export const Auth = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const { toast } = useToast();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw error;

        toast({
          title: "Conta criada!",
          description: "Verifique seu email para confirmar o cadastro.",
        });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        toast({
          title: "Login realizado!",
          description: "Bem-vindo ao Rhitmo.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* LADO ESQUERDO: Hero Image (50%) */}
      <div className="hidden lg:flex lg:w-1/2 relative">
        {/* Imagem de fundo */}
        <img 
          src="https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&auto=format&fit=crop"
          alt="Modern office workspace"
          className="w-full h-full object-cover"
        />
        {/* Overlay violeta suave */}
        <div className="absolute inset-0 bg-primary/30" />
        
        {/* Conteúdo do Hero */}
        <div className="absolute inset-0 flex flex-col justify-center items-center text-white p-12">
          <RhitmoLogo size="lg" className="text-white mb-8" />
          <h2 className="text-4xl font-bold text-center mb-4">
            Transforme sua gestão de pessoas
          </h2>
          <p className="text-xl text-center opacity-90 max-w-md">
            Performance contínua com empatia e dados
          </p>
        </div>
      </div>
      
      {/* LADO DIREITO: Formulário (50%) */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-background p-8">
        <div className="w-full max-w-md space-y-8">
          {/* Logo */}
          <div className="flex justify-center lg:justify-start">
            <RhitmoLogo size="md" className="text-primary" />
          </div>
          
          {/* Título */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">
              {isSignUp ? 'Criar Conta' : 'Bem-vindo de volta'}
            </h1>
            <p className="text-muted-foreground text-lg">
              {isSignUp 
                ? 'Comece sua jornada de liderança' 
                : 'Entre para continuar'}
            </p>
          </div>
          
          {/* Form */}
          <form onSubmit={handleAuth} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSignUp ? 'Criar Conta' : 'Entrar'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => setIsSignUp(!isSignUp)}
              disabled={loading}
            >
              {isSignUp ? 'Já tem conta? Faça login' : 'Não tem conta? Cadastre-se'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};
