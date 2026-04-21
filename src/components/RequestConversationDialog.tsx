import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, MessageCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RequestConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberId: string;
  memberName: string;
  defaultTopic?: string;
}

export function RequestConversationDialog({
  open,
  onOpenChange,
  memberId,
  memberName,
  defaultTopic,
}: RequestConversationDialogProps) {
  const { t } = useTranslation();
  const [topic, setTopic] = useState(defaultTopic || '');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!topic.trim()) {
      toast.error(t('requestConversation.topicRequired'));
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke('send-member-nudge', {
        body: {
          memberId,
          memberName,
          topic: topic.trim(),
        },
      });
      if (error) throw error;
      toast.success(t('requestConversation.sent'));
      setTopic('');
      onOpenChange(false);
    } catch (err: unknown) {
      console.error('[RequestConversationDialog] error:', err);
      toast.error(t('requestConversation.error'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            {t('requestConversation.title')}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-sm text-muted-foreground">{t('requestConversation.description')}</p>
          <div className="space-y-2">
            <Label htmlFor="topic">{t('requestConversation.topicLabel')}</Label>
            <Textarea
              id="topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder={t('requestConversation.topicPlaceholder')}
              rows={4}
              maxLength={500}
              autoFocus
            />
            <p className="text-xs text-muted-foreground text-right">{topic.length}/500</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !topic.trim()}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('requestConversation.send')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
