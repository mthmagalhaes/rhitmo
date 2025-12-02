interface RhitmoLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const RhitmoLogo = ({ className, size = 'md' }: RhitmoLogoProps) => {
  const sizes = {
    sm: { width: 100, height: 37 },
    md: { width: 140, height: 52 },
    lg: { width: 180, height: 67 }
  };
  
  return (
    <svg 
      viewBox="0 0 140 52" 
      fill="none"
      className={`group ${className || ''}`}
      width={sizes[size].width}
      height={sizes[size].height}
      role="img"
      aria-labelledby="rhitmo-logo-title"
    >
      <title id="rhitmo-logo-title">Rhitmo logo</title>
      
      {/* Texto "Rhitmo" - fonte system-ui bold */}
      <text 
        x="50%" 
        y="24" 
        textAnchor="middle"
        fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" 
        fontWeight="700" 
        fontSize="28" 
        fill="currentColor"
      >
        Rhitmo
      </text>
      
      {/* Rhythm line - onda senoidal suave */}
      <path 
        d="M10 44
           C25 40, 40 48, 55 44
           S85 40, 100 44
           S130 48, 140 44"
        stroke="currentColor" 
        strokeWidth="4" 
        fill="none" 
        strokeLinecap="round"
        strokeLinejoin="round"
        className="origin-center transition-transform duration-300 group-hover:animate-wave-pulse"
        style={{ transformOrigin: '70px 44px' }}
      />
    </svg>
  );
};
