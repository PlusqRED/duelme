/**
 * Files the redesign has not reached yet, and the old colours they still paint with. Each screen's
 * port takes its files off these lists, which only shrink; the last port deletes them.
 */

/** Files still coloured from Tailwind's own palette (`bg-slate-50`, `text-white`) instead of the theme. */
export const STILL_ON_PALETTE: readonly string[] = [
  'app/duels/public/page.tsx',
  'app/duels/recent/page.tsx',
  'app/games/GamesClient.tsx',
  'app/games/[slug]/page.tsx',
  'app/profile/[walletAddress]/page.tsx',
  'app/profile/page.tsx',
  'components/duel/CopyableAddress.tsx',
  'components/duel/DuelCard.tsx',
  'components/duel/GuidedTransactionDialog.tsx',
  'components/duel/GuidedTransactionStepIndicator.tsx',
  'components/duel/PublicDuelCard.tsx',
  'components/duel/PublicDuelsFiltersPanel.tsx',
  'components/duel/recent/RecentDuelCard.tsx',
  'components/duel/recent/RecentDuelsFilters.tsx',
  'components/duel/recent/RecentDuelsGrid.tsx',
  'components/duel/recent/StateFilterChips.tsx',
  'components/game/GameBadge.tsx',
  'components/game/GameCard.tsx',
  'components/profile/InstagramHandleDialog.tsx',
  'components/profile/ProfileAvatar.tsx',
  'components/profile/SocialLinkCard.tsx',
  'components/profile/SocialLinkPill.tsx',
  'components/profile/SocialLinksSection.tsx',
  'lib/duelStateColors.ts',
];

/** Files still holding colour values (`#eef2ff`, `rgba(…)`) outside the theme. */
export const STILL_RAW_COLOURS: readonly string[] = [
  'components/duel/GuidedTransactionStepIndicator.tsx',
  'styles/legacy.css',
];
