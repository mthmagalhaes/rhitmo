import { useSearchParams } from 'react-router-dom';
import { ReactNode } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { motion, useReducedMotion } from 'framer-motion';
import { useId } from 'react';
import type { LucideIcon } from 'lucide-react';

export interface PageTab {
  value: string;
  label: string;
  icon?: LucideIcon;
  count?: number;
  hidden?: boolean;
  content: ReactNode;
}

interface PageTabsProps {
  tabs: PageTab[];
  /** Default tab value when no `?tab=` is present. Defaults to first visible. */
  defaultValue?: string;
  /** URL search param key used to sync the active tab. Set to `null` to disable. */
  syncParam?: string | null;
  /** Optional element rendered to the right of the tab list (CTA button, filters). */
  rightSlot?: ReactNode;
  className?: string;
}

/**
 * Windmill-style page tabs.
 * - Pill underline look
 * - Syncs active tab to a URL search param (default `tab`) for deep-linking
 * - Hides tabs marked `hidden: true` (useful for role-gated tabs)
 */
export function PageTabs({
  tabs,
  defaultValue,
  syncParam = 'tab',
  rightSlot,
  className,
}: PageTabsProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const reduce = useReducedMotion();
  const indicatorId = useId();
  const visible = tabs.filter((t) => !t.hidden);
  const fallback = defaultValue ?? visible[0]?.value;
  const active = (syncParam ? searchParams.get(syncParam) : null) ?? fallback;
  const valid = visible.some((t) => t.value === active) ? active : fallback;

  const onChange = (value: string) => {
    if (!syncParam) return;
    const next = new URLSearchParams(searchParams);
    if (value === fallback) {
      next.delete(syncParam);
    } else {
      next.set(syncParam, value);
    }
    setSearchParams(next, { replace: true });
  };

  if (!valid) return null;

  return (
    <Tabs value={valid} onValueChange={onChange} className={cn('w-full', className)}>
      <div className="flex items-center justify-between gap-3 border-b border-border/60 mb-6">
        <TabsList className="h-auto bg-transparent p-0 gap-1">
          {visible.map((t) => {
            const Icon = t.icon;
            return (
              <TabsTrigger
                key={t.value}
                value={t.value}
                className={cn(
                  'relative h-10 rounded-none border-0 bg-transparent px-3 text-sm font-medium text-muted-foreground',
                  'data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none',
                  'transition-colors hover:text-foreground'
                )}
              >
                {valid === t.value && (
                  <motion.span
                    layoutId={`tab-indicator-${indicatorId}`}
                    className="absolute inset-x-2 -bottom-px h-[2px] rounded-full bg-primary"
                    transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 40 }}
                  />
                )}
                {Icon && <Icon className="w-4 h-4 mr-2" />}
                {t.label}
                {typeof t.count === 'number' && (
                  <span className="ml-2 inline-flex items-center justify-center rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                    {t.count}
                  </span>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>
        {rightSlot && <div className="pb-2">{rightSlot}</div>}
      </div>
      {visible.map((t) => (
        <TabsContent key={t.value} value={t.value} className="mt-0 focus-visible:outline-none">
          <motion.div
            key={valid}
            initial={reduce ? false : { opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          >
            {t.content}
          </motion.div>
        </TabsContent>
      ))}
    </Tabs>
  );
}
