import { Sun, Moon, LogOut } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { MemberAvatar } from '@/components/MemberAvatar';
import { cn } from '@/lib/utils';

interface Props {
  memberId: string;
  name: string;
  avatarUrl?: string | null;
}

export function SidebarProfileBlock({ memberId, name, avatarUrl }: Props) {
  const { resolvedTheme, setTheme } = useTheme();
  const { signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const isDark = resolvedTheme === 'dark';

  const handleSignOut = async () => {
    await signOut();
    toast({ title: t('sidebar.logoutDone'), description: t('sidebar.seeYouSoon') });
    navigate('/auth', { replace: true });
  };

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-2 py-2 mx-2 mb-2 rounded-xl',
        'border border-border/40 bg-sidebar-accent/20',
      )}
    >
      <MemberAvatar
        memberId={memberId}
        memberName={name}
        avatarUrl={avatarUrl}
        size="sm"
        className="h-7 w-7"
      />
      <p className="flex-1 text-sm font-medium text-sidebar-foreground truncate">{name}</p>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 rounded-lg text-sidebar-foreground/70 hover:text-sidebar-foreground"
        onClick={() => setTheme(isDark ? 'light' : 'dark')}
        title={isDark ? 'Light' : 'Dark'}
        aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      >
        {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 rounded-lg text-sidebar-foreground/70 hover:text-sidebar-foreground"
        onClick={handleSignOut}
        title={t('sidebar.signOut')}
        aria-label={t('sidebar.signOut')}
      >
        <LogOut className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
