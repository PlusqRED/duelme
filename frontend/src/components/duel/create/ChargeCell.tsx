/**
 * One cell of the bar: an empty well, hatched orange past what the wallet holds (`past`, where in
 * the cell that starts), and a fill revealed from the left by `--f`, red then orange past the
 * balance. The fill's window slides in while the fill inside slides back, so it uncovers rather
 * than stretches.
 */
export function ChargeCell({ past }: { past: number }) {
  return (
    <span
      style={{ '--o': past }}
      className="relative flex-1 overflow-hidden rounded-[5px] bg-[linear-gradient(90deg,var(--color-canvas-deep)_calc(var(--o)*100%),transparent_0),repeating-linear-gradient(-45deg,var(--color-orange-line)_0_2px,var(--color-orange-wash)_2px_6px)] first:rounded-l-[11px] last:rounded-r-[11px]"
    >
      <i className="absolute inset-0 translate-x-[calc((var(--f,0)-1)*100%)] overflow-hidden">
        <i className="absolute inset-0 translate-x-[calc((1-var(--f,0))*100%)] bg-[linear-gradient(90deg,var(--color-red)_calc(var(--o)*100%),var(--color-orange)_0)] inset-shadow-stake before:absolute before:inset-x-0 before:top-0 before:h-0.5 before:bg-paper/16" />
      </i>
    </span>
  );
}
