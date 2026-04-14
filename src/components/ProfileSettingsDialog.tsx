import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { SlackPrivacyOnboarding } from '@/components/slack/SlackPrivacyOnboarding';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, RefreshCw, Compass, MessageSquare, Unlink, ExternalLink, Download, Globe } from 'lucide-react';
import { ThemeSelector } from '@/components/ThemeSelector';
import { ChromeExtensionSetupDialog } from '@/components/extension/ChromeExtensionSetupDialog';
import { useLocale } from '@/hooks/useLocale';
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '@/i18n';
import { MemberAvatar } from '@/components/MemberAvatar';
import { MemberAvatar } from '@/components/MemberAvatar';
import { LeaderAvatarLibrary } from '@/components/avatar/LeaderAvatarLibrary';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BatchSyncDialog } from '@/components/BatchSyncDialog';
import { LeaderSyncWizard } from '@/components/LeaderSyncWizard';

interface ProfileSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfileSettingsDialog({ open, onOpenChange }: ProfileSettingsDialogProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const { currentLocale, setLocale } = useLocale();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(false);
  const [batchSyncOpen, setBatchSyncOpen] = useState(false);
  const [leaderSyncOpen, setLeaderSyncOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [extensionSetupOpen, setExtensionSetupOpen] = useState(false);
  const [avatarLibraryOpen, setAvatarLibraryOpen] = useState(false);

  const { data: workspace } = useQuery({
    queryKey: ['workspace', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('workspaces')
        .select('*')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user && open,
  });

  const { data: slackIntegration, refetch: refetchSlack } = useQuery({
    queryKey: ['slack-integration', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('slack_integrations')
        .select('*')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user && open,
  });

  useEffect(() => {
    if (user) {
      setName(user.user_metadata?.full_name || user.user_metadata?.name || '');
      setRole(user.user_metadata?.role || '');
    }
  }, [user]);

  const handleSave = async () => {
    setLoading(true);
    const { error } = await supabase.auth.updateUser({
      data: { full_name: name, role }
    });
    
    if (!error) {
      toast({ 
        title: t('settings.profileUpdated'),
        description: t('settings.profileUpdatedDesc')
      });
      onOpenChange(false);
    } else {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: "destructive"
      });
    }
    setLoading(false);
  };

  const SLACK_CLIENT_ID = '590136271282.10821512589809';
  const slackOAuthUrl = `https://slack.com/oauth/v2/authorize?client_id=${SLACK_CLIENT_ID}&scope=commands,chat:write&user_scope=&redirect_uri=${encodeURIComponent(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/slack-oauth-callback`)}`;

  const handleSlackUnlink = async () => {
    if (!slackIntegration) return;
    const { error } = await supabase
      .from('slack_integrations')
      .delete()
      .eq('id', slackIntegration.id);
    if (!error) {
      toast({ title: t('settings.slackDisconnected') });
      refetchSlack();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('settings.profileSettings')}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Avatar selector for leaders */}
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => setAvatarLibraryOpen(true)}
              className="relative group rounded-full transition-all hover:scale-105"
            >
              <MemberAvatar
                memberId={user?.id || ''}
                memberName={name || 'User'}
                avatarUrl={user?.user_metadata?.avatar}
                size="lg"
              />
              <div className="absolute inset-0 rounded-full bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-white text-xs font-medium">{t('common.edit')}</span>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setAvatarLibraryOpen(true)}
              className="text-xs text-primary hover:underline"
            >
              {t('settings.changeAvatar', 'Trocar Avatar')}
            </button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">{t('settings.name')}</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('settings.namePlaceholder')}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="role">{t('settings.jobTitle')}</Label>
            <Input
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder={t('settings.jobTitlePlaceholder')}
            />
          </div>

          {/* Language Selector */}
          <div className="border-t pt-4">
            <Label className="text-muted-foreground text-xs uppercase tracking-wide mb-2 block">
              <Globe className="h-3 w-3 inline mr-1" />
              {t('settings.language')}
            </Label>
            <div className="flex gap-2">
              {SUPPORTED_LANGUAGES.map((lang) => (
                <Button
                  key={lang.code}
                  variant={currentLocale === lang.code ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1"
                  onClick={() => setLocale(lang.code as SupportedLanguage)}
                >
                  <span className="mr-1">{lang.flag}</span>
                  {lang.label}
                </Button>
              ))}
            </div>
          </div>
          
          {/* Appearance */}
          <div className="border-t pt-4">
            <ThemeSelector />
          </div>

          {/* Slack */}
          <div className="border-t pt-4">
            <Label className="text-muted-foreground text-xs uppercase tracking-wide mb-2 block">
              <MessageSquare className="h-3 w-3 inline mr-1" />
              Slack
            </Label>
            {slackIntegration ? (
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="text-sm">
                    {t('settings.slackConnectedAs')} <span className="font-medium">{slackIntegration.slack_user_id}</span>
                  </span>
                </div>
                <Button variant="ghost" size="sm" onClick={handleSlackUnlink}>
                  <Unlink className="h-4 w-4 mr-1" />
                  {t('settings.disconnect')}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {t('settings.slackDescription')}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  asChild
                >
                  <a href={slackOAuthUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-1" />
                    {t('settings.addToSlack')}
                  </a>
                </Button>
                <p className="text-xs text-muted-foreground">
                  {t('settings.slackBotHint')}
                </p>
              </div>
            )}

            {/* Best Practices */}
            <div className="mt-3 rounded-xl border bg-muted/30 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">📖 {t('settings.bestPractices')}</span>
                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setPrivacyOpen(true)}>
                  {t('settings.viewAgain')}
                </Button>
              </div>
              <div className="text-xs space-y-1">
                <div className="grid grid-cols-3 gap-1 font-medium text-muted-foreground border-b pb-1">
                  <span>{t('settings.command')}</span><span>{t('settings.whereToUse')}</span><span>{t('settings.visibility')}</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <code className="text-[10px]">/nota</code><span>DM/{t('settings.private')}</span><span>{t('settings.onlyYou')}</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <code className="text-[10px]">/kudos</code><span>{t('settings.public')}</span><span>{t('settings.everyoneSees')}</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <code className="text-[10px]">/review</code><span>{t('settings.dmOnly')}</span><span>{t('settings.onlyYou')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Chrome Extension */}
          <div className="border-t pt-4">
            <Label className="text-muted-foreground text-xs uppercase tracking-wide mb-2 block">
              <Download className="h-3 w-3 inline mr-1" />
              {t('settings.chromeExtension')}
            </Label>
            <p className="text-sm text-muted-foreground mb-3">
              {t('settings.chromeExtensionDesc')}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setExtensionSetupOpen(true)}
            >
              <Download className="h-4 w-4 mr-1" />
              {t('settings.setupExtension')}
            </Button>
          </div>

          {/* Maintenance */}
          <div className="border-t pt-4">
            <Label className="text-muted-foreground text-xs uppercase tracking-wide mb-2 block">
              {t('settings.maintenance')}
            </Label>
            {workspace && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setLeaderSyncOpen(true)}
                className="w-full justify-start gap-2 mb-2"
              >
                <Compass className="h-4 w-4" />
                {(workspace as Record<string, unknown>).leader_sync_data ? t('settings.updateLeaderProfile') : t('settings.setupLeaderProfile')}
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => setBatchSyncOpen(true)}
              className="w-full justify-start gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              {t('settings.syncIntelligence')}
            </Button>
            <p className="text-xs text-muted-foreground mt-1">
              {t('settings.syncIntelligenceDesc')}
            </p>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
      
      <BatchSyncDialog 
        open={batchSyncOpen} 
        onOpenChange={setBatchSyncOpen} 
      />
      {workspace && (
        <LeaderSyncWizard
          open={leaderSyncOpen}
          onOpenChange={setLeaderSyncOpen}
          workspaceId={workspace.id}
          existingData={(workspace as Record<string, unknown>).leader_sync_data as Record<string, unknown> | null}
        />
      )}
      <SlackPrivacyOnboarding open={privacyOpen} onOpenChange={setPrivacyOpen} />
      <ChromeExtensionSetupDialog open={extensionSetupOpen} onOpenChange={setExtensionSetupOpen} />
      <LeaderAvatarLibrary
        open={avatarLibraryOpen}
        onOpenChange={setAvatarLibraryOpen}
        currentAvatar={user?.user_metadata?.avatar}
      />
    </Dialog>
  );
}
