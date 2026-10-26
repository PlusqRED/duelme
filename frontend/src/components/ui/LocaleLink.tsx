'use client';

import Link from 'next/link';
import type { ComponentProps } from 'react';
import { localePath } from '@/i18n/localePath';
import { useTranslation } from '@/i18n/useTranslation';

type LocaleLinkProps = Omit<ComponentProps<typeof Link>, 'href'> & {
  /** A page of the site as its route names it (`/games`), or a link that is not a page of it. */
  href: string;
};

/**
 * The site's one link: a page of the site in the page's own language, so a reader on `/ru` stays
 * on Russian addresses. `i18n/__tests__/localeLinks.test.ts` keeps `next/link` to this file.
 */
export function LocaleLink({ href, ...props }: LocaleLinkProps) {
  const { language } = useTranslation();
  return <Link href={localePath(href, language)} {...props} />;
}
