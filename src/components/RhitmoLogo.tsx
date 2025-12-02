interface RhitmoLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const RhitmoLogo = ({ className, size = 'md' }: RhitmoLogoProps) => {
  const sizes = {
    sm: { width: 100, height: 40 },
    md: { width: 140, height: 56 },
    lg: { width: 180, height: 72 }
  };
  
  return (
    <svg 
      viewBox="0 0 140 56" 
      fill="none"
      className={className} 
      width={sizes[size].width}
      height={sizes[size].height}
    >
      {/* Texto "Rhitmo" - fonte bold arredondada */}
      <text 
        x="50%" 
        y="28" 
        textAnchor="middle"
        fontFamily="Inter, system-ui, sans-serif" 
        fontWeight="700" 
        fontSize="32" 
        fill="currentColor"
        style={{ letterSpacing: '-0.02em' }}
      >
        Rhitmo
      </text>
      
      {/* Onda sonora/batimento - padrão do logo oficial */}
      <path 
        d="M20 48 
           Q30 48, 40 46 
           Q50 44, 55 38 
           Q60 32, 65 28 
           Q70 24, 75 32 
           Q80 40, 85 46 
           Q95 52, 105 48 
           Q115 44, 120 48"
        stroke="currentColor" 
        strokeWidth="4" 
        fill="none" 
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
