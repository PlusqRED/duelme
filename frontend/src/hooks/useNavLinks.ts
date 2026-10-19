'use client';

import { usePathname } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { useTranslation } from '@/i18n/useTranslation';
import { NAV_LINKS, isInSection } from '@/lib/navigation';

/** The sections the top bar lists for this player, each marked when the page is in it. */
export function useNavLinks() {
  const pathname = usePathname();
  const { authenticated } = usePrivy();
  const { t } = useTranslation();

  return NAV_LINKS.filter((link) => authenticated || !link.signedInOnly).map((link) => ({
    href: link.href,
    label: t(link.labelKey),
    isCurrent: isInSection(pathname, link.href),
  }));
}
