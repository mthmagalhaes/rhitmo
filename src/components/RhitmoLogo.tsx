interface RhitmoLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  iconOnly?: boolean;
}

export const RhitmoLogo = ({ className, size = 'md', iconOnly = false }: RhitmoLogoProps) => {
  const sizes = {
    sm: { width: 100, height: 40, fontSize: 26, waveY: 34 },
    md: { width: 140, height: 52, fontSize: 30, waveY: 42 },
    lg: { width: 180, height: 64, fontSize: 38, waveY: 52 },
  };

  const s = sizes[size];

  if (iconOnly) {
    return (
      <svg
        viewBox="0 0 40 40"
        fill="none"
        className={`group ${className || ''}`}
        width={size === 'sm' ? 28 : size === 'md' ? 32 : 40}
        height={size === 'sm' ? 28 : size === 'md' ? 32 : 40}
        role="img"
        aria-label="Rhitmo"
      >
        {/* Wave icon mark — 3 layered waves */}
        <path
          d="M4 24 C10 20, 16 28, 22 24 S34 20, 38 24"
          stroke="hsl(var(--primary))"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          opacity="0.3"
        />
        <path
          d="M2 20 C9 15, 17 25, 24 20 S33 15, 40 20"
          stroke="hsl(var(--primary))"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          opacity="0.6"
        />
        <path
          d="M3 16 C10 11, 18 21, 25 16 S35 11, 40 16"
          stroke="hsl(var(--primary))"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          opacity="0.9"
        />
      </svg>
    );
  }

  return (
    <svg
      viewBox={`0 0 ${s.width} ${s.height}`}
      fill="none"
      className={`group ${className || ''}`}
      width={s.width}
      height={s.height}
      role="img"
      aria-label="Rhitmo"
    >
      {/* Wordmark — Lora serif, editorial */}
      <text
        x="50%"
        y={s.fontSize * 0.85}
        textAnchor="middle"
        fontFamily="'Lora', Georgia, 'Times New Roman', serif"
        fontWeight="700"
        fontSize={s.fontSize}
        fill="currentColor"
        letterSpacing="-0.02em"
      >
        Rhitmo
      </text>

      {/* Rhythm wave — 3 layered curves beneath the wordmark */}
      <path
        d={`M${s.width * 0.04} ${s.waveY}
           C${s.width * 0.2} ${s.waveY - 5}, ${s.width * 0.35} ${s.waveY + 5}, ${s.width * 0.5} ${s.waveY}
           S${s.width * 0.75} ${s.waveY - 5}, ${s.width * 0.96} ${s.waveY}`}
        stroke="hsl(var(--primary))"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        opacity="0.25"
      />
      <path
        d={`M${s.width * 0.02} ${s.waveY + 1}
           C${s.width * 0.18} ${s.waveY - 4}, ${s.width * 0.33} ${s.waveY + 6}, ${s.width * 0.48} ${s.waveY + 1}
           S${s.width * 0.72} ${s.waveY - 4}, ${s.width * 0.98} ${s.waveY + 1}`}
        stroke="hsl(var(--primary))"
        strokeWidth="3.5"
        fill="none"
        strokeLinecap="round"
        opacity="0.55"
      />
      <path
        d={`M${s.width * 0.06} ${s.waveY + 2}
           C${s.width * 0.22} ${s.waveY - 3}, ${s.width * 0.38} ${s.waveY + 7}, ${s.width * 0.52} ${s.waveY + 2}
           S${s.width * 0.78} ${s.waveY - 3}, ${s.width * 0.94} ${s.waveY + 2}`}
        stroke="hsl(var(--primary))"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
        opacity="0.85"
      />
    </svg>
  );
};
