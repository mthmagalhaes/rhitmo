import { AvatarVariant } from './avatarData';

interface CustomAvatarProps {
  variant: AvatarVariant;
  size?: number;
  className?: string;
}

export function CustomAvatar({ variant, size = 60, className }: CustomAvatarProps) {
  const gradientId = `grad-${variant.id}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={variant.gradient[0]} />
          <stop offset="100%" stopColor={variant.gradient[1]} />
        </linearGradient>
      </defs>
      {/* Background circle */}
      <circle cx="50" cy="50" r="50" fill={`url(#${gradientId})`} />
      {/* Face features */}
      <g stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none">
        {/* Eyes */}
        <path d={variant.face.eyes} fill="white" stroke="none" />
        {/* Eyebrows */}
        {variant.face.eyebrows && (
          <path d={variant.face.eyebrows} fill="none" strokeWidth="2" />
        )}
        {/* Mouth */}
        <path d={variant.face.mouth} />
      </g>
    </svg>
  );
}
