import type { ReactNode } from 'react';
import { Icon } from '@/components/ui/icon';
import type { IconName } from '@/components/ui/iconPaths';
import { cn } from '@/lib/utils';

/** How a note reads: an aside, a plain fact, a promise kept, or what stops you. */
const TONES = {
  quiet: { line: 'text-ink-2', icon: 'text-ink-3' },
  plain: { line: 'text-ink-2', icon: 'text-ink-2' },
  good: { line: 'text-ink-2', icon: 'stroke-[2.6] text-good-ink' },
  bad: { line: 'font-label text-orange-ink', icon: 'text-orange-ink' },
} as const;

interface NoteProps {
  icon: IconName;
  tone?: keyof typeof TONES;
  children: ReactNode;
}

/** A line of small print after an icon: who pays a fee, what to check, what stops you. */
export function Note({ icon, tone = 'quiet', children }: NoteProps) {
  return (
    <p className={cn('flex items-start gap-[7px] text-sm/[1.4] text-pretty', TONES[tone].line)}>
      <Icon name={icon} className={cn('mt-0.5 size-4', TONES[tone].icon)} />
      {children}
    </p>
  );
}
