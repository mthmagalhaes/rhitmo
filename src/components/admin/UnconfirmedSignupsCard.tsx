import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MailWarning } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Row { user_id: string; email: string; created_at: string }

export function UnconfirmedSignupsCard() {
  const { data = [] } = useQuery({
    queryKey: ['admin', 'unconfirmed-signups'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_unconfirmed_signups' as never);
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });
  if (data.length === 0) return null;
  return (
    <Card className="rounded-2xl border-0 shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base tracking-tight">
          <MailWarning className="h-4 w-4 text-primary" />
          Cadastros sem e-mail confirmado ({data.length})
        </CardTitle>
        <CardDescription>Criaram conta há mais de 1 hora e ainda não clicaram no link. Vale um toque.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {data.slice(0, 20).map((r) => (
          <div key={r.user_id} className="flex items-center justify-between text-sm">
            <a href={`mailto:${r.email}`} className="font-medium hover:underline">{r.email}</a>
            <span className="text-muted-foreground text-xs">
              {formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: ptBR })}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
