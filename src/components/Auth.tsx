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
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (error) throw error;
      toast({
        title: "Login realizado!",
        description: "Bem-vindo ao Rhitmo."
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      });
      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* LADO ESQUERDO: Hero Image (50%) */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Imagem de fundo */}
        <img 
          src="https://images.unsplash.com/photo-1573497620053-ea5300f94f21?w=1200&auto=format&fit=crop&q=80" 
          alt="Líder colaborando com sua equipe" 
          className="w-full h-full object-cover object-center" 
        />
        {/* Overlay duotone violeta pesado (efeito artístico) */}
        <div className="absolute inset-0 bg-[#7C3AED]/80 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-br from-[#7C3AED]/40 to-[#5B21B6]/60" />
        
        {/* Gradiente de legibilidade (escuro embaixo, transparente em cima) */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-purple-900/50 to-transparent" />
        
        {/* Logo no topo esquerdo */}
        <div className="absolute top-8 left-8">
          <RhitmoLogo size="lg" className="text-white" />
        </div>
        
        {/* Conteúdo do Hero - Editorial Tech */}
        <div className="absolute inset-0 flex flex-col justify-end items-start text-white p-16">
          {/* Bloco de texto com marcador editorial */}
          <div className="border-l-4 border-emerald-400 pl-6">
            <h2 className="text-4xl lg:text-5xl font-extrabold text-left mb-4 leading-tight max-w-xl">
              Nunca mais escreva uma avaliação de desempenho{' '}
              <span className="text-emerald-400">do zero.</span>
            </h2>
            <p className="text-xl text-left text-white/80 max-w-md leading-relaxed">
              Com o Rhitmo, líderes ganham tempo, memória e organização de forma simples para focar no que realmente importa: <span className="bg-emerald-400 text-white px-1.5 py-0.5 rounded box-decoration-clone"><span className="whitespace-nowrap">desenvolver pessoas</span> e construir uma cultura de resultados.</span>
            </p>
          </div>
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
              Acesso Restrito
            </h1>
            <p className="text-muted-foreground text-lg">
              Exclusivo para convidados
            </p>
          </div>
          
          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="seu@email.com" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
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
                onChange={e => setPassword(e.target.value)} 
                required 
                disabled={loading} 
                minLength={6} 
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Entrar
            </Button>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  ou continue com
                </span>
              </div>
            </div>
            
            <Button 
              type="button" 
              variant="outline" 
              className="w-full" 
              onClick={handleGoogleSignIn}
              disabled={loading}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Entrar com Google
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};
