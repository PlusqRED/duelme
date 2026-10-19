import { identiconCells } from '@/lib/identicon';
import { cn } from '@/lib/utils';

interface IdenticonProps {
  address: string;
  className?: string;
}

/** The address's pattern in the current text colour. Cells a hair over one wide leave no seams. */
export function Identicon({ address, className }: IdenticonProps) {
  return (
    <svg viewBox="0 0 5 5" aria-hidden="true" shapeRendering="crispEdges" className={cn('fill-current', className)}>
      {identiconCells(address).map(({ x, y }) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={1.02} height={1.02} />
      ))}
    </svg>
  );
}
