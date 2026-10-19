import Link from 'next/link';
import { BrandMark } from '@/components/identity/BrandMark';
import { SITE_NAME } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface BrandLinkProps {
  className?: string;
}

/** The mark and the name, taking you home: the top bar's start and the footer's. */
export function BrandLink({ className }: BrandLinkProps) {
  return (
    <Link
      href="/"
      className={cn('inline-flex min-h-11 items-center gap-2.5 text-xl font-extrabold tracking-[-0.03em] text-ink', className)}
    >
      <BrandMark />
      {SITE_NAME}
    </Link>
  );
}
