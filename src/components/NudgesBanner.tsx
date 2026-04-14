import { X, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface Nudge {
  id: string;
  message: string;
  action_url: string | null;
  severity: string;
  nudge_type: string;
  created_at: string;
}

const severityConfig: Record<string, { className: string; icon: string }> = {
  info: {
    className: 'border-l-4 border-l-primary/50 bg-primary/5',
    icon: '💡',
  },
  warning: {
    className: 'border-l-4 border-l-amber-500 bg-amber-500/5',
    icon: '⚠️',
  },
  urgent: {
    className: 'border-l-4 border-l-destructive bg-destructive/5',
    icon: '🚨',
  },
};

export function NudgesBanner() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: nudges = [] } = useQuery<Nudge[]>({
    queryKey: ['leader-nudges'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leader_nudges')
        .select('id, message, action_url, severity, nudge_type, created_at')
        .is('dismissed_at', null)
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) {
        console.error('Error fetching nudges:', error);
        return [];
      }

      const priority: Record<string, number> = { urgent: 0, warning: 1, info: 2 };
      return (data || []).sort(
        (a, b) => (priority[a.severity] ?? 3) - (priority[b.severity] ?? 3)
      );
    },
    refetchInterval: 60000,
  });

  const dismissMutation = useMutation({
    mutationFn: async (nudgeId: string) => {
      await supabase
        .from('leader_nudges')
        .update({ dismissed_at: new Date().toISOString() })
        .eq('id', nudgeId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leader-nudges'] });
    },
  });

  if (nudges.length === 0) return null;

  return (
    <div className="space-y-3 mb-6">
      {nudges.map((nudge) => {
        const config = severityConfig[nudge.severity] || severityConfig.info;

        return (
          <div
            key={nudge.id}
            className={`rounded-2xl p-4 flex items-center justify-between gap-4 ${config.className}`}
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <span className="text-lg shrink-0">{config.icon}</span>
              <p className="text-sm text-foreground line-clamp-2">{nudge.message}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {nudge.action_url && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-primary hover:text-primary/80 gap-1"
                  onClick={() => {
                    navigate(nudge.action_url!);
                    dismissMutation.mutate(nudge.id);
                  }}
                >
                  {t('nudges.view')}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={() => dismissMutation.mutate(nudge.id)}
              >
                <X className="h-3.5 w-3.5" />
                <span className="sr-only">{t('nudges.dismiss')}</span>
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
