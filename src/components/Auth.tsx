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
  const {
    toast
  } = useToast();
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignUp) {
        const {
          error
        } = await supabase.auth.signUp({
          email,
          password
        });
        if (error) throw error;
        toast({
          title: "Conta criada!",
          description: "Verifique seu email para confirmar o cadastro."
        });
      } else {
        const {
          error
        } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (error) throw error;
        toast({
          title: "Login realizado!",
          description: "Bem-vindo ao Rhitmo."
        });
      }
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
  return <div className="flex min-h-screen">
      {/* LADO ESQUERDO: Hero Image (50%) */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Imagem de fundo */}
        <img src="https://images.unsplash.com/photo-1573497620053-ea5300f94f21?w=1200&auto=format&fit=crop&q=80" alt="Líder colaborando com sua equipe" className="w-full h-full object-cover object-center" />
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
            <p className="text-xl text-left text-white/80 max-w-md leading-relaxed">Com a Rhitmo, líderes ganham tempo, memória e organização de forma simples para focar no que realmente importa: desenvolver pessoas e construir uma cultura de resultados.</p>
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
              {isSignUp ? 'Criar Conta' : 'Bem-vindo de volta'}
            </h1>
            <p className="text-muted-foreground text-lg">
              {isSignUp ? 'Comece sua jornada de liderança' : 'Entre para continuar'}
            </p>
          </div>
          
          {/* Form */}
          <form onSubmit={handleAuth} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} required disabled={loading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required disabled={loading} minLength={6} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSignUp ? 'Criar Conta' : 'Entrar'}
            </Button>
            <Button type="button" variant="ghost" className="w-full" onClick={() => setIsSignUp(!isSignUp)} disabled={loading}>
              {isSignUp ? 'Já tem conta? Faça login' : 'Não tem conta? Cadastre-se'}
            </Button>
          </form>
        </div>
      </div>
    </div>;
};