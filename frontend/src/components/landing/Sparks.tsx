/** Seven sparks round a circle, each a little off its even share so the burst looks thrown. */
const sparks = [0.2, 0.45, 0.1, 0.35, 0.05, 0.4, 0.25].map((jitter, index) => {
  const angle = (index / 7) * 2 * Math.PI + jitter;
  return { dx: `${Math.cos(angle) * (50 + jitter * 60)}px`, dy: `${Math.sin(angle) * (36 + jitter * 48)}px` };
});

interface SparksProps {
  /** When the burst starts, after its holder is shown. */
  delayMs: number;
}

/** Sun sparks bursting from the middle of their holder: something new was just made. */
export function Sparks({ delayMs }: SparksProps) {
  return sparks.map(({ dx, dy }, index) => (
    <i
      key={dx}
      aria-hidden="true"
      style={{ '--dx': dx, '--dy': dy, '--delay': `${delayMs + index * 30}ms` }}
      className="pointer-events-none absolute top-1/2 left-1/2 size-3 animate-spark bg-sun [animation-delay:var(--delay)] [clip-path:polygon(50%_0,62%_38%,100%_50%,62%_62%,50%_100%,38%_62%,0_50%,38%_38%)]"
    />
  ));
}
