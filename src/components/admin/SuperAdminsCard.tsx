import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ShieldCheck, Loader2 } from 'lucide-react';

interface UserMeta {
  user_id: string;
  email: string | null;
  full_name: string | null;
}

export const SuperAdminsCard = () => {
  const { data: roles, isLoading } = useQuery({
    queryKey: ['admin-super-admins'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'super_admin');
      if (error) throw error;
      return (data || []).map((r) => r.user_id);
    },
  });

  const { data: users } = useQuery({
    queryKey: ['admin-all-users'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_all_users_with_metadata');
      if (error) throw error;
      return (data || []) as UserMeta[];
    },
  });

  const rows = (roles || [])
    .map((id) => users?.find((u) => u.user_id === id))
    .filter(Boolean) as UserMeta[];

  return (
    <Card className="rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
      <CardHeader>
        <CardTitle className="text-base font-serif tracking-tight flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-amber-600" />
          Super Admins
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">Nenhum super admin configurado.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pessoa</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">Papel</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((u) => (
                <TableRow key={u.user_id}>
                  <TableCell className="font-medium">{u.full_name || '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
                      Super Admin
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
