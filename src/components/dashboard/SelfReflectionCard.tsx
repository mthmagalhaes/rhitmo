import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sprout, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useWeeklyReflection } from '@/hooks/useWeeklyReflection';

interface SelfReflectionCardProps {
  memberId: string;
}

export function SelfReflectionCard({ memberId }: SelfReflectionCardProps) {
  const { t } = useTranslation();
  const { prompt, isLoading, submit } = useWeeklyReflection(memberId);
  const [response, setResponse] = useState('');
  const [share, setShare] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (isLoading || !prompt) return null;

  const isAnswered = !!prompt.answered_at;

  const handleSubmit = async () => {
    if (!response.trim() && !isAnswered) return;
    setSubmitting(true);
    await submit(prompt.id, response, share);
    setSubmitting(false);
  };

  return (
    <div className="rounded-3xl bg-card border border-border/60 p-6 shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
      <div className="flex items-start gap-3 mb-4">
        <div className="rounded-xl bg-emerald-500/10 p-2.5 shrink-0">
          <Sprout className="h-4 w-4 text-emerald-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700 mb-1">
            {t('selfReflection.cardTitle')}
          </p>
          <p className="font-serif text-lg leading-snug text-foreground tracking-tight">
            {prompt.prompt_text}
          </p>
        </div>
      </div>

      {isAnswered ? (
        <div className="space-y-3">
          <div className="rounded-xl bg-muted/40 px-3 py-2.5 border border-border/40">
            <p className="text-sm text-foreground italic">"{prompt.response || t('selfReflection.noResponse')}"</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            {prompt.shared_with_leader
              ? t('selfReflection.sharedConfirmed')
              : t('selfReflection.privateConfirmed')}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <Textarea
            value={response}
            onChange={(e) => setResponse(e.target.value.slice(0, 500))}
            placeholder={t('selfReflection.placeholder')}
            className="rounded-xl resize-none min-h-[88px] text-sm"
            maxLength={500}
          />
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Switch
                id="share-with-leader"
                checked={share}
                onCheckedChange={setShare}
              />
              <Label
                htmlFor="share-with-leader"
                className="text-xs text-muted-foreground cursor-pointer"
              >
                {t('selfReflection.shareWithLeader')}
              </Label>
            </div>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={submitting || !response.trim()}
              className="rounded-xl h-8 text-xs"
            >
              {submitting && <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />}
              {t('selfReflection.submit')}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            {response.length}/500 — {t('selfReflection.privacyNote')}
          </p>
        </div>
      )}
    </div>
  );
}
