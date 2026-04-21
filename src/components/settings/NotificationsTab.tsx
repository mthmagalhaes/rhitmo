import { useTranslation } from 'react-i18next';
import { Bell, Loader2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  useNotificationPreferences,
  type NotificationType,
  type NotificationChannel,
} from '@/hooks/useNotificationPreferences';
import { useUserRole } from '@/hooks/useUserRole';
import { useAccount } from '@/contexts/AccountContext';

interface NotificationRow {
  type: NotificationType;
  showFor: 'all' | 'leader' | 'member' | 'hr';
}

const ROWS: NotificationRow[] = [
  { type: 'weekly_summary', showFor: 'all' },
  { type: 'pdi_milestone', showFor: 'all' },
  { type: 'self_reflection', showFor: 'member' },
  { type: 'member_request_1on1', showFor: 'leader' },
  { type: 'ai_pattern', showFor: 'leader' },
  { type: 'hr_alerts', showFor: 'hr' },
];

export function NotificationsTab() {
  const { t } = useTranslation();
  const { get, set, isLoading, isSaving } = useNotificationPreferences();
  const { isLeader, isHRAdmin } = useUserRole();
  const { isLinkedMember } = useAccount();

  const visibleRows = ROWS.filter((r) => {
    if (r.showFor === 'all') return true;
    if (r.showFor === 'leader') return isLeader;
    if (r.showFor === 'hr') return isHRAdmin;
    if (r.showFor === 'member') return isLinkedMember;
    return false;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Bell className="h-4 w-4 text-primary" />
        <Label className="text-sm font-semibold">{t('settings.notifications.title')}</Label>
      </div>
      <p className="text-xs text-muted-foreground">{t('settings.notifications.description')}</p>

      <div className="space-y-3 pt-2">
        {visibleRows.map((row) => (
          <div key={row.type} className="flex items-center justify-between gap-3 py-2 border-b last:border-0">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">
                {t(`settings.notifications.types.${row.type}.label`)}
              </p>
              <p className="text-xs text-muted-foreground">
                {t(`settings.notifications.types.${row.type}.help`)}
              </p>
            </div>
            <Select
              value={get(row.type)}
              onValueChange={(v) => set(row.type, v as NotificationChannel)}
              disabled={isSaving}
            >
              <SelectTrigger className="w-32 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="off">{t('settings.notifications.channel.off')}</SelectItem>
                <SelectItem value="in_app">{t('settings.notifications.channel.in_app')}</SelectItem>
                <SelectItem value="email">{t('settings.notifications.channel.email')}</SelectItem>
                <SelectItem value="slack">{t('settings.notifications.channel.slack')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
    </div>
  );
}
