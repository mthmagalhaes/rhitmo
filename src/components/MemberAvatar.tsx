import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface MemberAvatarProps {
  memberId: string;
  memberName: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const getBoringAvatarUrl = (seed: string, size: number = 120) => {
  const colors = '7C3AED,10B981,F59E0B,3B82F6,EC4899';
  return `https://source.boringavatars.com/beam/${size}/${encodeURIComponent(seed)}?colors=${colors}&square`;
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
  size = 'md',
  className 
}: MemberAvatarProps) => {
  const [imageError, setImageError] = useState(false);
  const sizeConfig = sizes[size];
  const avatarUrl = getBoringAvatarUrl(memberId, sizeConfig.imgSize);
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
