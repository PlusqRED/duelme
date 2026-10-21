import { cn } from '@/lib/utils';

interface BrandMarkProps {
  size?: 'md' | 'lg';
  className?: string;
}

/** The mark: the creator's red, the contract's navy square between them, the joiner's blue. */
export function BrandMark({ size = 'md', className }: BrandMarkProps) {
  const dot = size === 'lg' ? 'size-4' : 'size-2.5';

  return (
    <span aria-hidden="true" className={cn('inline-flex items-center', size === 'lg' ? 'gap-[5px]' : 'gap-[3px]', className)}>
      <span className={cn('rounded-full bg-red', dot)} />
      <span className={cn('bg-ink', size === 'lg' ? 'size-6 rounded-[7px]' : 'size-[15px] rounded-[4px]')} />
      <span className={cn('rounded-full bg-blue', dot)} />
    </span>
  );
}
