/**
 * Divisor de 48px entre seções — linha fina derivada da onda (Brand Kit v1).
 */
interface WaveDividerProps {
  className?: string;
  tone?: 'primary' | 'mono';
}

export const WaveDivider = ({ className = '', tone = 'primary' }: WaveDividerProps) => {
  const stroke = tone === 'mono' ? 'currentColor' : 'hsl(var(--primary))';
  return (
    <div className={`w-full overflow-hidden ${className}`} aria-hidden="true">
      <svg
        viewBox="0 0 1680 48"
        fill="none"
        preserveAspectRatio="none"
        className="pointer-events-none select-none w-full"
        style={{ height: 48 }}
      >
        {[0, 1, 2].map((i) => {
          const cy = 20 + i * 5;
          const amp = 7 + i * 2;
          return (
            <path
              key={i}
              d={`M0 ${cy} C300 ${cy - amp}, 560 ${cy + amp}, 840 ${cy} S1380 ${cy - amp}, 1680 ${cy}`}
              stroke={stroke}
              strokeWidth={1.25 - i * 0.15}
              fill="none"
              strokeLinecap="round"
              opacity={0.14 + i * 0.08}
            />
          );
        })}
      </svg>
    </div>
  );
};
