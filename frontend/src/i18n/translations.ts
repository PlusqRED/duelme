import { actionFlowClaimsTranslations } from './translations/actionFlowClaims';
import { actionFlowResultsTranslations } from './translations/actionFlowResults';
import { createDuelTranslations } from './translations/createDuel';
import { dashboardWalletTranslations } from './translations/dashboardWallet';
import { demoDuelTranslations } from './translations/demoDuel';
import { duelTranslations } from './translations/duel';
import { duelRoomTranslations } from './translations/duelRoom';
import { homeTranslations } from './translations/home';
import { joinDuelFlowTranslations } from './translations/joinDuelFlow';
import { landingTranslations } from './translations/landing';
import { landingListsTranslations } from './translations/landingLists';
import { landingTrustTranslations } from './translations/landingTrust';
import { navigationTranslations } from './translations/navigation';
import { profileGamesTranslations } from './translations/profileGames';
import { socialLinksTranslations } from './translations/socialLinks';
import { topupTranslations } from './translations/topup';
import { uiTranslations } from './translations/ui';
import { walletTranslations } from './translations/wallet';
import { duelTurnTranslations } from './translations/duelTurn';
import { duelMovesTranslations } from './translations/duelMoves';
import { signingTranslations } from './translations/signing';

export const translations = {
  en: {
    ...navigationTranslations.en,
    ...homeTranslations.en,
    ...demoDuelTranslations.en,
    ...landingTranslations.en,
    ...landingListsTranslations.en,
    ...landingTrustTranslations.en,
    ...createDuelTranslations.en,
    ...joinDuelFlowTranslations.en,
    ...actionFlowResultsTranslations.en,
    ...actionFlowClaimsTranslations.en,
    ...duelTranslations.en,
    ...duelRoomTranslations.en,
    ...dashboardWalletTranslations.en,
    ...walletTranslations.en,
    ...topupTranslations.en,
    ...profileGamesTranslations.en,
    ...socialLinksTranslations.en,
    ...uiTranslations.en,
    ...duelTurnTranslations.en,
    ...duelMovesTranslations.en,
    ...signingTranslations.en,
  },
  ru: {
    ...navigationTranslations.ru,
    ...homeTranslations.ru,
    ...demoDuelTranslations.ru,
    ...landingTranslations.ru,
    ...landingListsTranslations.ru,
    ...landingTrustTranslations.ru,
    ...createDuelTranslations.ru,
    ...joinDuelFlowTranslations.ru,
    ...actionFlowResultsTranslations.ru,
    ...actionFlowClaimsTranslations.ru,
    ...duelTranslations.ru,
    ...duelRoomTranslations.ru,
    ...dashboardWalletTranslations.ru,
    ...walletTranslations.ru,
    ...topupTranslations.ru,
    ...profileGamesTranslations.ru,
    ...socialLinksTranslations.ru,
    ...uiTranslations.ru,
    ...duelTurnTranslations.ru,
    ...duelMovesTranslations.ru,
    ...signingTranslations.ru,
  },
} as const;

export type Language = keyof typeof translations;
export type TranslationKey = keyof typeof translations.en;
export type TranslationParams = Record<string, string | number | bigint>;

/**
 * The base of a set of plural keys — `plural()` appends the Intl.PluralRules category.
 * Derived from the keys themselves, so a base whose `.other` form is missing is a type
 * error rather than a word that silently renders as its own key at runtime.
 */
export type PluralKey = TranslationKey extends unknown
  ? Extract<TranslationKey, `${string}.other`> extends `${infer Base}.other`
    ? Base
    : never
  : never;
