import { MemberAvatar } from '@/components/MemberAvatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useImpersonation } from '@/hooks/useImpersonation';
import { cn } from '@/lib/utils';

interface ImpersonationIndicatorProps {
  memberId: string;
  memberName: string;
  avatarUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
  showTag?: boolean;
}

/**
 * Wraps MemberAvatar with a discreet amber ring when the admin is impersonating.
 * Click on the ring/tag to stop impersonation. Renders plain avatar otherwise.
 */
export const ImpersonationIndicator = ({
  memberId,
  memberName,
  avatarUrl,
  size = 'md',
  showTag = true,
}: ImpersonationIndicatorProps) => {
  const { isImpersonating, impersonatedEmail, stopImpersonation } = useImpersonation();

  if (!isImpersonating) {
    return <MemberAvatar memberId={memberId} memberName={memberName} avatarUrl={avatarUrl} size={size} />;
  }

  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={stopImpersonation}
              className={cn(
                'rounded-full ring-2 ring-amber-400 ring-offset-2 ring-offset-background transition-all hover:ring-amber-500 focus:outline-none focus:ring-amber-500',
              )}
              aria-label="Encerrar visualização"
            >
              <MemberAvatar memberId={memberId} memberName={memberName} avatarUrl={avatarUrl} size={size} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <p className="text-xs">
              Você está vendo como <strong>{impersonatedEmail || memberName}</strong>.
              <br />
              Clique para encerrar.
            </p>
          </TooltipContent>
        </Tooltip>

        {showTag && (
          <button
            type="button"
            onClick={stopImpersonation}
            className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900 hover:bg-amber-200 transition-colors"
          >
            Personificando
          </button>
        )}
      </div>
    </TooltipProvider>
  );
};
