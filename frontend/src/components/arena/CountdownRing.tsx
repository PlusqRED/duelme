export type CountdownTimer = 'running' | 'up' | null;

/**
 * A player's time to answer, as a sun ring around their avatar: it drains while the clock runs and
 * empties when the time is up. It stands for the clock rather than measuring it, so it drains at
 * the same pace whatever the contract's timeout. Its seat gives it room 7px around the avatar.
 */
export function CountdownRing({ timer }: { timer: CountdownTimer }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 100 100"
      data-timer={timer ?? 'off'}
      className="group/ring pointer-events-none absolute -top-[7px] -left-[7px] size-[calc(100%+14px)] -rotate-90 fill-none stroke-[4.5] opacity-0 transition-opacity duration-300 data-[timer=running]:opacity-100 data-[timer=up]:opacity-100"
    >
      <circle cx="50" cy="50" r="47.5" className="stroke-canvas-deep" />
      <circle
        cx="50"
        cy="50"
        r="47.5"
        pathLength={1}
        strokeDasharray="1 1"
        className="stroke-sun-edge group-data-[timer=running]/ring:animate-drain group-data-[timer=up]/ring:animate-drain-out"
      />
    </svg>
  );
}
