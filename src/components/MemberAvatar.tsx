import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface MemberAvatarProps {
  memberId: string;
  memberName: string;
  avatarUrl?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const getDiceBearUrl = (seed: string) => {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;
};

const sizes = {
  sm: { container: 'h-8 w-8', imgSize: 40 },
  md: { container: 'h-10 w-10', imgSize: 60 },
  lg: { container: 'h-16 w-16', imgSize: 120 },
  xl: { container: 'h-24 w-24', imgSize: 160 }
};

export const MemberAvatar = ({ 
  memberId, 
  memberName, 
  avatarUrl: customAvatarUrl,
  size = 'md',
  className 
}: MemberAvatarProps) => {
  const [imageError, setImageError] = useState(false);
  const sizeConfig = sizes[size];
  const avatarUrl = customAvatarUrl || getDiceBearUrl(memberName);
  const initials = memberName.split(' ').map(n => n[0]).join('');

  return (
    <Avatar className={`${sizeConfig.container} ${className || ''}`}>
      {!imageError ? (
        <AvatarImage 
          src={avatarUrl}
          alt={memberName}
          loading="lazy"
          onError={() => setImageError(true)}
        />
      ) : null}
      <AvatarFallback className="bg-violet-600 text-white">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
};
