// Lightweight in-layout fallback shown while a lazy route chunk loads.
// Replaces the previous full-screen spinner that unmounted the sidebar
// and made navigation feel laggy.
export function RouteSkeleton() {
  return (
    <div className="p-6 lg:p-8 space-y-4 animate-pulse" aria-busy="true" aria-live="polite">
      <div className="h-7 w-48 rounded-lg bg-muted/70" />
      <div className="h-4 w-72 rounded-md bg-muted/50" />
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="h-40 rounded-2xl bg-muted/40" />
        <div className="h-40 rounded-2xl bg-muted/40" />
      </div>
      <div className="h-64 rounded-2xl bg-muted/30" />
    </div>
  );
}
