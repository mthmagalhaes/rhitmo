/**
 * RhythmWave — textura de onda do Brand Kit v1.
 * Opacidades entre 0.04 e 0.08, geometria derivada das três ondas do logo.
 */
interface RhythmWaveProps {
  variant?: 'hero' | 'divider' | 'background' | 'auth';
  className?: string;
  height?: number;
  /** `mono` herda currentColor (útil sobre seções escuras). */
  tone?: 'primary' | 'mono';
}

export const RhythmWave = ({ variant = 'hero', className = '', height, tone = 'primary' }: RhythmWaveProps) => {
  const config = {
    hero: { h: height || 200, lines: 5, baseOpacity: 0.05, step: 0.008 },
    divider: { h: height || 48, lines: 3, baseOpacity: 0.06, step: 0.01 },
    background: { h: height || 600, lines: 7, baseOpacity: 0.04, step: 0.006 },
    auth: { h: height || 300, lines: 6, baseOpacity: 0.06, step: 0.008 },
  }[variant];

  const stroke = tone === 'mono' ? 'currentColor' : 'hsl(var(--primary))';

  const lines = Array.from({ length: config.lines }, (_, i) => {
    const opacity = config.baseOpacity + i * config.step;
    const yOffset = (i - Math.floor(config.lines / 2)) * (config.h / (config.lines + 2));
    const amplitude = Math.min(config.h * 0.12, 10) + i * 3;
    const cy = config.h / 2 + yOffset;

    return (
      <path
        key={i}
        d={`M0 ${cy}
           C${140} ${cy - amplitude}, ${280} ${cy + amplitude}, ${420} ${cy}
           S${700} ${cy - amplitude}, ${840} ${cy}
           S${1120} ${cy + amplitude}, ${1260} ${cy}
           S${1540} ${cy - amplitude}, ${1680} ${cy}`}
        stroke={stroke}
        strokeWidth={2.5 - i * 0.15}
        fill="none"
        strokeLinecap="round"
        opacity={opacity}
      />
    );
  });

  return (
    <svg
      viewBox={`0 0 1680 ${config.h}`}
      fill="none"
      preserveAspectRatio="none"
      className={`pointer-events-none select-none ${className}`}
      style={{ width: '100%', height: config.h }}
      aria-hidden="true"
    >
      {lines}
    </svg>
  );
};
