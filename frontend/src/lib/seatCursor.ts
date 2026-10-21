import { brandColors } from '@/lib/brandColors';

// A no-entry sign in the creator's red: the open seat of their own duel is the one seat they can't
// take. Ringed in paper so it reads over any colour; a cursor image cannot read the theme's variables.
const NO_ENTRY =
  `<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28'>` +
  `<circle cx='14' cy='14' r='12' fill='${brandColors.red}' stroke='${brandColors.paper}' stroke-width='2'/>` +
  `<rect x='7.5' y='12' width='13' height='4' rx='1' fill='${brandColors.paper}'/></svg>`;

/** The pointer over the open seat of a duel the reader created, centred on its point; not-allowed where a browser takes no image. */
export const OWN_SEAT_CURSOR = `url("data:image/svg+xml,${encodeURIComponent(NO_ENTRY)}") 14 14, not-allowed`;
