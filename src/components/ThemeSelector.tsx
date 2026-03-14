import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { Label } from '@/components/ui/label';
import type { Theme } from '@/hooks/useTheme';

const options: { value: Theme; label: string; icon: typeof Sun; preview: 'light' | 'dark' | 'split' }[] = [
  { value: 'light', label: 'Claro', icon: Sun, preview: 'light' },
  { value: 'dark', label: 'Escuro', icon: Moon, preview: 'dark' },
  { value: 'system', label: 'Sistema', icon: Monitor, preview: 'split' },
];

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-2">
      <Label className="text-muted-foreground text-xs uppercase tracking-wide">Aparência</Label>
      <div className="grid grid-cols-3 gap-2">
        {options.map(({ value, label, icon: Icon, preview }) => {
          const selected = theme === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setTheme(value)}
              className={`flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition-all duration-200 ${
                selected
                  ? 'border-primary bg-accent shadow-sm'
                  : 'border-border hover:border-primary/30 bg-card'
              }`}
            >
              {/* Mini preview */}
              <div className="w-full h-8 rounded-md overflow-hidden flex">
                {preview === 'light' && (
                  <div className="w-full h-full bg-[#F5F3EE] border border-border/50" />
                )}
                {preview === 'dark' && (
                  <div className="w-full h-full bg-[#1a1a1f] border border-[#2e2e3a]" />
                )}
                {preview === 'split' && (
                  <>
                    <div className="w-1/2 h-full bg-[#F5F3EE] border-l border-y border-border/50 rounded-l-md" />
                    <div className="w-1/2 h-full bg-[#1a1a1f] border-r border-y border-[#2e2e3a] rounded-r-md" />
                  </>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <Icon className={`h-3.5 w-3.5 ${selected ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className={`text-xs font-medium ${selected ? 'text-primary' : 'text-muted-foreground'}`}>
                  {label}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
