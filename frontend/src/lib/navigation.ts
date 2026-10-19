import type { TranslationKey } from '@/i18n/translations';

export interface NavLink {
  href: string;
  labelKey: TranslationKey;
  /** Only a signed-in player has this section. */
  signedInOnly: boolean;
}

/** The app's sections, in the order the top bar lists them. */
export const NAV_LINKS: readonly NavLink[] = [
  { href: '/duels/public', labelKey: 'nav.publicDuels', signedInOnly: false },
  { href: '/duels/recent', labelKey: 'nav.recentDuels', signedInOnly: false },
  { href: '/games', labelKey: 'nav.games', signedInOnly: false },
  { href: '/dashboard', labelKey: 'nav.dashboard', signedInOnly: true },
];

/** A section of the landing, which its top bar lists in place of the app's pages. */
export interface SectionLink {
  /** The section's id on the page. */
  section: string;
  labelKey: TranslationKey;
}

/** The landing's sections, in the order the page has them. */
export const LANDING_SECTIONS: readonly SectionLink[] = [
  { section: 'public-duels', labelKey: 'nav.publicDuels' },
  { section: 'recent-duels', labelKey: 'nav.recentDuels' },
  { section: 'demo', labelKey: 'nav.howItWorks' },
  { section: 'safety', labelKey: 'nav.safety' },
];

/** Whether the page at `pathname` belongs to the section at `href`: its own page or one under it. */
export function isInSection(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
