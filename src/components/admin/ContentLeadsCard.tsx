import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Magnet } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/** Leads vindos das páginas de conteúdo (modelo, gerador, guias). */
export function ContentLeadsCard() {
  const { data = [] } = useQuery({
    queryKey: ['admin', 'content-leads'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_content_leads');
      if (error) throw error;
      return data ?? [];
    },
  });
  if (data.length === 0) return null;
  return (
    <Card className="rounded-2xl border-0 shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base tracking-tight">
          <Magnet className="h-4 w-4 text-primary" /> Leads de conteúdo ({data.length})
        </CardTitle>
        <CardDescription>Pessoas que baixaram o modelo ou usaram o gerador no rhitmo.co.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {data.slice(0, 30).map((r) => (
          <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="min-w-0 truncate">
              <span className="font-medium">{r.name}</span> · {r.email}{r.company ? ` · ${r.company}` : ''}
            </span>
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary" className="rounded-md">{r.source}</Badge>
              {formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: ptBR })}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
