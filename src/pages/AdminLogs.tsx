import { AdminGuard } from '@/components/admin/AdminGuard';
import { AdminObservability } from '@/components/admin/AdminObservability';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AdminLogsPage() {
  return (
    <AdminGuard>
      <div className="min-h-screen bg-background">
        <div className="border-b border-border px-6 py-3 flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild className="rounded-xl gap-2">
            <Link to="/admin">
              <ArrowLeft className="h-4 w-4" /> Admin
            </Link>
          </Button>
          <h1 className="text-sm font-semibold">Logs de Edge Functions</h1>
        </div>
        <AdminObservability />
      </div>
    </AdminGuard>
  );
}
