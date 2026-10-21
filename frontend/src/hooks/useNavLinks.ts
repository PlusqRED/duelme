'use client';

import { usePathname } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { useHeadedSection } from '@/hooks/useHeadedSection';
import { useSectionInView } from '@/hooks/useSectionInView';
import { useTranslation } from '@/i18n/useTranslation';
import { LANDING_SECTIONS, NAV_LINKS, isInSection, type NavLink } from '@/lib/navigation';

const LANDING_IDS = LANDING_SECTIONS.map((link) => link.section);
const NO_SECTIONS: readonly string[] = [];

export interface NavItem {
  href: string;
  label: string;
  /** Marks the page you are on, or on the landing the section you are reading. */
  current: 'page' | 'location' | undefined;
  /** A landing section's link: following it marks the section at once, not those passed on the way. */
  onFollow?: () => void;
}

/**
 * The links the top bar lists for this player. On the landing they are its sections, the one being
 * read marked as you scroll; elsewhere the app's pages, the one you are in marked. My duels follows
 * for a signed-in player either way.
 */
export function useNavLinks(): NavItem[] {
  const pathname = usePathname();
  const { authenticated } = usePrivy();
  const { t } = useTranslation();
  const isLanding = pathname === '/';
  const inView = useSectionInView(isLanding ? LANDING_IDS : NO_SECTIONS);
  const { headed, headTo } = useHeadedSection();
  const reading = headed ?? inView;
  const pages = NAV_LINKS.filter((link) => authenticated || !link.signedInOnly);
  const pageItem = (link: NavLink): NavItem => ({
    href: link.href,
    label: t(link.labelKey),
    current: isInSection(pathname, link.href) ? 'page' : undefined,
  });

  if (!isLanding) {
    return pages.map(pageItem);
  }
  return [
    ...LANDING_SECTIONS.map(
      (link): NavItem => ({
        href: `#${link.section}`,
        label: t(link.labelKey),
        current: link.section === reading ? 'location' : undefined,
        onFollow: () => headTo(link.section),
      })
    ),
    ...pages.filter((link) => link.signedInOnly).map(pageItem),
  ];
}
