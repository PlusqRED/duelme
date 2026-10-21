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

/** A player's public profile, at their address in lower case as the route reads it: one player, one page address. */
export function profilePath(address: string): string {
  return `/profile/${address.toLowerCase()}`;
}

/** A section of the landing, which its top bar lists in place of the app's pages. */
export interface SectionLink {
  /** The section's id on the page. */
  section: string;
  labelKey: TranslationKey;
}

/** The ids of the landing's sections the top bar links to: each section takes its id from here. */
export const LANDING_SECTION_IDS = {
  publicDuels: 'public-duels',
  recentDuels: 'recent-duels',
  demo: 'demo',
  safety: 'safety',
} as const;

/** The landing's sections, in the order the page has them. */
export const LANDING_SECTIONS: readonly SectionLink[] = [
  { section: LANDING_SECTION_IDS.publicDuels, labelKey: 'nav.publicDuels' },
  { section: LANDING_SECTION_IDS.recentDuels, labelKey: 'nav.recentDuels' },
  { section: LANDING_SECTION_IDS.demo, labelKey: 'nav.howItWorks' },
  { section: LANDING_SECTION_IDS.safety, labelKey: 'nav.safety' },
];

/** Whether the page at `pathname` belongs to the section at `href`: its own page or one under it. */
export function isInSection(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** A click that follows a link in this tab: not a middle click, nor one held for a new tab or window. */
export function isPlainClick(event: Pick<MouseEvent, 'button' | 'metaKey' | 'ctrlKey' | 'shiftKey' | 'altKey'>): boolean {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}
