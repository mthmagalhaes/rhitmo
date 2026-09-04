// Resumo numérico da rede, em linguagem simples.
import type { NetworkSummaryData } from '@/lib/networkMetrics';

const ITEMS: { key: keyof NetworkSummaryData; label: string }[] = [
  { key: 'people', label: 'Pessoas' },
  { key: 'relationships', label: 'Relações' },
  { key: 'avgConnections', label: 'Conexões por pessoa' },
  { key: 'components', label: 'Grupos separados' },
];

export function NetworkSummary({ data }: { data: NetworkSummaryData }) {
  return (
    <dl className="space-y-2">
      {ITEMS.map((item) => (
        <div key={item.key} className="flex items-center justify-between text-xs">
          <dt className="text-muted-foreground">{item.label}</dt>
          <dd className="font-medium tabular-nums">{data[item.key]}</dd>
        </div>
      ))}
    </dl>
  );
}
