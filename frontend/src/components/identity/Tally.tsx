import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';

interface TallyProps {
  icon: 'check' | 'x';
  ink: string;
  label: string;
  count: number;
}

/** One side of a player's record: honored duels with a check, abandoned ones with a cross. */
export function Tally({ icon, ink, label, count }: TallyProps) {
  return (
    <span className="inline-flex items-center gap-[5px]">
      <Icon name={icon} className={cn('size-[15px] stroke-[2.8]', ink)} />
      {label} <b className="font-extrabold text-ink tabular-nums">{count}</b>
    </span>
  );
}
