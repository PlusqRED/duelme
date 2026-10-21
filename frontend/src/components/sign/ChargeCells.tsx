import { chargeCells } from '@/lib/chargeCells';
import { cn } from '@/lib/utils';

interface ChargeCellsProps {
  /** What the wallet holds and what the stake takes, in USDT's smallest unit. */
  haveRaw: bigint;
  needRaw: bigint;
  /** The balance before money landed: the cells it newly covers charge one after another. */
  fromRaw?: bigint;
  className?: string;
}

const LIT = 'bg-good shadow-[inset_0_-2px_0_var(--color-good-ink)]';

const PART =
  'bg-[linear-gradient(90deg,var(--color-good)_calc(var(--part)*100%),transparent_0),repeating-linear-gradient(-45deg,var(--color-orange-line)_0_3px,var(--color-orange-wash)_3px_6px)]';

const SHORT = 'bg-[repeating-linear-gradient(-45deg,var(--color-orange-line)_0_3px,var(--color-orange-wash)_3px_6px)]';

/**
 * A stake as ten cells: lit green for what the wallet covers, hatched orange for what it is short.
 * They answer whether the wallet has enough, so they never take the seat's colour: a full bar of the
 * creator's red read as a warning beside "Enough". Money that just landed charges the newly covered
 * cells in turn, and a bar that fills up glints once. The words beside it say the same, so the cells
 * are hidden from screen readers.
 */
export function ChargeCells({ haveRaw, needRaw, fromRaw, className }: ChargeCellsProps) {
  const { cells, isFull, freshCount } = chargeCells(haveRaw, needRaw, fromRaw);

  return (
    <span aria-hidden="true" className={cn('relative grid h-3.5 grid-cols-10 gap-1', className)}>
      {cells.map((cell, index) => (
        <i
          key={index}
          data-fill={cell.fill >= 1 ? 'lit' : cell.fill > 0 ? 'part' : 'short'}
          className={cn(
            'rounded-[4px]',
            cell.fill >= 1 ? LIT : cell.fill > 0 ? PART : SHORT,
            cell.fill < 1 && 'shadow-[inset_0_0_0_1px_var(--color-orange-line)]',
            cell.fresh !== null && 'animate-cell-charge'
          )}
          style={{
            '--part': cell.fill,
            animationDelay: cell.fresh === null ? undefined : `${cell.fresh * 60 + 120}ms`,
          }}
        />
      ))}
      {freshCount > 0 && isFull && (
        <span className="pointer-events-none absolute -inset-[3px] overflow-hidden rounded-[7px]">
          <span
            className="absolute inset-y-0 left-0 w-2/5 animate-glint bg-linear-to-r from-paper/0 via-paper/75 to-paper/0"
            style={{ animationDelay: `${freshCount * 60 + 320}ms` }}
          />
        </span>
      )}
    </span>
  );
}
