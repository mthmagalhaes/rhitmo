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
      className={className} 
      width={sizes[size].width}
      height={sizes[size].height}
    >
      {/* Texto "Rhitmo" - fonte Inter bold */}
      <text 
        x="50%" 
        y="26" 
        textAnchor="middle"
        fontFamily="Inter, system-ui, sans-serif" 
        fontWeight="700" 
        fontSize="30" 
        fill="currentColor"
        style={{ letterSpacing: '-0.02em' }}
      >
        Rhitmo
      </text>
      
      {/* Onda orgânica - batimento cardíaco suave */}
      <path 
        d="M10 44 
           C18 44, 25 44, 35 42
           C45 40, 52 36, 58 30
           C62 26, 65 24, 70 24
           C75 24, 78 28, 82 34
           C88 42, 95 48, 105 48
           C115 48, 125 46, 130 44"
        stroke="currentColor" 
        strokeWidth="3" 
        fill="none" 
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
