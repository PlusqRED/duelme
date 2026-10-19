import { identiconCells } from '@/lib/identicon';
import { cn } from '@/lib/utils';

interface IdenticonProps {
  address: string;
  className?: string;
}

/** The address's pattern in the current text colour, as one path, so neighbouring cells show no seams. */
export function Identicon({ address, className }: IdenticonProps) {
  const path = identiconCells(address)
    .map(({ x, y }) => `M${x} ${y}h1v1h-1z`)
    .join('');

  return (
    <svg viewBox="0 0 5 5" aria-hidden="true" shapeRendering="crispEdges" className={cn('fill-current', className)}>
      <path d={path} />
    </svg>
  );
}
