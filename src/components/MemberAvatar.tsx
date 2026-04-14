import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { CustomAvatar } from '@/components/avatar/CustomAvatar';
import { getAvatarById, getAvatarForName } from '@/components/avatar/avatarData';

interface MemberAvatarProps {
  memberId: string;
  memberName: string;
  avatarUrl?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizes = {
  sm: { container: 'h-8 w-8', svgSize: 32 },
  md: { container: 'h-10 w-10', svgSize: 40 },
  lg: { container: 'h-16 w-16', svgSize: 64 },
  xl: { container: 'h-24 w-24', svgSize: 96 }
};

export const MemberAvatar = ({ 
  memberId, 
  memberName, 
  avatarUrl: customAvatarUrl,
  size = 'md',
  className 
}: MemberAvatarProps) => {
  const sizeConfig = sizes[size];
  const initials = memberName.split(' ').map(n => n[0]).join('');

  // Check if it's a custom avatar ID (e.g. "avatar-1")
  const customVariant = customAvatarUrl?.startsWith('avatar-')
    ? getAvatarById(customAvatarUrl)
    : null;

  // If custom avatar ID is set, render it
  if (customVariant) {
    return (
      <div className={`${sizeConfig.container} ${className || ''} rounded-full overflow-hidden shrink-0`}>
        <CustomAvatar variant={customVariant} size={sizeConfig.svgSize} className="w-full h-full" />
      </div>
    );
  }

  // If it's an external URL (legacy DiceBear or uploaded photo), show it
  if (customAvatarUrl && !customAvatarUrl.startsWith('avatar-')) {
    return (
      <Avatar className={`${sizeConfig.container} ${className || ''}`}>
        <img 
          src={customAvatarUrl} 
          alt={memberName} 
          className="aspect-square h-full w-full"
          loading="lazy"
        />
        <AvatarFallback className="bg-primary text-primary-foreground">
          {initials}
        </AvatarFallback>
      </Avatar>
    );
  }

  // Default: deterministic avatar based on name
  const defaultVariant = getAvatarForName(memberName);
  return (
    <div className={`${sizeConfig.container} ${className || ''} rounded-full overflow-hidden shrink-0`}>
      <CustomAvatar variant={defaultVariant} size={sizeConfig.svgSize} className="w-full h-full" />
    </div>
  );
};
