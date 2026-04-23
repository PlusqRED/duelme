import { actionFlowClaimsTranslations } from './translations/actionFlowClaims';
import { actionFlowResultsTranslations } from './translations/actionFlowResults';
import { createDuelTranslations } from './translations/createDuel';
import { dashboardWalletTranslations } from './translations/dashboardWallet';
import { duelTranslations } from './translations/duel';
import { joinDuelFlowTranslations } from './translations/joinDuelFlow';
import { landingTranslations } from './translations/landing';
import { navigationTranslations } from './translations/navigation';
import { profileGamesTranslations } from './translations/profileGames';
import { socialLinksTranslations } from './translations/socialLinks';

export const translations = {
  en: {
    ...navigationTranslations.en,
    ...landingTranslations.en,
    ...createDuelTranslations.en,
    ...joinDuelFlowTranslations.en,
    ...actionFlowResultsTranslations.en,
    ...actionFlowClaimsTranslations.en,
    ...duelTranslations.en,
    ...dashboardWalletTranslations.en,
    ...profileGamesTranslations.en,
    ...socialLinksTranslations.en,
  },
  ru: {
    ...navigationTranslations.ru,
    ...landingTranslations.ru,
    ...createDuelTranslations.ru,
    ...joinDuelFlowTranslations.ru,
    ...actionFlowResultsTranslations.ru,
    ...actionFlowClaimsTranslations.ru,
    ...duelTranslations.ru,
    ...dashboardWalletTranslations.ru,
    ...profileGamesTranslations.ru,
    ...socialLinksTranslations.ru,
  },
} as const;

export type Language = keyof typeof translations;
export type TranslationKey = keyof typeof translations.en;
export type TranslationParams = Record<string, string | number | bigint>;
