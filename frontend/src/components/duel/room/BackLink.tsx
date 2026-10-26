import { Icon } from '@/components/ui/icon';
import { LocaleLink } from '@/components/ui/LocaleLink';

/** The way back from a duel: to the reader's duels, or to the public ones. */
export function BackLink({ href, children }: { href: string; children: string }) {
  return (
    <LocaleLink
      href={href}
      className="group mb-1.5 inline-flex min-h-11 items-center gap-2 font-label text-ink-2 transition-colors hover:text-ink"
    >
      <Icon name="arrow-left" className="size-[18px] transition-[translate] duration-200 ease-press group-hover:-translate-x-[3px]" />
      {children}
    </LocaleLink>
  );
}
