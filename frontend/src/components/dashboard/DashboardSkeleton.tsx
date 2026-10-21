/** The page's shape while the duels are read from the contract: a board of two cards, then the history's rows. */
export function DashboardSkeleton() {
  return (
    <div aria-hidden="true" className="grid gap-4">
      <span className="h-[26px] w-40 animate-wait rounded-[10px] bg-canvas-deep" />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 @min-[660px]/desk:grid-cols-2">
        <span className="h-[300px] animate-wait rounded-3xl bg-canvas-deep" />
        <span className="h-[300px] animate-wait rounded-3xl bg-canvas-deep" />
      </div>
      <span className="h-[26px] w-40 animate-wait rounded-[10px] bg-canvas-deep" />
      <div className="grid gap-2">
        {[0, 1, 2, 3].map((row) => (
          <span key={row} className="h-[72px] animate-wait rounded-[20px] bg-canvas-deep" />
        ))}
      </div>
    </div>
  );
}

/** The player's card while the duels are read. */
export function StandingSkeleton() {
  return <div aria-hidden="true" className="h-[460px] animate-wait rounded-3xl bg-canvas-deep" />;
}
