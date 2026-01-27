import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import type { PlanTier } from '@/types/team';

const onboardingSchema = z.object({
  full_name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  phone: z.string().min(10, 'Telefone inválido'),
  job_title: z.string().min(2, 'Cargo deve ter pelo menos 2 caracteres'),
  team_size: z.string().min(1, 'Selecione o tamanho do time'),
});

type OnboardingFormValues = z.infer<typeof onboardingSchema>;

interface OnboardingModalProps {
  onComplete: () => void;
}

export function OnboardingModal({ onComplete }: OnboardingModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      full_name: '',
      phone: '',
      job_title: '',
      team_size: '',
    },
  });

  const onSubmit = async (values: OnboardingFormValues) => {
    setIsLoading(true);
    try {
      // 1. Update user metadata
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          full_name: values.full_name,
          phone: values.phone,
          job_title: values.job_title,
          team_size: values.team_size,
        },
      });

      if (updateError) throw updateError;

      // 2. Get updated user with assigned_plan from metadata
      const { data: { user }, error: getUserError } = await supabase.auth.getUser();
      if (getUserError) throw getUserError;
      if (!user) throw new Error('Usuário não encontrado');

      const assignedPlan = (user.user_metadata?.assigned_plan as PlanTier) || 'pulse';

      // 3. Check if workspace already exists - CORRIGIDO: usar order().limit(1) para evitar problemas
      const { data: existingWorkspace } = await supabase
        .from('workspaces')
        .select('id')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      // 4. Create workspace if doesn't exist
      if (!existingWorkspace) {
        const { data: newWorkspace, error: wsError } = await supabase
          .from('workspaces')
          .insert({
            owner_id: user.id,
            name: 'Meu Workspace',
            plan_tier: assignedPlan,
          })
          .select('id')
          .single();

        if (wsError) throw wsError;

        // 5. Create default "Sem Time" team
        const { error: teamError } = await supabase
          .from('teams')
          .insert({
            workspace_id: newWorkspace.id,
            name: 'Sem Time',
          });

        if (teamError) throw teamError;

        console.log('✅ Workspace created with plan:', assignedPlan);
      }

      toast({
        title: 'Perfil configurado!',
        description: 'Bem-vindo ao Rhitmo.',
      });

      onComplete();
    } catch (error: any) {
      console.error('Erro ao salvar perfil:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível salvar o perfil.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={true}>
      <DialogContent 
        className="sm:max-w-md [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="border-l-4 border-emerald-500 pl-4">
            <DialogTitle className="text-xl">
              Bem-vindo ao Rhitmo!
            </DialogTitle>
            <DialogDescription className="mt-1">
              Vamos configurar seu perfil para personalizar sua experiência.
            </DialogDescription>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Completo</FormLabel>
                  <FormControl>
                    <Input placeholder="Seu nome completo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>WhatsApp / Telefone</FormLabel>
                  <FormControl>
                    <Input 
                      type="tel" 
                      placeholder="(11) 99999-9999" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="job_title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cargo</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Gerente de Vendas" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="team_size"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantas pessoas você lidera?</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="1-5">1-5 pessoas</SelectItem>
                      <SelectItem value="6-10">6-10 pessoas</SelectItem>
                      <SelectItem value="11-30">11-30 pessoas</SelectItem>
                      <SelectItem value="30+">30+ pessoas</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Começar'
              )}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
