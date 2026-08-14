/**
 * Sistema de logo Rhitmo — Brand Kit v1.
 *
 * Regras de uso:
 *  - `tone="primary"`  → wordmark sobre creme (texto foreground + ondas roxas)
 *  - `tone="on-dark"`  → sobre superfícies escuras (#1A1035)
 *  - `tone="mono"`     → cor única, herda `currentColor` (impressão, marca d'água)
 *
 * A proporção das três ondas nunca muda. Só cor e opacidade.
 */
interface RhitmoLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  /** Atalho legado — equivale a variant="icon". */
  iconOnly?: boolean;
  variant?: 'wordmark' | 'stacked' | 'icon';
  tone?: 'primary' | 'on-dark' | 'mono';
}

const SIZES = {
  sm: { width: 100, height: 40, fontSize: 26, waveY: 33 },
  md: { width: 140, height: 52, fontSize: 30, waveY: 42 },
  lg: { width: 180, height: 64, fontSize: 38, waveY: 52 },
} as const;

const ICON_PX = { sm: 28, md: 32, lg: 40 } as const;

/** Geometria canônica das 3 ondas, normalizada em uma caixa 0..1 × 0..1. */
const WAVE_LAYERS = [
  { dy: 0, amp: 0.9, width: 3, opacity: 0.28 },
  { dy: 0.16, amp: 1.15, width: 3.5, opacity: 0.58 },
  { dy: 0.32, amp: 0.75, width: 2.5, opacity: 0.92 },
];

function wavePath(x0: number, x1: number, y: number, amp: number) {
  const w = x1 - x0;
  return [
    `M${x0} ${y}`,
    `C${x0 + w * 0.18} ${y - amp}, ${x0 + w * 0.34} ${y + amp}, ${x0 + w * 0.5} ${y}`,
    `S${x0 + w * 0.78} ${y - amp}, ${x1} ${y}`,
  ].join(' ');
}

export const RhitmoLogo = ({
  className,
  size = 'md',
  iconOnly = false,
  variant,
  tone = 'primary',
}: RhitmoLogoProps) => {
  const resolved = variant ?? (iconOnly ? 'icon' : 'wordmark');
  const s = SIZES[size];

  const waveColor =
    tone === 'mono' ? 'currentColor' : tone === 'on-dark' ? 'hsl(var(--primary-300))' : 'hsl(var(--primary))';
  const textColor = tone === 'on-dark' ? 'hsl(var(--primary-foreground))' : 'currentColor';

  const waves = (x0: number, x1: number, baseY: number, unit: number) =>
    WAVE_LAYERS.map((l, i) => (
      <path
        key={i}
        d={wavePath(x0, x1, baseY + l.dy * unit, l.amp * unit)}
        stroke={waveColor}
        strokeWidth={l.width * (unit / 6)}
        fill="none"
        strokeLinecap="round"
        opacity={tone === 'mono' ? l.opacity * 0.9 : l.opacity}
      />
    ));

  if (resolved === 'icon') {
    const px = ICON_PX[size];
    return (
      <svg
        viewBox="0 0 40 40"
        fill="none"
        className={className}
        width={px}
        height={px}
        role="img"
        aria-label="Rhitmo"
      >
        {WAVE_LAYERS.map((l, i) => (
          <path
            key={i}
            d={wavePath(3, 37, 13 + i * 6, l.amp * 6)}
            stroke={waveColor}
            strokeWidth={l.width}
            fill="none"
            strokeLinecap="round"
            opacity={l.opacity}
          />
        ))}
      </svg>
    );
  }

  if (resolved === 'stacked') {
    const w = 100;
    const h = 88;
    return (
      <svg
        viewBox={`0 0 ${w} ${h}`}
        fill="none"
        className={className}
        width={w}
        height={h}
        role="img"
        aria-label="Rhitmo"
      >
        {WAVE_LAYERS.map((l, i) => (
          <path
            key={i}
            d={wavePath(14, 86, 14 + i * 7, l.amp * 7)}
            stroke={waveColor}
            strokeWidth={l.width}
            fill="none"
            strokeLinecap="round"
            opacity={l.opacity}
          />
        ))}
        <text
          x="50%"
          y={74}
          textAnchor="middle"
          fontFamily="'Lora', Georgia, 'Times New Roman', serif"
          fontWeight="700"
          fontSize={24}
          fill={textColor}
          letterSpacing="-0.02em"
        >
          Rhitmo
        </text>
      </svg>
    );
  }

  const unit = s.height * 0.115;

  return (
    <svg
      viewBox={`0 0 ${s.width} ${s.height}`}
      fill="none"
      className={className}
      width={s.width}
      height={s.height}
      role="img"
      aria-label="Rhitmo"
    >
      <text
        x="50%"
        y={s.fontSize * 0.85}
        textAnchor="middle"
        fontFamily="'Lora', Georgia, 'Times New Roman', serif"
        fontWeight="700"
        fontSize={s.fontSize}
        fill={textColor}
        letterSpacing="-0.02em"
      >
        Rhitmo
      </text>
      {waves(s.width * 0.04, s.width * 0.96, s.waveY, unit)}
    </svg>
  );
};
