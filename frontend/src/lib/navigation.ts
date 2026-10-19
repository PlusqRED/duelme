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

/** Whether the page at `pathname` belongs to the section at `href`: its own page or one under it. */
export function isInSection(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
