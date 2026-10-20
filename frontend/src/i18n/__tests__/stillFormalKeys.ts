import type { TranslationKey } from '@/i18n/translations';

/**
 * Russian strings that still address the player as «вы». The redesign says «ты» everywhere; each
 * screen's port rewrites its own strings and takes their keys off this list, which only shrinks.
 */
export const STILL_FORMAL_KEYS: readonly TranslationKey[] = [
  'duel.privateInviteMissing',
];
