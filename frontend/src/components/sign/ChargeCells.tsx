'use client';

import { chargeCells } from '@/lib/chargeCells';
import type { SeatSide } from '@/lib/duel';
import { cn } from '@/lib/utils';

const HATCH = 'bg-[repeating-linear-gradient(-45deg,var(--color-orange-line)_0_3px,var(--color-orange-wash)_3px_6px)]';

const sideTones: Record<SeatSide, string> = {
  creator: '[--tone:var(--color-red)] [--tone-edge:var(--color-red-deep)]',
  opponent: '[--tone:var(--color-blue)] [--tone-edge:var(--color-blue-deep)]',
};

interface ChargeCellsProps {
  /** What the wallet holds, in USDT's smallest unit. */
  haveRaw: bigint;
  /** The stake. */
  needRaw: bigint;
  /** Whose colour the cells charge in. */
  side: SeatSide;
  /** The balance before money landed: the cells it newly covers charge one after another. */
  fromRaw?: bigint;
  className?: string;
}

/**
 * A stake as ten cells against the wallet: lit in the seat's colour for what the wallet covers,
 * hatched orange for what it lacks. Money that lands charges the new cells one after another, and a
 * bar that fills up glints once.
 */
export function ChargeCells({ haveRaw, needRaw, side, fromRaw, className }: ChargeCellsProps) {
  const { cells, isFull, charging } = chargeCells(haveRaw, needRaw, fromRaw);

  return (
    <span aria-hidden="true" className={cn('relative grid h-3.5 grid-cols-10 gap-1', sideTones[side], className)}>
      {cells.map((cell, index) => (
        <i
          key={index}
          className={cn(
            'relative overflow-hidden rounded-[4px]',
            cell.fill < 1 && cn(HATCH, 'shadow-[inset_0_0_0_1px_var(--color-orange-line)]'),
            cell.isNew && cell.fill >= 1 && HATCH
          )}
        >
          {cell.fill > 0 && (
            <i
              style={{ '--part': cell.fill, '--i': cell.order }}
              className={cn(
                'absolute inset-y-0 left-0 w-[calc(var(--part)*100%)] bg-(--tone)',
                cell.fill >= 1 && 'rounded-[inherit] shadow-[inset_0_-2px_0_var(--tone-edge)]',
                cell.isNew && 'animate-cell-charge [animation-delay:calc(var(--i)*60ms+120ms)]'
              )}
            />
          )}
        </i>
      ))}
      {isFull && charging > 0 && (
        <span
          style={{ '--n': charging }}
          className="pointer-events-none absolute -inset-[3px] overflow-hidden rounded-[7px]"
        >
          <span className="absolute inset-y-0 left-0 w-2/5 animate-cells-glint bg-linear-100 from-transparent via-paper to-transparent opacity-75 [animation-delay:calc(var(--n)*60ms+320ms)]" />
        </span>
      )}
    </span>
  );
}
