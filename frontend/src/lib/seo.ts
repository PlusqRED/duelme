import { SITE_NAME, SITE_URL } from './constants';

export const SEO_KEYWORDS: readonly string[] = [
  // EN — core product
  '1v1 USDT duel',
  '1v1 crypto duel',
  'crypto duel',
  'usdt duel',
  'pvp crypto',
  'pvp usdt',
  'p2p crypto wager',
  'p2p betting',
  'on-chain duel',
  'on-chain pvp',
  'crypto matchmaking',
  'crypto wager 1v1',
  'play for usdt',
  'play for crypto',
  'wager 1v1',
  'head to head crypto',
  'winner takes all crypto',
  'crypto skill betting',
  'no rake duel',
  'no kyc duel',
  '0% fee crypto gaming',
  'smart contract escrow gaming',
  'decentralized duel',
  'blockchain duel platform',
  'arbitrum gaming',
  'arbitrum duel',
  'defi gaming',
  'gamefi 1v1',
  'web3 pvp',
  'web3 duel',
  'crypto winner takes all',
  'peer-to-peer wager',
  'p2p wager link',
  // EN — game-specific
  'cs2 wager',
  'chess wager crypto',
  'fifa wager',
  'fortnite wager',
  'dota 2 wager',
  'valorant wager',
  'apex wager',
  'rocket league wager',
  'tekken wager',
  'mortal kombat wager',
  // RU — основные
  'дуэль на usdt',
  'дуэль за крипту',
  'дуэль на крипто',
  'дуэль на деньги',
  'пвп на usdt',
  'пвп за крипту',
  'пвп на деньги',
  'пвп 1 на 1 за крипту',
  '1v1 за крипту',
  '1v1 за деньги',
  '1 на 1 за крипту',
  'ставки 1 на 1',
  'ставки между игроками',
  'p2p ставки крипта',
  'p2p дуэль',
  'играть за крипту',
  'играть на деньги',
  'играть на usdt',
  'играть в дуэль',
  'поединок за usdt',
  'поединок на крипту',
  'on-chain пвп',
  'дуэль смарт-контракт',
  'крипто ставки 1 на 1',
  'ставки крипта',
  'ставки usdt',
  'без комиссии крипто',
  '0% комиссии pvp',
  'без рейка крипто',
  // RU — игры
  'играть в шахматы за деньги онлайн',
  'играть в кс за деньги',
  'играть в dota 2 за деньги',
  'играть в фифа за деньги',
  'играть в фортнайт за деньги',
  'играть в валорант за деньги',
  'арбитрум игры',
  'web3 пвп',
  'ставки в киберспорт крипта',
  'скилл за крипту',
  'заработать на pvp',
  'инвайт на дуэль',
  'ссылка на дуэль крипто',
  'без kyc дуэль',
  'эскроу за крипту',
];

export const SEO_TITLE_EN = `${SITE_NAME} — 1v1 USDT Duels • 0% Fee • On-Chain PvP`;
export const SEO_TITLE_TEMPLATE = `%s | ${SITE_NAME}`;

// Google truncates meta descriptions around 155–160 chars in SERP. Kept under
// that budget so the value prop ("0% fee, no KYC, on-chain") isn't cut off.
export const SEO_DESCRIPTION_EN =
  'Stake USDT in 1v1 crypto duels and win the full pot. Smart-contract escrow on Arbitrum — 0% platform fee, no KYC, no admin override.';

// Absolute URL of the OG image rendered by `app/opengraph-image.tsx` (Next.js
// File Convention). Used by JSON-LD references that need an absolute URL.
// Metadata API gets the image auto-injected from the convention file and does
// NOT use this constant.
export const SEO_OG_IMAGE = `${SITE_URL}/opengraph-image`;

// Add real profile URLs when they exist; Organization schema reads `sameAs`
// only when this array is non-empty.
export const SOCIAL_PROFILE_URLS: readonly string[] = [];
